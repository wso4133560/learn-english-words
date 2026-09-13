import { afterEach, describe, expect, it, vi } from 'vitest'
import { preloadPronunciation, registerKokoroRuntime, useKokoroFrontend } from '../src/services/kokoroFrontend'

const played = vi.fn()
class FakeAudio {
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  currentTime = 0
  timer: ReturnType<typeof setTimeout> | undefined
  play() { played(); this.timer = setTimeout(() => this.onended?.(), 5000); return Promise.resolve() }
  pause() { clearTimeout(this.timer) }
}

vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn() } })
vi.stubGlobal('Audio', FakeAudio)
vi.stubGlobal('HTMLAudioElement', FakeAudio)
afterEach(() => { useKokoroFrontend().stop(); played.mockClear() })

describe('client audio lifecycle', () => {
  it('settles an active audio promise when the user stops', async () => {
    registerKokoroRuntime({ speak: async () => new Blob(['sample']) })
    const audio = useKokoroFrontend()
    const pending = audio.speak('hello')
    await vi.waitFor(() => expect(played).toHaveBeenCalledOnce())
    audio.stop()
    await expect(pending).resolves.toBeUndefined()
  })
  it('never plays a late generation result after leaving the card', async () => {
    let resolve!: (value: unknown) => void
    registerKokoroRuntime({ speak: () => new Promise((done) => { resolve = done }) })
    const audio = useKokoroFrontend()
    const pending = audio.speak('hello')
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    audio.stop()
    resolve(new Blob(['sample']))
    await pending
    expect(played).not.toHaveBeenCalled()
  })
  it('reports invalid generated audio instead of silently completing', async () => {
    registerKokoroRuntime({ speak: () => ({}) })
    await expect(useKokoroFrontend().speak('hello')).rejects.toThrow('可播放的音频')
  })
  it('reuses generated audio for repeated pronunciation', async () => {
    const speak = vi.fn(async () => new Blob(['sample'], { type: 'audio/wav' }))
    registerKokoroRuntime({ speak })
    const audio = useKokoroFrontend()

    const first = audio.speak('cached')
    await vi.waitFor(() => expect(played).toHaveBeenCalledOnce())
    audio.stop()
    await first

    const second = audio.speak('cached')
    await vi.waitFor(() => expect(played).toHaveBeenCalledTimes(2))
    audio.stop()
    await second

    expect(speak).toHaveBeenCalledOnce()
  })
  it('shares a pre-generated result with the first playback', async () => {
    const speak = vi.fn(async () => new Blob(['sample'], { type: 'audio/wav' }))
    registerKokoroRuntime({ speak })
    const audio = useKokoroFrontend()

    await expect(preloadPronunciation('ahead')).resolves.toBe(true)
    const pending = audio.speak('ahead')
    await vi.waitFor(() => expect(played).toHaveBeenCalledOnce())
    audio.stop()
    await pending

    expect(speak).toHaveBeenCalledOnce()
  })
})
