<template>
  <div class="selection-view">
    <FileSelector
      :folders="folders"
      :files="files"
      :is-loading="isLoading"
      :error="error"
      @folder-change="handleFolderChange"
      @start="handleStart"
      @start-autoplay="handleStartAutoplay"
    />
  </div>
</template>

<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'

interface Props {
  folders: string[]
  files: string[]
  isLoading?: boolean
  error?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  folderChange: [folder: string]
  start: [folder: string, file: string]
  startAutoplay: [folder: string, file: string]
}>()

const handleFolderChange = (folder: string) => {
  emit('folderChange', folder)
}

const handleStart = (folder: string, file: string) => {
  emit('start', folder, file)
}

const handleStartAutoplay = (folder: string, file: string) => {
  emit('startAutoplay', folder, file)
}
</script>

<style scoped>
.selection-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-5);
}
</style>
