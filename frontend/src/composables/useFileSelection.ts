import { ref } from 'vue'
import { wordLibrary } from '@/services/localWordClient'

export function useFileSelection() {
  const folders = ref<string[]>([])
  const files = ref<string[]>([])
  let request = 0

  const loadFiles = async (folder: string) => {
    const token = ++request
    files.value = []
    const loaded = folder ? await wordLibrary.listFiles(folder) : []
    if (token === request) files.value = loaded
  }
  const loadFolders = async () => {
    folders.value = await wordLibrary.listFolders()
  }
  return { folders, files, loadFolders, loadFiles }
}
