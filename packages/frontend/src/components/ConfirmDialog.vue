<template>
  <div class="modal-backdrop">
    <div class="modal">
      <h3>{{ title }}</h3>
      <div class="modal-body">
        <template v-if="mode === 'form'">
          <input v-model="id" class="input" placeholder="template id" />
          <input v-model="name" class="input" placeholder="template name" />
        </template>
        <p v-else>{{ message }}</p>
      </div>
      <div class="modal-actions">
        <button class="ghost" @click="$emit('cancel')">取消</button>
        <button class="primary" @click="$emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const id = defineModel<string>('id', { default: '' });
const name = defineModel<string>('name', { default: '' });

defineProps<{
  title: string;
  confirmText: string;
  message?: string;
  mode: 'form' | 'message';
}>();

defineEmits<{ cancel: []; confirm: [] }>();
</script>
