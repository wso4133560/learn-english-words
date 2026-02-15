<template>
  <div class="file-selector glass">
    <h2 class="title">选择单词库</h2>

    <div class="selector-group">
      <label class="label">文件夹</label>
      <select
        v-model="selectedFolder"
        class="select"
        :disabled="isLoading"
        @change="handleFolderChange"
      >
        <option v-if="folders.length === 0" value="">暂无文件夹</option>
        <option v-for="folder in folders" :key="folder" :value="folder">
          {{ folder }}
        </option>
      </select>
    </div>

    <div class="selector-group">
      <label class="label">文件</label>
      <select
        v-model="selectedFile"
        class="select"
        :disabled="isLoading || !selectedFolder"
      >
        <option v-if="files.length === 0" value="">暂无文件</option>
        <option v-for="file in files" :key="file" :value="file">
          {{ file }}
        </option>
      </select>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <ActionButton
      variant="primary"
      :disabled="!selectedFolder || !selectedFile || isLoading"
      :loading="isLoading"
      @click="handleStart"
    >
      开始学习
    </ActionButton>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ActionButton from './ActionButton.vue'

interface Props {
  folders: string[]
  files: string[]
  isLoading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null
})

const emit = defineEmits<{
  folderChange: [folder: string]
  start: [folder: string, file: string]
}>()

const selectedFolder = ref('')
const selectedFile = ref('')

watch(() => props.folders, (newFolders) => {
  if (newFolders.length > 0 && !selectedFolder.value) {
    selectedFolder.value = newFolders[0] || ''
  }
})

watch(() => props.files, (newFiles) => {
  if (newFiles.length > 0 && !selectedFile.value) {
    selectedFile.value = newFiles[0] || ''
  }
})

const handleFolderChange = () => {
  selectedFile.value = ''
  emit('folderChange', selectedFolder.value)
}

const handleStart = () => {
  if (selectedFolder.value && selectedFile.value) {
    emit('start', selectedFolder.value, selectedFile.value)
  }
}
</script>

<style scoped>
.file-selector {
  max-width: 480px;
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.title {
  font-size: var(--text-h2);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-align: center;
  margin: 0;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-small);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.select {
  height: 48px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  font-size: var(--text-body);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 200ms ease;
}

.select:hover:not(:disabled) {
  border-color: var(--primary);
}

.select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  padding: var(--space-3);
  background: var(--error-bg);
  color: var(--error);
  border-radius: var(--radius-sm);
  font-size: var(--text-small);
  text-align: center;
}

@media (max-width: 767px) {
  .file-selector {
    max-width: 90vw;
    padding: var(--space-5);
  }
}
</style>
