import { ref } from 'vue'

export type TtsEngineStatus = 'idle' | 'loading' | 'kokoro' | 'browser' | 'unsupported' | 'error'

export type KokoroRuntime = {
  speak: (text: string, options?: { voice?: string; speed?: number }) => Promise<unknown> | unknown
}

type KokoroModel = {
  generate: (text: string, options?: { voice?: string; speed?: number }) => Promise<unknown>
}

declare global {
  interface Window {
    kokoroTTS?: KokoroRuntime
  }
}

const status = ref<TtsEngineStatus>('idle')
const error = ref<string | null>(null)
let activeAudio: HTMLAudioElement | null = null
let runtimePromise: Promise<KokoroRuntime | undefined> | null = null
let activeController: AbortController | null = null
const audioCache = new Map<string, Blob>()
const pendingGenerations = new Map<string, Promise<unknown>>()
const AUDIO_CACHE_MAX_BYTES = 1024 * 1024 * 1024
const AUDIO_CACHE_DB = 'word-plus-audio-cache-v1'
const AUDIO_CACHE_STORE = 'audio'
const modelCacheVersion = () => import.meta.env.VITE_KOKORO_MODEL_ID?.trim() || 'onnx-community/Kokoro-82M-v1.0-ONNX'

let audioDbPromise: Promise<IDBDatabase | undefined> | null = null
let audioCacheBytes = 0

const rememberAudio = (key: string, blob: Blob) => {
  const previous = audioCache.get(key)
  if (previous) audioCacheBytes -= previous.size
  audioCache.set(key, blob)
  audioCacheBytes += blob.size
  while (audioCacheBytes > AUDIO_CACHE_MAX_BYTES && audioCache.size > 1) {
    const oldest = audioCache.keys().next().value as string
    const removed = audioCache.get(oldest)
    if (removed) audioCacheBytes -= removed.size
    audioCache.delete(oldest)
  }
}
const openAudioDb = (): Promise<IDBDatabase | undefined> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(undefined)
  if (!audioDbPromise) {
    audioDbPromise = new Promise((resolve) => {
      const request = indexedDB.open(AUDIO_CACHE_DB, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(AUDIO_CACHE_STORE)) {
          const store = db.createObjectStore(AUDIO_CACHE_STORE, { keyPath: 'key' })
          store.createIndex('lastUsed', 'lastUsed')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(undefined)
      request.onblocked = () => resolve(undefined)
    })
  }
  return audioDbPromise
}

const persistentAudioGet = async (key: string): Promise<Blob | undefined> => {
  try {
    const db = await openAudioDb()
    if (!db) return undefined
    return await new Promise((resolve) => {
      const tx = db.transaction(AUDIO_CACHE_STORE, 'readwrite')
      const request = tx.objectStore(AUDIO_CACHE_STORE).get(key)
      request.onsuccess = () => {
        const entry = request.result as { blob?: unknown } | undefined
        const blob = entry?.blob instanceof Blob ? entry.blob : undefined
        if (blob) tx.objectStore(AUDIO_CACHE_STORE).put({ key, blob, lastUsed: Date.now() })
        resolve(blob)
      }
      request.onerror = () => resolve(undefined)
      tx.onerror = () => resolve(undefined)
    })
  } catch { return undefined }
}

