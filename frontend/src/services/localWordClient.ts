import type { Word, WordProgress } from '../types/word'

export interface StudyCard extends Word { id: string }
export interface StudySnapshot { currentWord: StudyCard | null; progress: WordProgress }
interface Catalog { folders: Record<string, { files: string[] }> }
export interface ProgressStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** All reads target resources embedded in the application, with no data server. */
export class LocalWordClient {
  private catalog: Promise<Catalog> | null = null
  private fetchAsset: typeof fetch

  constructor(fetchAsset: typeof fetch = (...args) => fetch(...args)) { this.fetchAsset = fetchAsset }

  private async readAsset(path: string): Promise<Response> {
    const response = await this.fetchAsset(`/word-data/${path}`, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error(`词库资源加载失败（${response.status}）`)
    return response
  }

  private getCatalog(): Promise<Catalog> {
    if (!this.catalog) {
      this.catalog = this.readAsset('catalog.json').then(async (response) => {
        const data = await response.json() as Catalog
        if (!data?.folders || typeof data.folders !== 'object' ||
          Object.values(data.folders).some((folder) => !Array.isArray(folder.files) || folder.files.some((file) => typeof file !== 'string'))) {
          throw new Error('词库目录损坏，请重新安装客户端')
        }
        return data
      }).catch((error: unknown) => { this.catalog = null; throw error })
    }
    return this.catalog
  }

  async listFolders(): Promise<string[]> { return Object.keys((await this.getCatalog()).folders) }
  async listFiles(folder: string): Promise<string[]> { return [...((await this.getCatalog()).folders[folder]?.files ?? [])] }

  async loadWords(folder: string, file: string): Promise<StudyCard[]> {
    if (!(await this.listFiles(folder)).includes(file)) throw new Error('找不到所选词库')
    const response = await this.readAsset(`${encodeURIComponent(folder)}/${encodeURIComponent(file)}`)
    const distinct = new Map<string, Word>()
    for (const line of (await response.text()).split(/\r?\n/)) {
      const separator = line.indexOf('|')
      if (separator < 1) continue
      const word = line.slice(0, separator).trim()
      const meaning = line.slice(separator + 1).trim()
      if (word && meaning) distinct.set(JSON.stringify([word, meaning]), { word, meaning })
    }
    if (!distinct.size) throw new Error('所选词库没有可学习的卡片')
    return Promise.all([...distinct].map(async ([key, word]) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
      const id = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      return { ...word, id }
    }))
  }
}

export const wordLibrary = new LocalWordClient()

/** A learning session owns its state; listening to another deck cannot overwrite it. */
export class LocalStudySession {
  private cards: StudyCard[] = []
  private current: StudyCard | null = null
  private learned = new Set<string>()
  private key = ''
  private library: LocalWordClient
  private storage: ProgressStorage

  constructor(library = wordLibrary, storage: ProgressStorage = {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  }) { this.library = library; this.storage = storage }

  async start(folder: string, file: string): Promise<StudySnapshot> {
    const cards = await this.library.loadWords(folder, file)
    const key = `word-plus:progress:v2:${JSON.stringify([folder, file])}`
    let saved: unknown
    try { saved = JSON.parse(this.storage.getItem(key) ?? '[]') }
    catch { throw new Error('无法读取本机学习进度，请检查应用存储权限') }
    if (!Array.isArray(saved) || saved.some((id) => typeof id !== 'string')) throw new Error('学习进度格式损坏，请先备份应用数据')
    const ids = new Set(cards.map((card) => card.id))
    this.cards = cards
    this.key = key
    this.learned = new Set(saved.filter((id: string) => ids.has(id)))
    this.current = null
    return this.next()
  }

  snapshot(): StudySnapshot {
    const total = this.cards.length
    const learned = this.learned.size
    return { currentWord: this.current, progress: { total, learned, remaining: total - learned, percentage: total ? learned / total * 100 : 0 } }
  }

  private persist(next: Set<string>): void {
    try { this.storage.setItem(this.key, JSON.stringify([...next])) }
    catch { throw new Error('本机存储空间不足或不可写，进度尚未保存。请清理空间后重试。') }
    this.learned = next
  }

  markKnown(): StudySnapshot {
    if (this.current) this.persist(new Set([...this.learned, this.current.id]))
    return this.snapshot()
  }

  next(): StudySnapshot {
    const pending = this.cards.filter((card) => !this.learned.has(card.id))
    const candidates = pending.length > 1 ? pending.filter((card) => card.id !== this.current?.id) : pending
    this.current = candidates[Math.floor(Math.random() * candidates.length)] ?? null
    return this.snapshot()
  }

  restart(): StudySnapshot { this.persist(new Set()); return this.next() }
}
