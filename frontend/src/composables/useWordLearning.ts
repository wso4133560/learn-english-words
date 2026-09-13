import { ref, computed } from 'vue'
import { LocalStudySession, type StudySnapshot } from '@/services/localWordClient'

const empty = (): StudySnapshot => ({ currentWord: null, progress: { total: 0, learned: 0, remaining: 0, percentage: 0 } })

export function useWordLearning() {
  let session = new LocalStudySession()
  const state = ref<StudySnapshot>(empty())
  const isFlipped = ref(false)
  const error = ref<string | null>(null)
  const currentWord = computed(() => state.value.currentWord)
  const progress = computed(() => state.value.progress)
  const isComplete = computed(() => progress.value.total > 0 && progress.value.remaining === 0)

  const startLearning = async (folder: string, file: string) => {
    try {
      error.value = null
      state.value = await session.start(folder, file)
      isFlipped.value = false
      return { success: true, state: isComplete.value ? 'completion' : 'learning' }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '词库加载失败'
      return { success: false, state: 'error', message: error.value }
    }
  }
  const markAsKnown = async () => {
    try { error.value = null; state.value = session.markKnown(); return true }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '进度保存失败'; return false }
  }
  const nextWord = () => { state.value = session.next(); isFlipped.value = false }
  const restartLearning = async () => {
    try { error.value = null; state.value = session.restart(); isFlipped.value = false; return !!state.value.currentWord }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '重新开始失败'; return false }
  }
  const reset = () => { session = new LocalStudySession(); state.value = empty(); isFlipped.value = false; error.value = null }
  return { currentWord, progress, isFlipped, isComplete, error, startLearning, markAsKnown, nextWord, restartLearning, reset, flipCard: () => { isFlipped.value = !isFlipped.value } }
}
