<template>
  <div class="sidebar__auth">
    <div class="muted">输入管理密码后解锁编辑权限</div>
    <input v-model="model" type="password" class="input" placeholder="Admin password" @keyup.enter="$emit('submit')" />
    <button class="primary" @click="$emit('submit')" :disabled="loading">登录</button>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<string>({ required: true });

defineProps<{ loading?: boolean }>();
defineEmits<{ submit: [] }>();
</script>
