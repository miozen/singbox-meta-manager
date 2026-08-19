<template>
  <section class="version-section">
    <div class="version-section__head">
      <div>
        <p class="eyebrow">VERSIONS</p>
        <h4>版本历史</h4>
      </div>
      <span class="muted">{{ versions.length }} 条</span>
    </div>

    <div v-if="!currentId" class="empty">选择模板后查看版本历史</div>
    <div v-else-if="loading" class="empty">版本历史加载中...</div>
    <div v-else-if="!versions.length" class="empty">当前模板还没有历史版本</div>
    <div v-else class="version-list">
      <article v-for="(version, index) in versions" :key="version.id" class="version-item">
        <div class="version-item__meta">
          <div class="version-item__title">
            <strong>{{ version.template_name }}</strong>
            <span class="badge" :class="{ active: index === 0 }">{{ index === 0 ? '最新快照' : '历史版本' }}</span>
          </div>
          <code>{{ version.id }}</code>
          <small>{{ version.created_at || '未知时间' }}</small>
          <small v-if="version.version_note" class="muted">{{ version.version_note }}</small>
        </div>
        <div class="actions compact">
          <button
            class="ghost"
            :disabled="restoringVersionId === version.id"
            @click="$emit('restore', version.id)"
          >
            {{ restoringVersionId === version.id ? '恢复中...' : '恢复到此版本' }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TemplateVersionRecord } from '@shared/types';

defineProps<{
  currentId: string;
  versions: TemplateVersionRecord[];
  loading: boolean;
  restoringVersionId: string;
}>();

defineEmits<{
  restore: [versionId: string];
}>();
</script>