const persistentAudioPut = async (key: string, blob: Blob): Promise<void> => {
  try {
    const db = await openAudioDb()
    if (!db) return
    await new Promise<void>((resolve) => {
      const tx = db.transaction(AUDIO_CACHE_STORE, 'readwrite')
      const store = tx.objectStore(AUDIO_CACHE_STORE)
      store.put({ key, blob, lastUsed: Date.now() })
      const request = store.getAll()
      request.onsuccess = () => {
        const entries = (request.result as Array<{ key: string; blob?: unknown; lastUsed?: number }>)
          .filter((entry) => entry.blob instanceof Blob)
          .sort((a, b) => (a.lastUsed ?? 0) - (b.lastUsed ?? 0))
        let total = entries.reduce((sum, entry) => sum + (entry.blob as Blob).size, 0)
        for (const entry of entries) {
          if (total <= AUDIO_CACHE_MAX_BYTES || entries.length === 1) break
          total -= (entry.blob as Blob).size
          store.delete(entry.key)
        }
      }
      request.onerror = () => resolve()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch { /* Persistent caching is an optimization; playback must continue. */ }
}

const abortable = <T>(operation: Promise<T>, signal: AbortSignal): Promise<T> => new Promise((resolve, reject) => {
  const abort = () => reject(new DOMException('播放已取消', 'AbortError'))
  if (signal.aborted) { abort(); return }
  signal.addEventListener('abort', abort, { once: true })
  operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
})

/**
 * Win WebView、Android WebView 或浏览器 runtime 可以通过这个入口注册本地引擎。
 * 注册后，学习流程不需要知道模型运行在哪个平台。
 */
export const registerKokoroRuntime = (runtime: KokoroRuntime) => {
  if (typeof window !== 'undefined') window.kokoroTTS = runtime
  runtimePromise = Promise.resolve(runtime)
  audioCache.clear()
  audioCacheBytes = 0
  pendingGenerations.clear()
}

const resolveRuntime = async (): Promise<KokoroRuntime | undefined> => {
  if (typeof window === 'undefined') return undefined
  if (window.kokoroTTS) return window.kokoroTTS

  const moduleUrl = import.meta.env.VITE_KOKORO_RUNTIME_URL?.trim()

  if (!runtimePromise) {
    runtimePromise = (moduleUrl
      ? import(/* @vite-ignore */ moduleUrl).then(async (module) => {
        const candidate = module.default ?? module.kokoroTTS ?? module
        const runtime = typeof candidate?.create === 'function' ? await candidate.create() : candidate
        return runtime && typeof runtime.speak === 'function' ? runtime as KokoroRuntime : undefined
      })
      : import('kokoro-js').then(async ({ KokoroTTS }) => {
        const modelId = import.meta.env.VITE_KOKORO_MODEL_ID?.trim() || 'onnx-community/Kokoro-82M-v1.0-ONNX'
        let model: KokoroModel
        try {
          if (!('gpu' in navigator)) throw new Error('WebGPU unavailable')
          model = await KokoroTTS.from_pretrained(modelId, { device: 'webgpu', dtype: 'fp32' }) as unknown as KokoroModel
        } catch {
          model = await KokoroTTS.from_pretrained(modelId, { device: 'wasm', dtype: 'q8' }) as unknown as KokoroModel
        }
        return { speak: (text: string, options?: { voice?: string; speed?: number }) => model.generate(text, options) }
      }))
      .catch(() => undefined)
  }

  const runtime = await runtimePromise
  if (runtime) window.kokoroTTS = runtime
  return runtime
}

const stop = () => {
  activeController?.abort()
  activeController = null
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.currentTime = 0
    activeAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

const audioBlobFromResult = (result: unknown): Blob | undefined => {
  if (result instanceof Blob) return result
  if (result instanceof ArrayBuffer) return new Blob([result], { type: 'audio/wav' })

  if (result && typeof result === 'object' && 'audio' in result) {
    const audioData = (result as { audio?: unknown }).audio
    const sampleRate = Number((result as { sampling_rate?: unknown }).sampling_rate) || 24000
    if (audioData instanceof Float32Array) {
      const view = new DataView(new ArrayBuffer(44 + audioData.length * 2))
      const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))
      write(0, 'RIFF'); view.setUint32(4, 36 + audioData.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ')
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, audioData.length * 2, true)
      audioData.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true))
      return new Blob([view.buffer], { type: 'audio/wav' })
    }
  }
  return undefined
}

