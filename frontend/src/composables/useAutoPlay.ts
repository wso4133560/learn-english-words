import { ref, computed } from 'vue'
import type { WordWithAudio } from '@/types/word'
import { wordLibrary } from '@/services/localWordClient'
import { useKokoroFrontend } from '@/services/kokoroFrontend'


export function useAutoPlay() {
  const { speak, stop: stopSpeech } = useKokoroFrontend()

  const words = ref<WordWithAudio[]>([])
  const currentIndex = ref(0)
  const currentPlayCount = ref(0)
  const isPaused = ref(false)
  const isLoading = ref(false)
  const isPlaying = ref(false)
  const error = ref<string | null>(null)

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

  const preloadWords = async (folder: string, file: string): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      words.value = (await wordLibrary.loadWords(folder, file)).map((word) => ({ ...word, status: 'pending' }))
    } catch (cause) {
      words.value = []
      error.value = cause instanceof Error ? cause.message : '词库加载失败'
      throw cause
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
    stopSpeech()
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const pause = () => {
    isPaused.value = true
    stopSpeech()
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
            await speak(word.word)
            if (isPaused.value) { count--; continue }
            await sleep(400)
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
    stopSpeech()
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
