export type DifficultyMode = 'gentle' | 'steady' | 'challenge'

export interface StudyPlan {
  mode: DifficultyMode
  dailyTarget: number
  batchSize: number
  maxNewWords: number
  repeatCount: number
  revealAfterSeconds: number
  label: string
}

const PLANS: Record<DifficultyMode, StudyPlan> = {
  gentle: { mode: 'gentle', dailyTarget: 8, batchSize: 4, maxNewWords: 8, repeatCount: 3, revealAfterSeconds: 4, label: '轻松模式' },
  steady: { mode: 'steady', dailyTarget: 12, batchSize: 6, maxNewWords: 12, repeatCount: 2, revealAfterSeconds: 3, label: '稳步模式' },
  challenge: { mode: 'challenge', dailyTarget: 20, batchSize: 10, maxNewWords: 20, repeatCount: 1, revealAfterSeconds: 2, label: '挑战模式' }
}

export const getStudyPlan = (mode: DifficultyMode = 'gentle'): StudyPlan => ({ ...PLANS[mode] })

export const getRemainingTarget = (total: number, learned: number, plan = getStudyPlan()) => Math.max(0, Math.min(plan.dailyTarget, total - learned))
