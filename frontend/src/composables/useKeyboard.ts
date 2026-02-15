import { onMounted, onUnmounted } from 'vue'

export interface KeyboardHandlers {
  onSpace?: () => void
  onEnter?: () => void
  onKeyP?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onEscape?: () => void
}

export function useKeyboard(handlers: KeyboardHandlers) {
  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement

    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      return
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        handlers.onSpace?.()
        break
      case 'Enter':
        event.preventDefault()
        handlers.onEnter?.()
        break
      case 'KeyP':
        event.preventDefault()
        handlers.onKeyP?.()
        break
      case 'ArrowLeft':
        event.preventDefault()
        handlers.onArrowLeft?.()
        break
      case 'ArrowRight':
        event.preventDefault()
        handlers.onArrowRight?.()
        break
      case 'Escape':
        event.preventDefault()
        handlers.onEscape?.()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    handleKeyDown
  }
}
