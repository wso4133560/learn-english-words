import { ref, computed } from 'vue'
import type { WordWithAudio } from '@/types/word'
import { useGradioClient } from './useGradioClient'

type AudioPayload = string | { url?: string; path?: string } | null | undefined
type RawWordItem = { word?: unknown; meaning?: unknown } | null | undefined

export function useAutoPlay() {
  const { predict, gradioUrl } = useGradioClient()

  const words = ref<WordWithAudio[]>([])
  const currentIndex = ref(0)
  const currentPlayCount = ref(0)
  const isPaused = ref(false)
  const isLoading = ref(false)
  const isPlaying = ref(false)
  const error = ref<string | null>(null)
  const currentAudio = ref<HTMLAudioElement | null>(null)

  const isComplete = computed(() =>
    currentIndex.value >= words.value.length && words.value.length > 0
  )

  const progress = computed(() => {
    const completed = words.value.filter(w => w.status === 'completed').length
    const total = words.value.length
    return {
      total,
      learned: completed,
      remaining: total - completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  })

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

  const resolveWordList = (result: unknown): Array<{ word: string; meaning: string }> => {
    const payload = Array.isArray(result) ? result[0] : result
    if (!Array.isArray(payload)) {
      return []
    }

    return payload
      .map((item) => {
        const raw = item as RawWordItem
        const word = typeof raw?.word === 'string' ? raw.word.trim() : ''
        const meaning = typeof raw?.meaning === 'string' ? raw.meaning.trim() : ''
        return { word, meaning }
      })
      .filter((item) => item.word.length > 0 && item.meaning.length > 0)
  }

  const preloadWords = async (folder: string, file: string): Promise<void> => {
    isLoading.value = true
    error.value = null
    words.value = []

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('预加载超时（30秒）')), 30000)
    })

    try {
      await Promise.race([
        (async () => {
          const wordListResult = await predict('/load_word_list', folder, file)
          const rawWords = resolveWordList(wordListResult)

          if (rawWords.length === 0) {
            throw new Error('该文件没有单词')
          }

          const wordsList: WordWithAudio[] = []

          for (const rawWord of rawWords) {
            let audioUrl = ''

            try {
              const audioResult = await predict('/play_word_pronunciation', rawWord.word)
              const audioPayload = Array.isArray(audioResult) ? audioResult[0] : (audioResult as AudioPayload)
              const audioCandidates = resolveAudioCandidates(audioPayload)
              audioUrl = audioCandidates[0] || ''
            } catch {
              // Keep the word and mark playback failure later if audio cannot be preloaded.
              audioUrl = ''
            }

            wordsList.push({
              word: rawWord.word,
              meaning: rawWord.meaning,
              audioUrl,
              status: 'pending'
            })
          }

          if (wordsList.length === 0) {
            throw new Error('未获取到任何单词')
          }

          words.value = wordsList
        })(),
        timeoutPromise
      ])
    } catch (e) {
      error.value = e instanceof Error ? e.message : '预加载失败'
      words.value = []
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const reset = () => {
    words.value = []
    currentIndex.value = 0
    currentPlayCount.value = 0
    isPaused.value = false
    isLoading.value = false
    isPlaying.value = false
    error.value = null
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const playAudio = (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!audioUrl) {
        reject(new Error('音频 URL 为空'))
        return
      }

      const audio = new Audio(audioUrl)
      currentAudio.value = audio

      audio.onended = () => {
        currentAudio.value = null
        resolve()
      }

      audio.onerror = () => {
        currentAudio.value = null
        reject(new Error('音频播放失败'))
      }

      audio.play().catch(reject)
    })
  }

  const pause = () => {
    isPaused.value = true
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
  }

  const resume = () => {
    isPaused.value = false
  }

  const startAutoPlay = async () => {
    if (words.value.length === 0) {
      error.value = '没有可播放的单词'
      return
    }

    isPlaying.value = true
    isPaused.value = false
    currentIndex.value = 0

    try {
      for (let i = 0; i < words.value.length; i++) {
        if (!isPlaying.value) {
          break
        }

        currentIndex.value = i
        const word = words.value[i]

        if (!word) continue

        let playFailed = false

        for (let count = 0; count < 3; count++) {
          if (!isPlaying.value) {
            break
          }

          while (isPaused.value && isPlaying.value) {
            await sleep(100)
          }

          if (!isPlaying.value) {
            break
          }

          currentPlayCount.value = count + 1

          try {
            if (word.audioUrl) {
              await playAudio(word.audioUrl)
              await sleep(500)
            } else {
              throw new Error('无音频')
            }
          } catch {
            playFailed = true
            word.status = 'failed'
            break
          }
        }

        if (!isPlaying.value) {
          break
        }

        if (!playFailed) {
          word.status = 'completed'
        }

        if (i < words.value.length - 1) {
          const nextElement = document.querySelector(`[data-word-index="${i + 1}"]`)
          nextElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }

      if (isPlaying.value) {
        currentIndex.value = words.value.length
      }
    } finally {
      isPlaying.value = false
      currentPlayCount.value = 0
    }
  }

  const stop = () => {
    isPlaying.value = false
    isPaused.value = false
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
  }

  return {
    words,
    currentIndex,
    currentPlayCount,
    isPaused,
    isLoading,
    isPlaying,
    isComplete,
    error,
    progress,
    preloadWords,
    startAutoPlay,
    pause,
    resume,
    stop,
    reset
  }
}
