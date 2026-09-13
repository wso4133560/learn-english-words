<template>
  <div class="app">
    <div class="background"></div>

    <Transition name="fade" mode="out-in">
      <SelectionView
        v-if="currentView === 'selection'"
        :folders="folders"
        :files="files"
        :is-loading="isLoading"
        :error="error"
        @folder-change="handleFolderChange"
        @start="handleStart"
        @start-autoplay="handleStartAutoplay"
      />

      <LearningView
        v-else-if="currentView === 'learning'"
        :current-word="currentWord"
        :progress="progress"
        :is-flipped="isFlipped"
        :is-playing-audio="isPlayingAudio"
        :audio-engine-label="engineLabel"
        :audio-error="audioError"
        :error="learningError"
        :is-busy="isLoading"
        @back="handleSwitch"
        @flip="handleFlip"
        @play-audio="handlePlayAudio"
        @known="handleKnown"
        @unknown="handleUnknown"
      />

      <AutoPlayView
        v-else-if="currentView === 'autoplay'"
        :folder="selectedFolder"
        :file="selectedFile"
        @complete="handleAutoplayComplete"
        @back="handleAutoplayBack"
      />

      <CompletionView
        v-else-if="currentView === 'completion'"
        :learned="progress.learned"
        :total="progress.total"
        @restart="handleRestart"
        @switch="handleSwitch"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SelectionView from '@/views/SelectionView.vue'
import LearningView from '@/views/LearningView.vue'
import CompletionView from '@/components/CompletionView.vue'
import AutoPlayView from '@/views/AutoPlayView.vue'
import { useFileSelection } from '@/composables/useFileSelection'
import { useWordLearning } from '@/composables/useWordLearning'
import { useAudio } from '@/composables/useAudio'
import { useKeyboard } from '@/composables/useKeyboard'
import { warmupKokoro } from '@/services/kokoroFrontend'

type View = 'selection' | 'learning' | 'completion' | 'autoplay'

const currentView = ref<View>('selection')
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedFolder = ref<string>('')
const selectedFile = ref<string>('')

const {
  folders,
  files,
  loadFolders,
  loadFiles
} = useFileSelection()

const {
  currentWord,
  isFlipped,
  progress,
  isComplete,
  error: learningError,
  startLearning,
  restartLearning,
  markAsKnown,
  nextWord,
  flipCard,
  reset: resetLearning
} = useWordLearning()

const {
  isPlaying: isPlayingAudio,
  playPronunciation,
  preloadPronunciation,
  engineLabel,
  error: audioError,
  reset: resetAudio
} = useAudio()

const preloadCurrentAudio = () => {
  if (currentWord.value) void preloadPronunciation(currentWord.value.word)
}

onMounted(async () => {
  // Let the first screen paint before the one-time model initialization starts.
  window.setTimeout(() => { void warmupKokoro() }, 800)
  isLoading.value = true
  try { await loadFolders() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '无法加载本地词库' }

  isLoading.value = false
})

const handleFolderChange = async (folder: string) => {
  try { error.value = null; await loadFiles(folder) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '无法加载词库' }
}

const handleStart = async (folder: string, file: string) => {
  error.value = null
  isLoading.value = true
  selectedFolder.value = folder
  selectedFile.value = file
  const result = await startLearning(folder, file)

  if (result.success && result.state === 'learning' && currentWord.value) {
    currentView.value = 'learning'
    preloadCurrentAudio()
  } else if (result.success && result.state === 'completion') {
    currentView.value = 'completion'
  } else {
    error.value = result.message || learningError.value || '开始学习失败'
  }

  isLoading.value = false
}

const handleFlip = () => {
  flipCard()
}

const handlePlayAudio = async () => {
  try { await playPronunciation(currentWord.value?.word) } catch { /* The audio control displays the error. */ }
}

const handleKnown = async () => {
  if (isLoading.value || !isFlipped.value) return
  isLoading.value = true
  try { if (await markAsKnown()) await handleNext() }
  finally { isLoading.value = false }
}

const handleUnknown = async () => {
  if (isLoading.value) return
  await handleNext()
}

const handleNext = async () => {
  resetAudio()
  await nextWord()

  preloadCurrentAudio()

  if (isComplete.value) {
    currentView.value = 'completion'
  }
}

const handleRestart = async () => {
  isLoading.value = true
  error.value = null

  const restarted = await restartLearning()
  if (restarted && currentWord.value) {
    currentView.value = 'learning'
    preloadCurrentAudio()
  } else {
    resetLearning()
    currentView.value = 'selection'
    error.value = '开始新一轮失败，请重新选择文件'
  }

  isLoading.value = false
}

const handleSwitch = () => {
  resetAudio()
  resetLearning()
  currentView.value = 'selection'
}

const handleStartAutoplay = async (folder: string, file: string) => {
  selectedFolder.value = folder
  selectedFile.value = file
  currentView.value = 'autoplay'
}

const handleAutoplayComplete = () => {
  currentView.value = 'selection'
}

const handleAutoplayBack = () => {
  currentView.value = 'selection'
}

useKeyboard({
  onSpace: () => {
    if (currentView.value === 'learning') {
      handleFlip()
    }
  },
  onEnter: () => {
    if (currentView.value === 'learning' && isFlipped.value) {
      handleKnown()
    }
  },
  onKeyP: () => {
    if (currentView.value === 'learning') {
      handlePlayAudio()
    }
  },
  onArrowLeft: () => {
    if (currentView.value === 'learning') {
      handleUnknown()
    }
  },
  onArrowRight: () => {
    if (currentView.value === 'learning') {
      handleKnown()
    }
  }
})
</script>

<style scoped>
.app {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--gradient-bg);
  z-index: -1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 400ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
