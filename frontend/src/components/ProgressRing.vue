<template>
  <div class="progress-ring">
    <svg :width="size" :height="size" class="ring-svg">
      <circle
        class="ring-background"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
      />
      <circle
        class="ring-progress"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="ring-content">
      <div class="percentage">{{ Math.round(percentage) }}%</div>
      <div class="count">{{ learned }} / {{ total }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  total: number
  learned: number
  size?: number
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 120,
  strokeWidth: 8
})

const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const percentage = computed(() =>
  props.total > 0 ? (props.learned / props.total) * 100 : 0
)
const dashOffset = computed(() =>
  circumference.value - (percentage.value / 100) * circumference.value
)
</script>

<style scoped>
.progress-ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ring-svg {
  transform: rotate(-90deg);
}

.ring-background {
  fill: none;
  stroke: rgba(0, 122, 255, 0.1);
}

.ring-progress {
  fill: none;
  stroke: url(#gradient);
  stroke-linecap: round;
  transition: stroke-dashoffset 800ms ease-out;
}

.ring-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.percentage {
  font-size: var(--text-h2);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  line-height: 1;
}

.count {
  font-size: var(--text-small);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}
</style>
