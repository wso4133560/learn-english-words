import { describe, it, expect } from 'vitest'
import { LocalWordClient, LocalStudySession, type ProgressStorage } from '../src/services/localWordClient'

const fixture = () => {
  const data = new Map<string, string>()
  const storage: ProgressStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } }
  const requests: string[] = []
  const library = new LocalWordClient(async (input) => {
    const url = String(input); requests.push(url)
    if (url.endsWith('catalog.json')) return new Response(JSON.stringify({ folders: { demo: { files: ['a.txt', 'b.txt'] } } }))
    return new Response(url.endsWith('a.txt') ? 'bank|银行\nbank|河岸\nbank|银行\ninvalid\n|empty\n' : 'apple|苹果')
  })
  return { library, storage, data, requests }
}

describe('bundled vocabulary and durable card progress', () => {
  it('learns different meanings independently, deduplicates exact repeats, and completes after reopening', async () => {
    const { library, storage } = fixture()
    const first = new LocalStudySession(library, storage)
    const start = await first.start('demo', 'a.txt')
    expect(start.progress.total).toBe(2)
    const learnedCard = start.currentWord!.id
    expect(first.markKnown().progress.learned).toBe(1)
    const reopened = new LocalStudySession(library, storage)
    const restored = await reopened.start('demo', 'a.txt')
    expect(restored.progress.remaining).toBe(1)
    expect(restored.currentWord!.id).not.toBe(learnedCard)
    reopened.markKnown()
    expect(reopened.next()).toMatchObject({ currentWord: null, progress: { learned: 2, remaining: 0, percentage: 100 } })
    const complete = new LocalStudySession(library, storage)
    expect((await complete.start('demo', 'a.txt')).currentWord).toBeNull()
    expect(complete.restart().progress.learned).toBe(0)
  })

  it('does not advance progress when device storage rejects a write', async () => {
    const { library } = fixture()
    const session = new LocalStudySession(library, { getItem: () => null, setItem: () => { throw new Error('quota') } })
    await session.start('demo', 'a.txt')
    expect(() => session.markKnown()).toThrow('进度尚未保存')
    expect(session.snapshot().progress.learned).toBe(0)
  })

  it('keeps independent sessions and listening data isolated', async () => {
    const { library, storage, requests } = fixture()
    const one = new LocalStudySession(library, storage)
    const two = new LocalStudySession(library, storage)
    await one.start('demo', 'a.txt')
    await two.start('demo', 'b.txt')
    await library.loadWords('demo', 'b.txt')
    one.markKnown()
    expect(one.snapshot().progress.total).toBe(2)
    expect(two.snapshot().progress.learned).toBe(0)
    expect(requests.every((url) => url.startsWith('/word-data/'))).toBe(true)
  })

  it('rejects paths outside the packaged catalog', async () => {
    const { library, requests } = fixture()
    await expect(library.loadWords('../private', 'a.txt')).rejects.toThrow('找不到所选词库')
    expect(requests).toHaveLength(1)
  })

  it('filters obsolete saved cards and reports damaged storage', async () => {
    const { library, storage, data } = fixture()
    const key = 'word-plus:progress:v2:["demo","a.txt"]'
    data.set(key, '["old-card"]')
    const session = new LocalStudySession(library, storage)
    expect((await session.start('demo', 'a.txt')).progress.learned).toBe(0)
    data.set(key, '{}')
    await expect(session.start('demo', 'a.txt')).rejects.toThrow('格式损坏')
  })
})
