import { computed, ref } from 'vue'
import { preloadPronunciation, useKokoroFrontend } from '@/services/kokoroFrontend'

export function useAudio() {
  const isPlaying = ref(false)
  const { status, error, speak, stop } = useKokoroFrontend()

  const playPronunciation = async (text?: string) => {
    if (isPlaying.value || !text) return
    isPlaying.value = true
    try { await speak(text) } finally { isPlaying.value = false }
  }

  const reset = () => {
    stop()
    isPlaying.value = false
  }

  const preload = (text?: string) => text ? preloadPronunciation(text) : Promise.resolve(false)

  return {
    isPlaying,
    error,
    engineStatus: status,
    engineLabel: computed(() => status.value === 'kokoro' ? 'Kokoro 本地引擎' : '设备语音引擎'),
    playPronunciation,
    preloadPronunciation: preload,
    reset
  }
}