const playGeneratedAudio = async (result: unknown, signal: AbortSignal) => {
  if (typeof HTMLAudioElement !== 'undefined' && result instanceof HTMLAudioElement) {
    const audio = result
    activeAudio = audio
    await playAudio(audio, signal)
    return
  }

  const blob = audioBlobFromResult(result)
  if (blob) {
    const url = URL.createObjectURL(blob)
    try {
      const audio = new Audio(url)
      activeAudio = audio
      await playAudio(audio, signal)
    } finally {
      URL.revokeObjectURL(url)
    }
    return
  }

  if (typeof result === 'string') {
    const audio = new Audio(result)
    activeAudio = audio
    await playAudio(audio, signal)
    return
  }
  throw new Error('语音引擎没有返回可播放的音频')
}

const cacheKey = (phrase: string, voice: string, speed: number) => JSON.stringify([modelCacheVersion(), phrase, voice, speed])

const generateOrReuse = async (runtime: KokoroRuntime, phrase: string, voice: string, speed: number): Promise<unknown> => {
  const key = cacheKey(phrase, voice, speed)
  const cached = audioCache.get(key)
  if (cached) return cached
  const pending = pendingGenerations.get(key)
  if (pending) return pending

  const generation = (async () => {
    const persisted = await persistentAudioGet(key)
    if (persisted) {
      rememberAudio(key, persisted)
      return persisted
    }
    const result = await runtime.speak(phrase, { voice, speed })
    const generated = audioBlobFromResult(result)
    if (generated) {
      rememberAudio(key, generated)
      void persistentAudioPut(key, generated)
    }
    return result
  })().finally(() => pendingGenerations.delete(key))
  pendingGenerations.set(key, generation)
  return generation
}

/** Generate one phrase ahead without playing it. The same pending result is shared with speak(). */
export const preloadPronunciation = async (text: string): Promise<boolean> => {
  const phrase = text.trim()
  if (!phrase) return false
  try {
    const runtime = await resolveRuntime()
    if (!runtime) return false
    const result = await generateOrReuse(runtime, phrase, 'af_bella', 1)
    return Boolean(audioBlobFromResult(result))
  } catch {
    return false
  }
}

/** Start model loading once when the client opens, before the first pronunciation. */
export const warmupKokoro = async (): Promise<boolean> => {
  const runtime = await resolveRuntime()
  if (runtime) status.value = 'kokoro'
  return Boolean(runtime)
}

const playAudio = async (audio: HTMLAudioElement, signal: AbortSignal) => {
  // Register completion before starting, and settle the promise when paused/stopped.
  try {
    await abortable(new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('音频播放失败'))
      void audio.play().catch(reject)
    }), signal)
  } finally {
    audio.pause()
    audio.onended = null
    audio.onerror = null
  }
}

const speakWithBrowser = (text: string): Promise<void> => new Promise((resolve, reject) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    reject(new Error('当前设备不支持语音合成'))
    return
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.86
  utterance.pitch = 1
  utterance.onend = () => resolve()
  utterance.onerror = (event) => reject(new Error(event.error || '系统语音播放失败'))
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
})

export function useKokoroFrontend() {
  const speak = async (text: string) => {
    const phrase = text.trim()
    if (!phrase) return

    stop()
    const controller = new AbortController()
    activeController = controller
    error.value = null
    status.value = 'loading'

    try {
      const runtime = await abortable(resolveRuntime(), controller.signal)
      if (runtime) {
        const voice = 'af_bella'
        const speed = 1
        const result = await abortable(generateOrReuse(runtime, phrase, voice, speed), controller.signal)
        status.value = 'kokoro'
        await playGeneratedAudio(result, controller.signal)
      } else {
        status.value = 'browser'
        await abortable(speakWithBrowser(phrase), controller.signal)
      }
    } catch (cause) {
      if (controller.signal.aborted) return
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : '语音播放失败'
      throw cause
    } finally {
      if (activeController === controller) { activeAudio = null; activeController = null }
      if (status.value === 'loading') status.value = 'idle'
    }
  }

  return {
    status,
    error,
    speak,
    stop,
    isKokoroAvailable: () => typeof window !== 'undefined' && Boolean(window.kokoroTTS)
  }
}
