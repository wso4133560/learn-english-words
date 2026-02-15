import { ref, watch } from 'vue'
import { useGradioClient } from './useGradioClient'

export function useFileSelection() {
  const { predict } = useGradioClient()

  const folders = ref<string[]>([])
  const files = ref<string[]>([])
  const selectedFolder = ref<string>('')
  const selectedFile = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const normalizeChoices = (choices: unknown): string[] => {
    if (!Array.isArray(choices)) return []

    return choices
      .map((choice) => {
        if (Array.isArray(choice)) {
          // Gradio dropdown choice may be [label, value]
          const value = choice[1] ?? choice[0]
          return value == null ? '' : String(value)
        }
        return choice == null ? '' : String(choice)
      })
      .filter((item) => item.length > 0)
  }

  const loadFolders = async () => {
    try {
      isLoading.value = true
      error.value = null

      const result = await predict('/get_folders')

      if (result && result[0] && result[0].choices) {
        folders.value = normalizeChoices(result[0].choices)
        if (folders.value.length > 0) {
          selectedFolder.value = folders.value[0] || ''
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载文件夹失败'
    } finally {
      isLoading.value = false
    }
  }

  const loadFiles = async (folder: string) => {
    if (!folder) {
      files.value = []
      return
    }

    try {
      isLoading.value = true
      error.value = null

      const result = await predict('/on_folder_change', folder)

      if (result && result[0] && result[0].choices) {
        files.value = normalizeChoices(result[0].choices)
        if (files.value.length > 0) {
          selectedFile.value = files.value[0] || ''
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载文件失败'
    } finally {
      isLoading.value = false
    }
  }

  watch(selectedFolder, (newFolder) => {
    if (newFolder) {
      loadFiles(newFolder)
    }
  })

  const reset = () => {
    folders.value = []
    files.value = []
    selectedFolder.value = ''
    selectedFile.value = ''
    error.value = null
  }

  return {
    folders,
    files,
    selectedFolder,
    selectedFile,
    isLoading,
    error,
    loadFolders,
    loadFiles,
    reset
  }
}
