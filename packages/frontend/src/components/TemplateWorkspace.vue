<template>
  <div class="workspace-grid template-workspace split">
    <section class="panel panel-list">
      <div class="panel-head compact-head">
        <div>
          <h3>模板</h3>
          <span class="muted">{{ templates.length }} 个</span>
        </div>
        <button class="primary" @click="$emit('create')">新增</button>
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
      <div class="editor-toolbar">
        <label class="name-field inline-name">
          <span>模板名称</span>
          <input
            :value="currentName"
            class="title-input"
            :disabled="!currentId"
            placeholder="未选择模板"
            @input="handleCurrentNameInput"
          />
        </label>

        <div class="toolbar-actions">
          <span v-if="currentId" class="status-pill" :class="syntaxError ? 'error' : 'success'">
            {{ syntaxError ? 'JSON 有误' : 'JSON 正常' }}
          </span>
          <button class="ghost" @click="$emit('create')">新增</button>
          <button class="ghost" :disabled="!currentId" @click="cloneCurrent">克隆</button>
          <button class="danger" :disabled="!currentId" @click="deleteCurrent">删除</button>
          <button class="ghost" :disabled="!currentId" @click="formatJson">格式化</button>
          <button class="ghost" :disabled="!currentId" @click="$emit('copy-sub')">复制订阅</button>
          <button class="primary" :disabled="!currentId || !isDirty || saving || syntaxError" @click="$emit('save')">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

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

const props = defineProps<{
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


const cloneCurrent = () => {
  if (!props.currentId) return;
  emit('clone', props.currentId, props.currentName || props.currentId);
};

const deleteCurrent = () => {
  if (!props.currentId) return;
  emit('delete', props.currentId, props.currentName || props.currentId);
};

const handleCurrentNameInput = (event: Event) => {
  emit('update:currentName', (event.target as HTMLInputElement)?.value || '');
};
</script>
