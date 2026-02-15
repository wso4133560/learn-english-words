<template>
  <div class="completion-view">
    <div class="celebration">🎉</div>
    <h1 class="title">恭喜完成学习！</h1>

    <div class="stats-card glass">
      <div class="stat-item">
        <div class="stat-value">{{ learned }}</div>
        <div class="stat-label">已学习单词</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ total }}</div>
        <div class="stat-label">总单词数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ percentage }}%</div>
        <div class="stat-label">完成度</div>
      </div>
    </div>

    <div class="actions">
      <ActionButton variant="primary" @click="handleRestart">
        开始新一轮
      </ActionButton>
      <ActionButton variant="secondary" @click="handleSwitch">
        切换文件
      </ActionButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ActionButton from './ActionButton.vue'

interface Props {
  learned: number
  total: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  restart: []
  switch: []
}>()

const percentage = computed(() =>
  props.total > 0 ? Math.round((props.learned / props.total) * 100) : 0
)

const handleRestart = () => {
  emit('restart')
}

const handleSwitch = () => {
  emit('switch')
}
</script>

<style scoped>
.completion-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-8);
}

.celebration {
  font-size: 80px;
  animation: bounce 600ms ease-in-out;
}

.title {
  font-size: var(--text-h1);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin: 0;
}

.stats-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  min-width: 480px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.stat-value {
  font-size: var(--text-h2);
  font-weight: var(--font-bold);
  color: var(--primary);
}

.stat-label {
  font-size: var(--text-small);
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: var(--space-4);
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 767px) {
  .completion-view {
    padding: var(--space-5);
  }

  .celebration {
    font-size: 60px;
  }

  .title {
    font-size: var(--text-h2);
  }

  .stats-card {
    grid-template-columns: 1fr;
    min-width: auto;
    width: 90vw;
  }

  .actions {
    flex-direction: column;
    width: 100%;
  }

  .actions button {
    width: 100%;
  }
}
</style>
