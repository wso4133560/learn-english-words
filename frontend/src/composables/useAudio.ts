import { ref } from 'vue'
import { useGradioClient } from './useGradioClient'

type AudioPayload = string | { url?: string; path?: string } | null | undefined

export function useAudio() {
  const { predict, gradioUrl } = useGradioClient()

  const isPlaying = ref(false)
  const error = ref<string | null>(null)
  const currentAudio = ref<HTMLAudioElement | null>(null)

  const stopCurrentAudio = () => {
    if (!currentAudio.value) return
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
    currentAudio.value = null
  }

  const buildFileUrlCandidates = (path: string): string[] => {
    const encodedPath = encodeURIComponent(path)
    const trimmedBase = gradioUrl.replace(/\/$/, '')
    return [
      `${trimmedBase}/gradio_api/file=${encodedPath}`,
      `${trimmedBase}/file=${encodedPath}`
    ]
  }

  const resolveAudioCandidates = (payload: AudioPayload): string[] => {
    if (!payload) return []

    if (typeof payload === 'string') {
      if (/^https?:\/\//i.test(payload)) {
        return [payload]
      }
      return buildFileUrlCandidates(payload)
    }

    if (typeof payload.url === 'string' && payload.url.length > 0) {
      return [payload.url]
    }

    if (typeof payload.path === 'string' && payload.path.length > 0) {
      if (/^https?:\/\//i.test(payload.path)) {
        return [payload.path]
      }
      return buildFileUrlCandidates(payload.path)
    }

    return []
  }

  const tryPlay = async (src: string): Promise<boolean> => {
    const audio = new Audio(src)
    audio.onended = () => {
      isPlaying.value = false
      currentAudio.value = null
    }
    audio.onerror = () => {
      if (currentAudio.value === audio) {
        isPlaying.value = false
        currentAudio.value = null
      }
    }

    try {
      await audio.play()
      currentAudio.value = audio
      return true
    } catch {
      return false
    }
  }

  const playPronunciation = async () => {
    if (isPlaying.value) return

    try {
      error.value = null
      isPlaying.value = true

      const result = await predict('/play_pronunciation')
      const payload = Array.isArray(result) ? result[0] : (result as AudioPayload)
      const candidates = resolveAudioCandidates(payload)

      if (!candidates.length) {
        error.value = '未获取到音频数据'
        isPlaying.value = false
        return
      }

      stopCurrentAudio()

      for (const src of candidates) {
        const played = await tryPlay(src)
        if (played) {
          return
        }
      }

      error.value = '音频播放失败'
      isPlaying.value = false
    } catch (e) {
      error.value = e instanceof Error ? e.message : '播放失败'
      isPlaying.value = false
    }
  }

  const reset = () => {
    stopCurrentAudio()
    isPlaying.value = false
    error.value = null
  }

  return {
    isPlaying,
    error,
    playPronunciation,
    reset
  }
}
