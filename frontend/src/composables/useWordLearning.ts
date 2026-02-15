import { ref, computed } from 'vue'
import type { Word, WordProgress, LearningSession } from '@/types/word'
import { useGradioClient } from './useGradioClient'

export type StartLearningState = 'learning' | 'completion' | 'error'

export interface StartLearningResult {
  success: boolean
  state: StartLearningState
  message?: string
}

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

  const extractTextValue = (value: unknown): string => {
    if (typeof value === 'string') {
      return value.trim()
    }

    if (
      value &&
      typeof value === 'object' &&
      'value' in value &&
      typeof (value as { value: unknown }).value === 'string'
    ) {
      return (value as { value: string }).value.trim()
    }

    return ''
  }

  const startLearning = async (folder: string, file: string) => {
    try {
      const result = await predict('/start_learning', folder, file)

      if (!Array.isArray(result)) {
        return {
          success: false,
          state: 'error' as const,
          message: '后端返回格式异常'
        }
      }

      const word = extractTextValue(result[3])
      const meaning = extractTextValue(result[4])
      const progressText = extractTextValue(result[5])
      const statusText = extractTextValue(result[7])

      if (word && meaning) {
        currentWord.value = {
          word,
          meaning
        }
        parseProgress(progressText)
        isFlipped.value = false
        return {
          success: true,
          state: 'learning' as const
        }
      }

      if (statusText) {
        const isCompletionStatus = /已学习:\s*\d+\s*\/\s*\d+\s*单词/.test(statusText)
        if (isCompletionStatus) {
          parseProgress(statusText)
          currentWord.value = null
          return {
            success: true,
            state: 'completion' as const,
            message: statusText
          }
        }

        return {
          success: false,
          state: 'error' as const,
          message: statusText
        }
      }

      return {
        success: false,
        state: 'error' as const,
        message: '未获取到单词数据'
      }
    } catch (e) {
      console.error('开始学习失败:', e)
      return {
        success: false,
        state: 'error' as const,
        message: e instanceof Error ? e.message : '开始学习失败'
      }
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

  const restartLearning = async (): Promise<boolean> => {
    try {
      const result = await predict('/reset_and_restart')
      if (!Array.isArray(result)) {
        return false
      }

      const word = extractTextValue(result[2])
      const meaning = extractTextValue(result[3])
      const progressText = extractTextValue(result[4])

      if (!word || !meaning) {
        return false
      }

      currentWord.value = {
        word,
        meaning
      }
      parseProgress(progressText)
      isFlipped.value = false
      return true
    } catch (e) {
      console.error('重新开始学习失败:', e)
      return false
    }
  }

  const parseProgress = (progressText: string | undefined) => {
    if (!progressText) return

    const progressMatch = progressText.match(/(\d+)\/(\d+)\s*\((\d+\.?\d*)%\)/)
    if (progressMatch && progressMatch[1] && progressMatch[2] && progressMatch[3]) {
      const learned = parseInt(progressMatch[1])
      const total = parseInt(progressMatch[2])
      progress.value = {
        total,
        learned,
        remaining: total - learned,
        percentage: parseFloat(progressMatch[3])
      }
      return
    }

    const completionMatch = progressText.match(/已学习:\s*(\d+)\s*\/\s*(\d+)\s*单词/)
    if (completionMatch && completionMatch[1] && completionMatch[2]) {
      const learned = parseInt(completionMatch[1])
      const total = parseInt(completionMatch[2])
      progress.value = {
        total,
        learned,
        remaining: Math.max(total - learned, 0),
        percentage: total > 0 ? Number(((learned / total) * 100).toFixed(1)) : 0
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
    restartLearning,
    markAsKnown,
    nextWord,
    flipCard,
    reset
  }
}
