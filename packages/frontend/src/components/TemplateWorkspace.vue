<template>
  <div class="workspace-grid split">
    <section class="panel panel-list">
      <div class="panel-head">
        <div>
          <p class="eyebrow">TEMPLATES</p>
          <h3>模板列表</h3>
        </div>
        <button class="primary" @click="$emit('create')">＋ 添加模板</button>
      </div>

      <TemplateList
        :items="templates"
        :current-id="currentId"
        @select="$emit('select', $event)"
        @clone="(id, name) => $emit('clone', id, name)"
        @delete="(id, name) => $emit('delete', id, name)"
      />

      <TemplateVersionList
        :current-id="currentId"
        :versions="templateVersions"
        :loading="versionsLoading"
        :restoring-version-id="restoringVersionId"
        @restore="$emit('restore-version', $event)"
      />
    </section>

    <section class="panel panel-editor">
      <div class="panel-head panel-head--editor">
        <div class="editor-heading">
          <p class="eyebrow">EDITOR</p>
          <h3>{{ currentId ? '模板编辑器' : '未选择模板' }}</h3>
          <div class="template-meta">
            <span class="muted mono">ID {{ currentId || '---' }}</span>
            <span v-if="currentId" class="status-pill" :class="syntaxError ? 'error' : 'success'">
              {{ syntaxError ? '校验失败' : '校验通过' }}
            </span>
          </div>
        </div>

        <div class="actions" v-if="currentId">
          <button class="ghost" @click="formatJson">格式化</button>
          <button class="ghost" @click="$emit('copy-sub')">复制订阅</button>
          <button class="primary" @click="$emit('save')" :disabled="!isDirty || saving || syntaxError">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <label class="name-field">
        <span>名称</span>
        <input
          :value="currentName"
          class="title-input"
          :disabled="!currentId"
          placeholder="未选择模板"
          @input="handleCurrentNameInput"
        />
      </label>

      <section class="editor-wrap">
        <div v-if="loading" class="overlay">加载中...</div>
        <div v-else-if="!currentId" class="center">请选择模板，或先新建一个模板</div>
        <vue-monaco-editor
          v-else
          :value="rawJson"
          theme="vs-dark"
          language="json"
          :options="editorOptions"
          @update:value="$emit('update:rawJson', $event)"
          @mount="handleMount"
          @validate="handleValidation"
          class="editor"
        />
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import type { TemplateListItem, TemplateVersionRecord } from '@shared/types';
import TemplateList from './TemplateList.vue';
import TemplateVersionList from './TemplateVersionList.vue';

defineProps<{
  templates: TemplateListItem[];
  templateVersions: TemplateVersionRecord[];
  currentId: string;
  currentName: string;
  rawJson: string;
  loading: boolean;
  saving: boolean;
  syntaxError: boolean;
  isDirty: boolean;
  versionsLoading: boolean;
  restoringVersionId: string;
}>();

const emit = defineEmits<{
  create: [];
  select: [id: string];
  clone: [id: string, name: string];
  delete: [id: string, name: string];
  save: [];
  'copy-sub': [];
  'restore-version': [versionId: string];
  setSyntaxError: [value: boolean];
  'update:rawJson': [value: string];
  'update:currentName': [value: string];
}>();

const editorRef = ref<any>(null);

const editorOptions = {
  automaticLayout: true,
  formatOnPaste: true,
  formatOnType: true,
  minimap: { enabled: false },
  wordWrap: 'on' as const,
  scrollBeyondLastLine: false,
  fontSize: 14
};

const handleMount = (editor: any, monaco: any) => {
  editorRef.value = editor;
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    schemas: [{ uri: 'https://sing-box.sagernet.org/schema.json', fileMatch: ['*'] }]
  });
};

const handleValidation = (markers: any[]) => {
  emit('setSyntaxError', markers.some((marker) => marker.severity === 8));
};

const formatJson = () => {
  editorRef.value?.getAction('editor.action.formatDocument')?.run();
};

const handleCurrentNameInput = (event: Event) => {
  emit('update:currentName', (event.target as HTMLInputElement)?.value || '');
};
</script>
