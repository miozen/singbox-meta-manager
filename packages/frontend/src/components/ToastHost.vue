<template>
  <div class="toast-stack">
    <div v-for="t in items" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
  </div>
</template>

<script setup lang="ts">
type ToastType = 'success' | 'error' | 'info';

defineProps<{
  items: { id: number; message: string; type: ToastType }[];
}>();
</script>
