import { computed, ref } from 'vue';
import type { TemplateListItem, TemplateVersionRecord } from '@shared/types';
import {
  createTemplate,
  deleteTemplate,
  fetchTemplate,
  fetchTemplateList,
  fetchTemplateVersions,
  restoreTemplateVersion,
  updateTemplate
} from '../api/templates';

type ToastType = 'success' | 'error' | 'info';

type TemplateManagerHooks = {
  notify?: (message: string, type?: ToastType) => void;
  handleRequestError?: (error: unknown, fallback?: string) => void;
  ensureAuthed?: () => Promise<boolean>;
};

type TemplateModalType = 'create' | 'clone' | 'delete' | '';

const DEFAULT_TEMPLATE_CONFIG = JSON.stringify({
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

function stripSchemaForEditor(rawConfig: string) {
  try {
    const obj = JSON.parse(rawConfig);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) delete obj.$schema;
    return JSON.stringify(obj, null, 2);
  } catch {
    return rawConfig;
  }
}

export function useTemplateManager(hooks: TemplateManagerHooks = {}) {
  const templates = ref<TemplateListItem[]>([]);
  const currentId = ref('');
  const currentName = ref('');
  const rawJson = ref('');
  const originalJson = ref('');
  const loading = ref(false);
  const saving = ref(false);
  const syntaxError = ref(false);
  const templateVersions = ref<TemplateVersionRecord[]>([]);
  const versionsLoading = ref(false);
  const restoringVersionId = ref('');

  const modal = ref({
    show: false,
    type: '' as TemplateModalType,
    title: '',
    confirmText: '',
    id: '',
    name: '',
    message: '',
    targetId: ''
  });

  const isDirty = computed(() => Boolean(currentId.value) && (
    rawJson.value !== originalJson.value ||
    currentName.value !== templates.value.find((tpl) => tpl.id === currentId.value)?.name
  ));

  const resetCurrentTemplate = () => {
    currentId.value = '';
    currentName.value = '';
    rawJson.value = '';
    originalJson.value = '';
    syntaxError.value = false;
    templateVersions.value = [];
    restoringVersionId.value = '';
  };

  const setSyntaxError = (value: boolean) => {
    syntaxError.value = value;
  };

  const refreshList = async (options?: { autoLoadFirst?: boolean }) => {
    const data = await fetchTemplateList();
    templates.value = Array.isArray(data)
      ? data.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
      : [];

    if (options?.autoLoadFirst !== false && !currentId.value && templates.value[0]) {
      await loadTemplate(templates.value[0].id);
    }
  };

  const refreshVersions = async (templateId = currentId.value) => {
    if (!templateId) {
      templateVersions.value = [];
      return;
    }
    versionsLoading.value = true;
    try {
      templateVersions.value = await fetchTemplateVersions(templateId);
    } catch (error) {
      hooks.handleRequestError?.(error, '加载版本历史失败');
    } finally {
      versionsLoading.value = false;
    }
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
      syntaxError.value = false;
      await refreshVersions(id);
    } catch (error) {
      hooks.handleRequestError?.(error, '加载失败');
    } finally {
      loading.value = false;
    }
  };

  const selectTemplate = async (id: string) => {
    if (isDirty.value) {
      hooks.notify?.('当前模板有未保存修改，请先保存', 'error');
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
      const template = templates.value.find((tpl) => tpl.id === currentId.value);
      if (template) template.name = currentName.value;
      await refreshVersions(currentId.value);
      hooks.notify?.('保存成功', 'success');
    } catch (error) {
      hooks.handleRequestError?.(error, '保存失败');
    } finally {
      saving.value = false;
    }
  };

  const openCreate = () => {
    modal.value = {
      show: true,
      type: 'create',
      title: '新建模板',
      confirmText: '创建',
      id: '',
      name: '',
      message: '',
      targetId: ''
    };
  };

  const openClone = (targetId: string, sourceName: string) => {
    modal.value = {
      show: true,
      type: 'clone',
      title: '克隆模板',
      confirmText: '克隆',
      id: `${targetId}-copy`,
      name: `${sourceName} 副本`,
      message: '',
      targetId
    };
  };

  const openDelete = (targetId: string, name: string) => {
    modal.value = {
      show: true,
      type: 'delete',
      title: '删除模板',
      confirmText: '删除',
      id: '',
      name,
      message: `确认删除 ${name} ?`,
      targetId
    };
  };

  const closeModal = () => {
    modal.value.show = false;
  };

  const confirmModal = async () => {
    try {
      if (modal.value.type === 'create' || modal.value.type === 'clone') {
        if (!modal.value.id || !modal.value.name) {
          hooks.notify?.('ID 和名称不能为空', 'error');
          return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(modal.value.id)) {
          hooks.notify?.('ID 只能包含英文、数字、_ 和 -', 'error');
          return;
        }
        if (!(await hooks.ensureAuthed?.())) return;

        let base = DEFAULT_TEMPLATE_CONFIG;
        if (modal.value.type === 'clone') {
          const data = await fetchTemplate(modal.value.targetId);
          base = stripSchemaForEditor(data.raw_config);
        }

        const createdId = modal.value.id;
        await createTemplate({ id: createdId, name: modal.value.name, raw_config: base, updated_at: undefined });
        closeModal();
        await refreshList({ autoLoadFirst: false });
        await loadTemplate(createdId);
        hooks.notify?.(modal.value.type === 'create' ? '创建成功' : '克隆成功', 'success');
        return;
      }

      if (modal.value.type === 'delete') {
        if (!(await hooks.ensureAuthed?.())) return;
        const deletedId = modal.value.targetId;
        await deleteTemplate(deletedId);
        closeModal();
        resetCurrentTemplate();
        await refreshList({ autoLoadFirst: false });
        if (templates.value[0]) {
          await loadTemplate(templates.value[0].id);
        }
        if (deletedId === currentId.value) resetCurrentTemplate();
        hooks.notify?.('模板已删除', 'info');
      }
    } catch (error) {
      hooks.handleRequestError?.(error, '操作失败');
    }
  };

  const copyCurrentSubLink = async () => {
    if (!currentId.value) {
      hooks.notify?.('请先选择模板', 'info');
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/sub/${currentId.value}`);
    hooks.notify?.('订阅链接已复制', 'success');
  };

  const restoreVersion = async (versionId: string) => {
    if (!currentId.value || !versionId) return;
    if (!(await hooks.ensureAuthed?.())) return;

    restoringVersionId.value = versionId;
    try {
      const restored = await restoreTemplateVersion(currentId.value, versionId);
      currentName.value = restored.name;
      rawJson.value = stripSchemaForEditor(restored.raw_config);
      originalJson.value = stripSchemaForEditor(restored.raw_config);
      syntaxError.value = false;
      await refreshList({ autoLoadFirst: false });
      await refreshVersions(currentId.value);
      hooks.notify?.('已恢复到所选版本', 'success');
    } catch (error) {
      hooks.handleRequestError?.(error, '恢复版本失败');
    } finally {
      restoringVersionId.value = '';
    }
  };

  return {
    templates,
    currentId,
    currentName,
    rawJson,
    originalJson,
    loading,
    saving,
    syntaxError,
    templateVersions,
    versionsLoading,
    restoringVersionId,
    modal,
    isDirty,
    resetCurrentTemplate,
    setSyntaxError,
    refreshList,
    refreshVersions,
    loadTemplate,
    selectTemplate,
    save,
    openCreate,
    openClone,
    openDelete,
    closeModal,
    confirmModal,
    copyCurrentSubLink,
    restoreVersion
  };
}
