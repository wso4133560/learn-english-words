export interface GradioResponse<T = any> {
  data: T
  error?: string
}

export interface FolderListResponse {
  folders: string[]
}

export interface FileListResponse {
  files: string[]
}

export interface WordResponse {
  word: string
  meaning: string
  audio_path?: string
}

export interface ProgressResponse {
  total: number
  learned: number
  remaining: number
}

export interface MarkKnownResponse {
  success: boolean
  message?: string
}
