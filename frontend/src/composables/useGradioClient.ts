import { ref } from 'vue'
import { client as createClient } from '@gradio/client'

const DEFAULT_GRADIO_PORT = import.meta.env.VITE_GRADIO_PORT || '7860'

const resolveGradioUrl = () => {
  const configuredUrl = import.meta.env.VITE_GRADIO_URL?.trim()
  if (configuredUrl) {
    return configuredUrl
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_GRADIO_PORT}`
  }

  return `http://127.0.0.1:${DEFAULT_GRADIO_PORT}`
}

const GRADIO_URL = resolveGradioUrl()

let clientInstance: any = null
const isConnected = ref(false)
const error = ref<string | null>(null)

export function useGradioClient() {
  const connect = async () => {
    if (clientInstance && isConnected.value) {
      return true
    }

    try {
      error.value = null
      clientInstance = await createClient(GRADIO_URL)
      isConnected.value = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '连接失败'
      isConnected.value = false
      return false
    }
  }

  const disconnect = () => {
    clientInstance = null
    isConnected.value = false
  }

  const predict = async (endpoint: string, ...args: any[]) => {
    if (!clientInstance) {
      throw new Error('客户端未连接')
    }

    try {
      const result = await clientInstance.predict(endpoint, args)
      return result.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : '请求失败'
      throw e
    }
  }

  return {
    isConnected,
    error,
    gradioUrl: GRADIO_URL,
    connect,
    disconnect,
    predict
  }
}

