<template>
  <button
    :class="['action-button', variant, { loading }]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <span v-else class="button-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.action-button {
  height: 48px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  font-weight: var(--font-semibold);
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
  outline: none;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.primary {
  background: var(--primary);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.action-button.primary:hover:not(:disabled) {
  background: var(--primary-hover);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
  transform: translateY(-2px);
}

.action-button.primary:active:not(:disabled) {
  transform: scale(0.96);
}

.action-button.secondary {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.action-button.secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.action-button.secondary:active:not(:disabled) {
  transform: scale(0.96);
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
</style>
