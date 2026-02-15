import { ref, computed } from 'vue'
import type { Word, WordProgress, LearningSession } from '@/types/word'
import { useGradioClient } from './useGradioClient'

export function useWordLearning() {
  const { predict } = useGradioClient()

  const currentWord = ref<Word | null>(null)
  const isFlipped = ref(false)
  const progress = ref<WordProgress>({
    total: 0,
    learned: 0,
    remaining: 0,
    percentage: 0
  })

  const isComplete = computed(() => progress.value.remaining === 0 && progress.value.total > 0)

  const session = computed<LearningSession>(() => ({
    currentWord: currentWord.value,
    progress: progress.value,
    isFlipped: isFlipped.value,
    isComplete: isComplete.value
  }))

  const startLearning = async (folder: string, file: string) => {
    try {
      const result = await predict('/start_learning', folder, file)

      // Backend returns:
      // [selection_area, learning_area, completion_area, word, meaning, progress, audio, status]
      if (result && result[3]) {
        currentWord.value = {
          word: result[3],
          meaning: result[4]
        }
        parseProgress(result[5])
      }

      return true
    } catch (e) {
      console.error('开始学习失败:', e)
      return false
    }
  }

  const markAsKnown = async () => {
    if (!currentWord.value) return false

    try {
      const result = await predict('/mark_as_known')

      if (result && result[2]) {
        parseProgress(result[2])
      }

      return true
    } catch (e) {
      console.error('标记失败:', e)
      return false
    }
  }

  const nextWord = async () => {
    try {
      const result = await predict('/next_word')

      if (result && result[2]) {
        currentWord.value = {
          word: result[2],
          meaning: result[3]
        }
        parseProgress(result[4])
        isFlipped.value = false
      } else {
        currentWord.value = null
      }

      return true
    } catch (e) {
      console.error('获取下一个单词失败:', e)
      return false
    }
  }

  const flipCard = () => {
    isFlipped.value = !isFlipped.value
  }

  const parseProgress = (progressText: string | undefined) => {
    if (!progressText) return

    const match = progressText.match(/(\d+)\/(\d+)\s*\((\d+\.?\d*)%\)/)
    if (match && match[1] && match[2] && match[3]) {
      const learned = parseInt(match[1])
      const total = parseInt(match[2])
      progress.value = {
        total,
        learned,
        remaining: total - learned,
        percentage: parseFloat(match[3])
      }
    }
  }

  const reset = () => {
    currentWord.value = null
    isFlipped.value = false
    progress.value = {
      total: 0,
      learned: 0,
      remaining: 0,
      percentage: 0
    }
  }

  return {
    currentWord,
    isFlipped,
    progress,
    isComplete,
    session,
    startLearning,
    markAsKnown,
    nextWord,
    flipCard,
    reset
  }
}
