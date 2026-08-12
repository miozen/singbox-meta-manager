<template>
  <div class="sidebar__list">
    <div v-if="!items.length" class="empty">暂无模板</div>
    <div
      v-for="tpl in items"
      :key="tpl.id"
      class="template-item"
      :class="{ active: tpl.id === currentId }"
      @click="$emit('select', tpl.id)"
    >
      <div class="template-item__row">
        <div>
          <div class="template-item__name">{{ tpl.name }}</div>
          <div class="template-item__id">{{ tpl.id }}</div>
        </div>
        <div class="template-item__ops" @click.stop>
          <button class="mini" @click="$emit('clone', tpl.id, tpl.name)">克隆</button>
          <button class="mini danger-mini" @click="$emit('delete', tpl.id, tpl.name)">删</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TemplateListItem } from '@shared/types';

defineProps<{
  items: TemplateListItem[];
  currentId: string;
}>();

defineEmits<{
  select: [id: string];
  clone: [id: string, name: string];
  delete: [id: string, name: string];
}>();
</script>
