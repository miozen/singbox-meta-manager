<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar__top">
        <div>
          <div class="brand">META BOX</div>
          <div class="muted">sing-box template manager</div>
        </div>
        <button class="icon-btn" @click="openCreate">+</button>
      </div>

      <AuthDialog v-if="!isAuthed" v-model="password" :loading="authLoading" @submit="login" />
      <TemplateList
        v-else
        :items="templates"
        :current-id="currentId"
        @select="selectTemplate"
        @clone="openClone"
        @delete="openDelete"
      />
    </aside>

    <main class="main">
      <header class="header">
        <div class="header__meta">
          <label class="name-field">
            <span>名称</span>
            <input v-model="currentName" class="title-input" :disabled="!currentId" placeholder="未选择模板" />
          </label>
          <div class="template-meta">
            <span class="muted mono">ID {{ currentId || '---' }}</span>
            <span v-if="currentId" class="status-pill" :class="syntaxError ? 'error' : 'success'">
              {{ syntaxError ? '校验失败' : '校验通过' }}
            </span>
          </div>
        </div>
        <div class="actions" v-if="isAuthed && currentId">
          <button class="ghost" @click="formatJson">格式化</button>
          <button class="ghost" @click="copySubLink">复制订阅</button>
          <button class="primary" @click="save" :disabled="!isDirty || saving || syntaxError">保存</button>
          <button class="danger" @click="logout">退出</button>
        </div>
      </header>

      <section class="editor-wrap">
        <div v-if="loading" class="overlay">加载中...</div>
        <div v-if="!isAuthed" class="center">请先登录管理密码</div>
        <div v-else-if="!currentId" class="center">请选择或新建模板</div>
        <vue-monaco-editor
          v-else
          v-model:value="rawJson"
          theme="vs-dark"
          language="json"
          :options="editorOptions"
          @mount="handleMount"
          @validate="handleValidation"
          class="editor"
        />
      </section>
    </main>

    <ConfirmDialog
      v-if="modal.show"
      v-model:id="modal.id"
      v-model:name="modal.name"
      :title="modal.title"
      :confirm-text="modal.confirmText"
      :message="modal.message"
      :mode="modal.type === 'create' || modal.type === 'clone' ? 'form' : 'message'"
      @cancel="closeModal"
      @confirm="confirmModal"
    />

    <ToastHost :items="toasts" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import AuthDialog from './components/AuthDialog.vue';
import TemplateList from './components/TemplateList.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastHost from './components/ToastHost.vue';
import type { TemplateListItem } from '@shared/types';
import { clearAuthToken, hasAuthToken, setAuthToken } from './api/client';
import { login as loginApi } from './api/auth';
import { createTemplate, deleteTemplate, fetchTemplate, fetchTemplateList, updateTemplate } from './api/templates';

type ToastType = 'success' | 'error' | 'info';

const templates = ref<TemplateListItem[]>([]);
const currentId = ref('');
const currentName = ref('');
const rawJson = ref('');
const originalJson = ref('');
const loading = ref(false);
const saving = ref(false);
const syntaxError = ref(false);
const password = ref('');
const authLoading = ref(false);
const isAuthed = ref(hasAuthToken());
const editorRef = ref<any>(null);
const toasts = ref<{ id: number; message: string; type: ToastType }[]>([]);
let toastId = 0;

const modal = ref({
  show: false,
  type: '' as 'create' | 'clone' | 'delete' | '',
  title: '',
  confirmText: '',
  id: '',
  name: '',
  message: '',
  targetId: '',
});

const editorOptions = {
  automaticLayout: true,
  formatOnPaste: true,
  formatOnType: true,
  minimap: { enabled: false },
  wordWrap: 'on' as const,
  scrollBeyondLastLine: false,
  fontSize: 14
};

const defaultTemplateConfig = JSON.stringify({
  log: {},
  dns: {},
  ntp: {},
  certificate: {},
  certificate_providers: [],
  http_clients: [],
  network_namespaces: [],
  endpoints: [],
  inbounds: [],
  outbounds: [],
  route: {},
  services: [],
  experimental: {}
}, null, 2);

const isDirty = computed(() => Boolean(currentId.value) && (
  rawJson.value !== originalJson.value ||
  currentName.value !== templates.value.find(t => t.id === currentId.value)?.name
));

const showToast = (message: string, type: ToastType = 'info') => {
  const id = toastId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
};

