export interface Word {
  word: string
  meaning: string
}

export interface WordProgress {
  total: number
  learned: number
  remaining: number
  percentage: number
}

export interface LearningSession {
  currentWord: Word | null
  progress: WordProgress
  isFlipped: boolean
  isComplete: boolean
}

export interface FileInfo {
  folder: string
  file: string
}

export interface WordWithAudio extends Word {
  audioUrl: string | null
  status?: 'pending' | 'completed' | 'failed'
}
