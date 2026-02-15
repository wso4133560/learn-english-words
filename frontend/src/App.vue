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
      />

      <LearningView
        v-else-if="currentView === 'learning'"
        :current-word="currentWord"
        :progress="progress"
        :is-flipped="isFlipped"
        :is-playing-audio="isPlayingAudio"
        @flip="handleFlip"
        @play-audio="handlePlayAudio"
        @known="handleKnown"
        @unknown="handleUnknown"
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
import { useGradioClient } from '@/composables/useGradioClient'
import { useFileSelection } from '@/composables/useFileSelection'
import { useWordLearning } from '@/composables/useWordLearning'
import { useAudio } from '@/composables/useAudio'
import { useKeyboard } from '@/composables/useKeyboard'

type View = 'selection' | 'learning' | 'completion'

const currentView = ref<View>('selection')
const isLoading = ref(false)
const error = ref<string | null>(null)

const { connect, error: gradioError } = useGradioClient()
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
  startLearning,
  markAsKnown,
  nextWord,
  flipCard,
  reset: resetLearning
} = useWordLearning()

const {
  isPlaying: isPlayingAudio,
  playPronunciation
} = useAudio()

onMounted(async () => {
  isLoading.value = true
  const connected = await connect()

  if (connected) {
    await loadFolders()
  } else {
    error.value = gradioError.value || '无法连接到后端服务，请确保后端已启动'
  }

  isLoading.value = false
})

const handleFolderChange = async (folder: string) => {
  await loadFiles(folder)
}

const handleStart = async (folder: string, file: string) => {
  isLoading.value = true
  const success = await startLearning(folder, file)

  if (success && currentWord.value) {
    currentView.value = 'learning'
  } else {
    error.value = '开始学习失败'
  }

  isLoading.value = false
}

const handleFlip = () => {
  flipCard()
}

const handlePlayAudio = async () => {
  await playPronunciation()
}

const handleKnown = async () => {
  await markAsKnown()
  await handleNext()
}

const handleUnknown = async () => {
  await handleNext()
}

const handleNext = async () => {
  await nextWord()

  if (isComplete.value) {
    currentView.value = 'completion'
  }
}

const handleRestart = () => {
  resetLearning()
  currentView.value = 'selection'
}

const handleSwitch = () => {
  resetLearning()
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
