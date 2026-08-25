import { computed, ref } from 'vue';
import type { ClientProfilePayload, ClientProfileRecord, GenerationRunRecord, GenerationTestResult, SubscriptionRecord, TemplateListItem } from '@shared/types';
import {
  createClientProfile,
  deleteClientProfile,
  fetchClientProfileList,
  resetClientProfileToken,
  setClientProfileEnabled,
  testClientProfileGeneration,
  fetchClientProfileGenerationRuns,
  updateClientProfile
} from '../api/clientProfiles';

type ToastType = 'success' | 'error' | 'info';

type Hooks = {
  notify?: (message: string, type?: ToastType) => void;
  handleRequestError?: (error: unknown, fallback?: string) => void;
  ensureAuthed?: () => Promise<boolean>;
};

type BindingForm = {
  subscription_id: string;
  position: number;
  override_json: string;
};

type ClientProfileForm = {
  id?: string;
  name: string;
  template_id: string;
  enabled: boolean;
  subscriptions: BindingForm[];
};

const emptyForm = (): ClientProfileForm => ({
  name: '',
  template_id: '',
  enabled: true,
  subscriptions: []
});

export function useClientProfileManager(hooks: Hooks = {}) {
  const profiles = ref<ClientProfileRecord[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const modalOpen = ref(false);
  const form = ref<ClientProfileForm>(emptyForm());
  const togglingIds = ref<Record<string, boolean>>({});
  const resettingIds = ref<Record<string, boolean>>({});
  const generationTestingIds = ref<Record<string, boolean>>({});
  const generationRunLoadingIds = ref<Record<string, boolean>>({});
  const generationReports = ref<Record<string, GenerationTestResult & { tested_at: string; expanded: boolean }>>({});
  const generationRuns = ref<Record<string, GenerationRunRecord[]>>({});
  const deletingId = ref('');

  const enabledCount = computed(() => profiles.value.filter((profile) => profile.enabled).length);

  const reset = () => {
    profiles.value = [];
    modalOpen.value = false;
    form.value = emptyForm();
    generationReports.value = {};
    generationRuns.value = {};
  };

  const refreshList = async () => {
    loading.value = true;
    try {
      profiles.value = await fetchClientProfileList();
    } catch (error) {
      hooks.handleRequestError?.(error, '加载客户端链接失败');
    } finally {
      loading.value = false;
    }
  };

  const openCreate = (templates: TemplateListItem[], subscriptions: SubscriptionRecord[]) => {
    form.value = {
      ...emptyForm(),
      template_id: templates[0]?.id || '',
      subscriptions: subscriptions.map((subscription, index) => ({
        subscription_id: subscription.id,
        position: index,
        override_json: ''
      }))
    };
    modalOpen.value = true;
  };

  const openEdit = (profile: ClientProfileRecord) => {
    form.value = {
      id: profile.id,
      name: profile.name,
      template_id: profile.template_id,
      enabled: profile.enabled,
      subscriptions: profile.subscriptions.map((binding, index) => ({
        subscription_id: binding.subscription_id,
        position: binding.position ?? index,
        override_json: binding.override_json || ''
      }))
    };
    modalOpen.value = true;
  };

  const closeModal = () => {
    modalOpen.value = false;
  };

  const validateForm = () => {
    if (!form.value.name.trim()) return '客户端链接名称不能为空';
    if (!form.value.template_id) return '请选择模板';
    for (const binding of form.value.subscriptions) {
      if (!binding.override_json.trim()) continue;
      try {
        const parsed = JSON.parse(binding.override_json);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '局部覆盖必须是 JSON 对象';
      } catch {
        return '局部覆盖必须是有效 JSON';
      }
    }
    return '';
  };

  const payload = (): ClientProfilePayload => ({
    name: form.value.name.trim(),
    template_id: form.value.template_id,
    enabled: form.value.enabled,
    subscriptions: form.value.subscriptions.map((binding, index) => ({
      subscription_id: binding.subscription_id,
      position: index,
      override_json: binding.override_json.trim() || null
    }))
  });

  const save = async () => {
    const error = validateForm();
    if (error) {
      hooks.notify?.(error, 'error');
      return;
    }
    if (!(await hooks.ensureAuthed?.())) return;
    saving.value = true;
    try {
      if (form.value.id) await updateClientProfile(form.value.id, payload());
      else await createClientProfile(payload());
      closeModal();
      await refreshList();
      hooks.notify?.('客户端链接已保存', 'success');
    } catch (error) {
      hooks.handleRequestError?.(error, '保存客户端链接失败');
    } finally {
      saving.value = false;
    }
  };

  const remove = async (profile: ClientProfileRecord) => {
    if (!window.confirm(`确认删除客户端链接 ${profile.name} ?`)) return;
    if (!(await hooks.ensureAuthed?.())) return;
    deletingId.value = profile.id;
    try {
      await deleteClientProfile(profile.id);
      await refreshList();
      hooks.notify?.('客户端链接已删除', 'info');
    } catch (error) {
      hooks.handleRequestError?.(error, '删除客户端链接失败');
    } finally {
      deletingId.value = '';
    }
  };

  const toggle = async (profile: ClientProfileRecord) => {
    if (!(await hooks.ensureAuthed?.())) return;
    const next = !profile.enabled;
    togglingIds.value = { ...togglingIds.value, [profile.id]: true };
    try {
      const result = await setClientProfileEnabled(profile.id, next);
      profile.enabled = result.enabled;
      hooks.notify?.(result.enabled ? '客户端链接已启用' : '客户端链接已停用', 'info');
    } catch (error) {
      hooks.handleRequestError?.(error, '切换客户端链接状态失败');
    } finally {
      togglingIds.value = { ...togglingIds.value, [profile.id]: false };
    }
  };

  const resetToken = async (profile: ClientProfileRecord) => {
    if (!window.confirm(`确认重置客户端链接 ${profile.name} 的公开 token ?`)) return;
    if (!(await hooks.ensureAuthed?.())) return;
    resettingIds.value = { ...resettingIds.value, [profile.id]: true };
    try {
      const result = await resetClientProfileToken(profile.id);
      profile.public_token = result.public_token;
      hooks.notify?.('公开 token 已重置，旧地址已失效', 'success');
    } catch (error) {
      hooks.handleRequestError?.(error, '重置公开 token 失败');
    } finally {
      resettingIds.value = { ...resettingIds.value, [profile.id]: false };
    }
  };

  const copyLink = async (profile: ClientProfileRecord) => {
    await navigator.clipboard.writeText(`${window.location.origin}/sub/client/${profile.public_token}`);
    hooks.notify?.('客户端订阅地址已复制', 'success');
  };


  const loadGenerationRuns = async (profile: ClientProfileRecord) => {
    if (hooks.ensureAuthed && !(await hooks.ensureAuthed())) return;
    generationRunLoadingIds.value = { ...generationRunLoadingIds.value, [profile.id]: true };
    try {
      generationRuns.value = {
        ...generationRuns.value,
        [profile.id]: await fetchClientProfileGenerationRuns(profile.id)
      };
    } catch (error) {
      hooks.handleRequestError?.(error, '加载生成记录失败');
    } finally {
      generationRunLoadingIds.value = { ...generationRunLoadingIds.value, [profile.id]: false };
    }
  };

  const testGeneration = async (profile: ClientProfileRecord) => {
    generationTestingIds.value = { ...generationTestingIds.value, [profile.id]: true };
    try {
      const report = await testClientProfileGeneration(profile.id);
      generationReports.value = {
        ...generationReports.value,
        [profile.id]: { ...report, tested_at: new Date().toISOString(), expanded: true }
      };
      await loadGenerationRuns(profile);
      hooks.notify?.(report.success ? '配置生成测试完成' : report.error || '配置生成测试失败', report.success ? 'success' : 'error');
    } catch (error) {
      hooks.handleRequestError?.(error, '配置生成测试失败');
    } finally {
      generationTestingIds.value = { ...generationTestingIds.value, [profile.id]: false };
    }
  };

  const toggleGenerationReport = async (profile: ClientProfileRecord) => {
    const report = generationReports.value[profile.id];
    if (!report) return;
    const expanded = !report.expanded;
    generationReports.value = { ...generationReports.value, [profile.id]: { ...report, expanded } };
    if (expanded && !generationRuns.value[profile.id]) await loadGenerationRuns(profile);
  };

  const isBound = (subscriptionId: string) => form.value.subscriptions.some((binding) => binding.subscription_id === subscriptionId);

  const toggleBinding = (subscriptionId: string) => {
    if (isBound(subscriptionId)) {
      form.value.subscriptions = form.value.subscriptions.filter((binding) => binding.subscription_id !== subscriptionId)
        .map((binding, index) => ({ ...binding, position: index }));
      return;
    }
    form.value.subscriptions.push({ subscription_id: subscriptionId, position: form.value.subscriptions.length, override_json: '' });
  };


  return {
    profiles,
    loading,
    saving,
    modalOpen,
    form,
    togglingIds,
    resettingIds,
    generationTestingIds,
    generationRunLoadingIds,
    generationReports,
    generationRuns,
    deletingId,
    enabledCount,
    reset,
    refreshList,
    openCreate,
    openEdit,
    closeModal,
    save,
    remove,
    toggle,
    resetToken,
    copyLink,
    testGeneration,
    toggleGenerationReport,
    loadGenerationRuns,
    isBound,
    toggleBinding
  };
}
