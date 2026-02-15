<template>
  <div class="word-card-container" @click="handleFlip">
    <div :class="['word-card', { flipped: isFlipped }]">
      <div class="card-face card-front glass">
        <div class="word">{{ word }}</div>
        <div class="hint">点击翻转查看释义</div>
      </div>
      <div class="card-face card-back glass">
        <div class="word-small">{{ word }}</div>
        <div class="meaning">{{ meaning }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  word: string
  meaning: string
  isFlipped: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  flip: []
}>()

const handleFlip = () => {
  emit('flip')
}
</script>

<style scoped>
.word-card-container {
  perspective: 1000px;
  cursor: pointer;
  user-select: none;
}

.word-card {
  position: relative;
  width: 480px;
  height: 320px;
  transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.word-card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
}

.card-front {
  background: var(--card-gradient);
}

.card-back {
  background: var(--card-gradient);
  transform: rotateY(180deg);
}

.word {
  font-size: var(--text-h1);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin-bottom: var(--space-5);
}

.hint {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.word-small {
  font-size: var(--text-h3);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.meaning {
  font-size: var(--text-large);
  font-weight: var(--font-regular);
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: center;
  max-width: 90%;
}

@media (max-width: 767px) {
  .word-card {
    width: 90vw;
    height: 240px;
  }

  .word {
    font-size: var(--text-h2);
  }

  .word-small {
    font-size: var(--text-large);
  }

  .meaning {
    font-size: var(--text-body);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .word-card {
    width: 400px;
    height: 280px;
  }
}
</style>
