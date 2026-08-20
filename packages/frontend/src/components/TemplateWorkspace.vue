<template>
  <section class="panel panel-editor template-editor-panel">
    <div class="editor-toolbar template-toolbar">
      <label class="template-select-field">
        <span>当前模板</span>
        <select :value="currentId" class="input" @change="handleTemplateSelect">
          <option value="" disabled>请选择模板</option>
          <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
        </select>
      </label>

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
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import type { TemplateListItem } from '@shared/types';

const props = defineProps<{
  templates: TemplateListItem[];
  currentId: string;
  currentName: string;
  rawJson: string;
  loading: boolean;
  saving: boolean;
  syntaxError: boolean;
  isDirty: boolean;
}>();

const emit = defineEmits<{
  create: [];
  select: [id: string];
  clone: [id: string, name: string];
  delete: [id: string, name: string];
  save: [];
  'copy-sub': [];
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

const handleTemplateSelect = (event: Event) => {
  const id = (event.target as HTMLSelectElement)?.value || '';
  if (id) emit('select', id);
};

const handleCurrentNameInput = (event: Event) => {
  emit('update:currentName', (event.target as HTMLInputElement)?.value || '');
};
</script>
