<template>
  <div class="learning-view">
    <div class="progress-section">
      <ProgressRing
        :total="progress.total"
        :learned="progress.learned"
      />
    </div>

    <div class="card-section">
      <WordCard
        v-if="currentWord"
        :word="currentWord.word"
        :meaning="currentWord.meaning"
        :is-flipped="isFlipped"
        @flip="handleFlip"
      />
    </div>

    <div class="controls-section">
      <div class="audio-control">
        <ActionButton
          variant="secondary"
          :loading="isPlayingAudio"
          @click="handlePlayAudio"
        >
          🔊 发音
        </ActionButton>
      </div>

      <div class="action-buttons">
        <ActionButton
          variant="secondary"
          @click="handleUnknown"
        >
          不认识
        </ActionButton>
        <ActionButton
          variant="primary"
          @click="handleKnown"
        >
          认识
        </ActionButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import WordCard from '@/components/WordCard.vue'
import ProgressRing from '@/components/ProgressRing.vue'
import ActionButton from '@/components/ActionButton.vue'
import type { Word, WordProgress } from '@/types/word'

interface Props {
  currentWord: Word | null
  progress: WordProgress
  isFlipped: boolean
  isPlayingAudio?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  flip: []
  playAudio: []
  known: []
  unknown: []
}>()

const handleFlip = () => {
  emit('flip')
}

const handlePlayAudio = () => {
  emit('playAudio')
}

const handleKnown = () => {
  emit('known')
}

const handleUnknown = () => {
  emit('unknown')
}
</script>

<style scoped>
.learning-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-5);
  gap: var(--space-7);
}

.progress-section {
  animation: fadeIn 400ms ease-out;
}

.card-section {
  animation: fadeIn 400ms ease-out 100ms backwards;
}

.controls-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  animation: fadeIn 400ms ease-out 200ms backwards;
}

.audio-control {
  margin-bottom: var(--space-2);
}

.action-buttons {
  display: flex;
  gap: var(--space-4);
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
  .learning-view {
    gap: var(--space-5);
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-buttons button {
    width: 100%;
  }
}
</style>
