<template>
  <div class="auto-play-view">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载单词列表...</p>
    </div>

    <!-- Error Dialog -->
    <div v-else-if="error" class="error-dialog">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <div class="error-actions">
          <ActionButton variant="secondary" @click="handleRetry">
            重试
          </ActionButton>
          <ActionButton variant="primary" @click="handleBack">
            返回
          </ActionButton>
        </div>
      </div>
    </div>

    <!-- Playback State -->
    <div v-else class="playback-state">
      <div class="progress-section">
        <ProgressRing :total="progress.total" :learned="progress.learned" />
      </div>

      <div class="word-list-container">
        <div class="word-list">
          <div
            v-for="(word, index) in words"
            :key="index"
            :data-word-index="index"
            :class="[
              'word-item',
              {
                current: index === currentIndex && isPlaying,
                completed: word.status === 'completed',
                failed: word.status === 'failed'
              }
            ]"
          >
            <div class="word-content">
              <span class="word-text">{{ word.word }}</span>
              <span class="word-separator">-</span>
              <span class="word-meaning">{{ word.meaning }}</span>
            </div>
            <div class="word-status">
              <span v-if="word.status === 'completed'" class="status-icon">✓</span>
              <span v-else-if="word.status === 'failed'" class="status-icon">❌</span>
              <span v-else-if="index === currentIndex && isPlaying" class="play-count">
                第 {{ currentPlayCount }}/3 次
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="controls-section">
        <ActionButton
          v-if="isPlaying"
          variant="secondary"
          @click="handlePauseResume"
        >
          {{ isPaused ? '继续' : '暂停' }}
        </ActionButton>
        <ActionButton variant="primary" @click="handleBack">
          返回
        </ActionButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useAutoPlay } from '@/composables/useAutoPlay'
import ProgressRing from '@/components/ProgressRing.vue'
import ActionButton from '@/components/ActionButton.vue'

interface Props {
  folder: string
  file: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  complete: []
}>()

const {
  words,
  currentIndex,
  currentPlayCount,
  isPaused,
  isLoading,
  isPlaying,
  isComplete,
  error,
  progress,
  preloadWords,
  startAutoPlay,
  pause,
  resume,
  stop,
  reset
} = useAutoPlay()

onMounted(async () => {
  try {
    await preloadWords(props.folder, props.file)
    await startAutoPlay()
  } catch (e) {
    // Error handled by composable
  }
})

watch(isComplete, (complete) => {
  if (complete) {
    emit('complete')
  }
})

const handlePauseResume = () => {
  if (isPaused.value) {
    resume()
  } else {
    pause()
  }
}

const handleRetry = async () => {
  reset()
  try {
    await preloadWords(props.folder, props.file)
    await startAutoPlay()
  } catch (e) {
    // Error handled by composable
  }
}

const handleBack = () => {
  stop()
  reset()
  emit('back')
}
</script>

<style scoped>
.auto-play-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-5);
  background: var(--gradient-bg);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  animation: fadeIn 400ms ease-out;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 122, 255, 0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.error-dialog {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 400ms ease-out;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.error-icon {
  font-size: 48px;
}

.error-message {
  font-size: var(--text-body);
  color: var(--text-primary);
  text-align: center;
}

.error-actions {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.error-actions button {
  flex: 1;
}

.playback-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  width: 100%;
  max-width: 600px;
}

.progress-section {
  animation: fadeIn 400ms ease-out;
}

.word-list-container {
  width: 100%;
  animation: fadeIn 400ms ease-out 100ms backwards;
}

.word-list {
  max-height: 400px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.word-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  transition: all 300ms ease;
}

.word-item:last-child {
  margin-bottom: 0;
}

.word-item.current {
  background: rgba(0, 122, 255, 0.1);
  transform: scale(1.02);
}

.word-item.completed,
.word-item.failed {
  color: var(--text-secondary);
  opacity: 0.6;
}

.word-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

.word-text {
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.word-separator {
  color: var(--text-secondary);
}

.word-meaning {
  color: var(--text-secondary);
}

.word-status {
  display: flex;
  align-items: center;
  margin-left: var(--space-3);
}

.status-icon {
  font-size: 18px;
}

.play-count {
  font-size: var(--text-small);
  color: var(--primary);
  font-weight: var(--font-semibold);
}

.controls-section {
  display: flex;
  gap: var(--space-4);
  width: 100%;
  animation: fadeIn 400ms ease-out 200ms backwards;
}

.controls-section button {
  flex: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 767px) {
  .auto-play-view {
    padding: var(--space-4);
  }

  .playback-state {
    gap: var(--space-4);
  }

  .word-list {
    max-height: 300px;
    padding: var(--space-3);
  }

  .word-item {
    padding: var(--space-2);
  }

  .controls-section {
    flex-direction: column;
  }
}
</style>