const stripSchemaForEditor = (rawConfig: string) => {
  try {
    const obj = JSON.parse(rawConfig);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) delete obj.$schema;
    return JSON.stringify(obj, null, 2);
  } catch {
    return rawConfig;
  }
};

const refreshList = async () => {
  const data = await fetchTemplateList();
  templates.value = Array.isArray(data) ? data.filter((x) => x && typeof x.id === 'string' && typeof x.name === 'string') : [];
  if (isAuthed.value && !currentId.value && templates.value[0]) await loadTemplate(templates.value[0].id);
};

const loadTemplate = async (id: string) => {
  loading.value = true;
  try {
    const data = await fetchTemplate(id);
    const editorConfig = stripSchemaForEditor(data.raw_config);
    currentId.value = data.id;
    currentName.value = data.name;
    rawJson.value = editorConfig;
    originalJson.value = editorConfig;
  } catch (e) {
    showToast(e instanceof Error ? e.message : '加载失败', 'error');
  } finally {
    loading.value = false;
    setTimeout(() => editorRef.value?.getAction('editor.action.formatDocument')?.run(), 80);
  }
};

const ensureAuthed = async () => {
  if (isAuthed.value) return true;
  showToast('请先登录', 'error');
  return false;
};

const login = async () => {
  authLoading.value = true;
  try {
    const data = await loginApi(password.value);
    setAuthToken(data.token);
    isAuthed.value = true;
    password.value = '';
    await refreshList();
    showToast('登录成功', 'success');
  } catch (e) {
    showToast(e instanceof Error ? e.message : '登录失败', 'error');
  } finally {
    authLoading.value = false;
  }
};

const logout = () => {
  clearAuthToken();
  isAuthed.value = false;
  templates.value = [];
  currentId.value = '';
  currentName.value = '';
  rawJson.value = '';
  originalJson.value = '';
  showToast('已退出登录', 'info');
};

const selectTemplate = async (id: string) => {
  if (isDirty.value) {
    showToast('当前模板有未保存修改，请先保存', 'error');
    return;
  }
  await loadTemplate(id);
};

const save = async () => {
  if (!isDirty.value || syntaxError.value) return;
  saving.value = true;
  try {
    const cleanConfig = stripSchemaForEditor(rawJson.value);
    await updateTemplate(currentId.value, { name: currentName.value, raw_config: cleanConfig });
    rawJson.value = cleanConfig;
    originalJson.value = cleanConfig;
    const template = templates.value.find(t => t.id === currentId.value);
    if (template) template.name = currentName.value;
    showToast('保存成功', 'success');
  } catch (e) {
    showToast(e instanceof Error ? e.message : '保存失败', 'error');
  } finally {
    saving.value = false;
  }
};

const openCreate = () => {
  modal.value = { show: true, type: 'create', title: '新建模板', confirmText: '创建', id: '', name: '', message: '', targetId: '' };
};

const openClone = (targetId: string, sourceName: string) => {
  modal.value = { show: true, type: 'clone', title: '克隆模板', confirmText: '克隆', id: `${targetId}-copy`, name: `${sourceName} 副本`, message: '', targetId };
};

const openDelete = (targetId: string, name: string) => {
  modal.value = { show: true, type: 'delete', title: '删除模板', confirmText: '删除', id: '', name, message: `确认删除 ${name} ?`, targetId };
};

const closeModal = () => { modal.value.show = false; };

const confirmModal = async () => {
  try {
    if (modal.value.type === 'create' || modal.value.type === 'clone') {
      if (!modal.value.id || !modal.value.name) return showToast('ID 和名称不能为空', 'error');
      if (!/^[a-zA-Z0-9_-]+$/.test(modal.value.id)) return showToast('ID 只能包含英文、数字、_ 和 -', 'error');
      if (!(await ensureAuthed())) return;

      let base = defaultTemplateConfig;
      if (modal.value.type === 'clone') {
        const data = await fetchTemplate(modal.value.targetId);
        base = stripSchemaForEditor(data.raw_config);
      }

      const createdId = modal.value.id;
      await createTemplate({ id: createdId, name: modal.value.name, raw_config: base, updated_at: undefined });
      closeModal();
      await refreshList();
      await loadTemplate(createdId);
      showToast(modal.value.type === 'create' ? '创建成功' : '克隆成功', 'success');
      return;
    }

    if (modal.value.type === 'delete') {
      if (!(await ensureAuthed())) return;
      await deleteTemplate(modal.value.targetId);
      closeModal();
      await refreshList();
      currentId.value = '';
      currentName.value = '';
      rawJson.value = '';
      originalJson.value = '';
      showToast('模板已删除', 'info');
    }
  } catch (e) {
    showToast(e instanceof Error ? e.message : '操作失败', 'error');
  }
};

