<template>
  <div class="learning-view">
    <ActionButton variant="secondary" @click="emit('back')">返回词库</ActionButton>
    <div class="progress-section">
      <ProgressRing
        :total="progress.total"
        :learned="progress.learned"
      />
    </div>

    <div class="session-meta">
      <span class="eyebrow">DAILY PRACTICE</span>
      <span class="engine-pill"><span class="engine-dot"></span>{{ audioEngineLabel }}</span>
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
      <p v-if="error" class="audio-error" role="alert">{{ error }}</p>
      <div class="audio-control">
        <ActionButton
          variant="secondary"
          :loading="isPlayingAudio"
          @click="handlePlayAudio"
        >
          {{ isPlayingAudio ? '正在播放…' : '🔊 听发音' }}
        </ActionButton>
        <span v-if="audioError" class="audio-error">{{ audioError }}</span>
      </div>

      <div class="action-buttons">
        <ActionButton
          variant="secondary"
          :disabled="isBusy"
          @click="handleUnknown"
        >
          不认识
        </ActionButton>
        <ActionButton
          variant="primary"
          :disabled="isBusy || !isFlipped"
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
  audioEngineLabel?: string
  audioError?: string | null
  error?: string | null
  isBusy?: boolean
}

withDefaults(defineProps<Props>(), {
  audioEngineLabel: '设备语音引擎',
  audioError: null
})

const emit = defineEmits<{
  flip: []
  playAudio: []
  known: []
  unknown: []
  back: []
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
  gap: var(--space-4);
  max-width: 760px;
  margin: 0 auto;
}

.session-meta { width: min(100%, 560px); display: flex; justify-content: space-between; align-items: center; }
.eyebrow { color: var(--text-tertiary); font-size: 11px; letter-spacing: .18em; font-weight: 800; }
.engine-pill { display: inline-flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(31,36,48,.08); padding: 7px 11px; border-radius: 999px; }
.engine-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px rgba(52,199,89,.14); }

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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.audio-error { color: var(--error); font-size: 12px; }

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