const copySubLink = async () => {
  await navigator.clipboard.writeText(`${window.location.origin}/sub/${currentId.value}`);
  showToast('订阅链接已复制', 'success');
};

const handleMount = (editor: any, monaco: any) => {
  editorRef.value = editor;
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    schemas: [{ uri: 'https://sing-box.sagernet.org/schema.json', fileMatch: ['*'] }]
  });
};

const handleValidation = (markers: any[]) => { syntaxError.value = markers.some(m => m.severity === 8); };
const formatJson = () => editorRef.value?.getAction('editor.action.formatDocument')?.run();

onMounted(async () => {
  await refreshList().catch(() => {});
});
</script>

<style>
:root { color-scheme: dark; }
body { margin: 0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #111827; }
.app-shell { display: flex; height: 100vh; color: #e5e7eb; }
.sidebar { width: 300px; background: #171923; border-right: 1px solid #2d3748; display: flex; flex-direction: column; }
.sidebar__top, .header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #2d3748; gap: 12px; }
.header__meta { display: grid; gap: 8px; min-width: 0; flex: 1; }
.template-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.name-field { display: grid; grid-template-columns: auto minmax(180px, 420px); align-items: center; gap: 10px; color: #94a3b8; font-size: 12px; }
.sidebar__auth, .sidebar__list { padding: 16px; display: grid; gap: 12px; }
.brand { font-weight: 800; letter-spacing: .08em; }
.title-input { background: #111827; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; font-weight: 700; font-size: 16px; padding: 8px 10px; outline: none; width: 100%; }
.title-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96,165,250,.16); }
.title-input:disabled { opacity: .55; cursor: not-allowed; }
.muted { color: #94a3b8; font-size: 12px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.status-pill { border-radius: 999px; font-size: 12px; font-weight: 700; line-height: 1; padding: 5px 8px; border: 1px solid transparent; }
.status-pill.success { background: rgba(22, 101, 52, .34); border-color: #22c55e; color: #bbf7d0; }
.status-pill.error { background: rgba(127, 29, 29, .48); border-color: #ef4444; color: #fecaca; }
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0f172a; }
.header { background: #0f172a; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.actions .ghost, .actions .primary, .actions .danger { font-size: 13px; line-height: 1.2; padding: 8px 10px; }
.editor-wrap { position: relative; flex: 1; min-height: 0; }
.editor, .center, .overlay { position: absolute; inset: 0; }
.editor { background: #111827; }
.center, .overlay { display: grid; place-items: center; background: rgba(17,24,39,.92); z-index: 2; }
.template-item { text-align: left; padding: 12px; border: 1px solid #243041; background: #111827; border-radius: 10px; color: inherit; cursor: pointer; width: 100%; }
.template-item.active { border-color: #3b82f6; }
.template-item__row { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.template-item__name { font-size: 14px; }
.template-item__id { font-size: 12px; color: #94a3b8; }
.template-item__ops { display: flex; gap: 6px; }
.input, .primary, .ghost, .danger, .icon-btn, .mini { border-radius: 10px; border: 1px solid transparent; padding: 10px 12px; }
.input { background: #0f172a; border-color: #243041; color: #fff; }
.primary { background: #2563eb; color: #fff; }
.primary:disabled { opacity: .5; cursor: not-allowed; }
.ghost { background: #1e293b; color: #e2e8f0; }
.danger { background: #7f1d1d; color: #fff; }
.icon-btn { background: #1e293b; color: #fff; width: 40px; height: 40px; }
.mini { padding: 6px 8px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; font-size: 12px; }
.danger-mini { background: #7f1d1d; }
.empty { color: #94a3b8; padding: 20px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: grid; place-items: center; z-index: 30; }
.modal { width: min(92vw, 460px); background: #111827; border: 1px solid #2d3748; border-radius: 16px; padding: 20px; display: grid; gap: 16px; }
.modal-body, .modal-actions { display: grid; gap: 12px; }
.modal-actions { grid-template-columns: 1fr 1fr; }
.toast-stack { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); display: grid; gap: 8px; z-index: 40; }
.toast { padding: 10px 14px; border-radius: 999px; background: #1f2937; color: #fff; border: 1px solid #374151; }
.toast.success { background: #14532d; }
.toast.error { background: #7f1d1d; }
.toast.info { background: #1e3a8a; }
</style>
