<template>
  <main v-if="!isAuthed" class="auth-shell">
    <section class="auth-copy">
      <div class="brand-mark">PH</div>
      <p class="eyebrow">PHASE 9 / SETTINGS</p>
      <h1>统一模板后台<br><span>正在迁移升级</span></h1>
      <p>当前阶段开始迁移系统设置，让生成参数从硬编码升级为可在线维护。</p>
    </section>

    <form class="auth-card" @submit.prevent="login">
      <div class="auth-tabs">
        <button type="button" class="active">登录</button>
        <button type="button" disabled>管理员后台</button>
      </div>

      <label for="admin-password">管理密码</label>
      <input
        id="admin-password"
        v-model="password"
        class="input"
        type="password"
        autocomplete="current-password"
        placeholder="请输入后台管理密码"
      />

      <button class="primary wide" :disabled="authLoading">
        {{ authLoading ? '登录中...' : '进入控制台' }}
      </button>
      <p class="form-note">当前仍使用单管理员密码登录模式，后续阶段再扩展更多业务模块。</p>
    </form>

    <ToastHost :items="toasts" />
  </main>

  <div v-else class="app-shell">
    <aside :class="{ open: menuOpen }">
      <div class="sidebar-brand">
        <div class="brand-mark small">PH</div>
        <div>
          <strong>ProxyHub Style</strong>
          <span>Worker Control Plane</span>
        </div>
      </div>

      <nav>
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="{ active: currentPage === item.id }"
          :disabled="item.disabled"
          @click="selectPage(item.id, item.disabled)"
        >
          <span>{{ item.icon }}</span>{{ item.label }}
        </button>
      </nav>

      <div class="sidebar-user">
        <span class="avatar">A</span>
        <div>
          <strong>admin</strong>
          <small>single operator</small>
        </div>
        <button @click="logoutWithNotice" title="退出">↗</button>
      </div>
    </aside>

    <section class="workspace">
      <header>
        <button class="menu" @click="menuOpen = !menuOpen">☰</button>
        <div>
          <p class="eyebrow">{{ currentNav.eyebrow }}</p>
          <h2>{{ currentNav.title }}</h2>
        </div>
        <span class="status-dot">● Worker 在线</span>
      </header>

      <section class="content">
        <div class="hero">
          <div>
            <p class="eyebrow">PHASE 9</p>
            <h3>{{ currentHero.title }}</h3>
            <p>{{ currentHero.description }}</p>
          </div>
          <div class="hero-actions">
            <button v-if="currentPage === 'templates'" class="primary" @click="openCreate">新建模板</button>
            <button v-if="currentPage === 'templates'" class="ghost" @click="copyCurrentLink" :disabled="!currentId">复制当前订阅</button>
            <button v-if="currentPage === 'subscriptions'" class="primary" @click="openCreateSubscription">添加订阅源</button>
            <button v-if="currentPage === 'clients'" class="primary" @click="openCreateClient">新建客户端链接</button>
          </div>
        </div>

        <div class="stat-grid">
          <article v-for="stat in currentStats" :key="stat.label">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
            <small>{{ stat.note }}</small>
          </article>
        </div>

        <TemplateWorkspace
          v-if="currentPage === 'templates'"
          :templates="templates"
          :template-versions="templateVersions"
          :current-id="currentId"
          :current-name="currentName"
          :raw-json="rawJson"
          :loading="loading"
          :saving="saving"
          :syntax-error="syntaxError"
          :is-dirty="isDirty"
          :versions-loading="versionsLoading"
          :restoring-version-id="restoringVersionId"
          @create="openCreate"
          @select="selectTemplate"
          @clone="openClone"
          @delete="openDelete"
          @save="save"
          @copy-sub="copyCurrentLink"
          @restore-version="restoreVersion"
          @set-syntax-error="setSyntaxError"
          @update:current-name="updateCurrentName"
          @update:raw-json="updateRawJson"
        />

        <SubscriptionWorkspace
          v-if="currentPage === 'subscriptions'"
          :subscriptions="subscriptions"
          :regions="regions"
          :loading="subscriptionsLoading"
          :saving="subscriptionSaving"
          :testing-draft="testingDraftSubscription"
          :modal-open="subscriptionModalOpen"
          :form="subscriptionForm"
          :draft-report="draftSubscriptionReport"
          :reports="subscriptionReports"
          :testing-ids="testingSubscriptionIds"
          :toggling-ids="togglingSubscriptionIds"
          :deleting-id="deletingSubscriptionId"
          @create="openCreateSubscription"
          @edit="openEditSubscription"
          @delete="deleteSubscriptionItem"
          @toggle="toggleSubscriptionItem"
          @test="testSubscriptionItem"
          @toggle-report="toggleSubscriptionReport"
          @test-draft="testDraftSubscription"
          @save="saveSubscription"
          @close-modal="closeSubscriptionModal"
        />

        <SettingsWorkspace
          v-if="currentPage === 'settings'"
          :regions="settingsRegions"
          :loading="settingsLoading"
          :saving="settingsSaving"
          :settings="generationSettings"
          :keyword-text="generationKeywordText"
          @save="saveGenerationSettings"
          @update-keyword="updateGenerationKeyword"
          @update-setting="updateGenerationSetting"
          @update-urltest="updateGenerationUrltest"
        />

        <ClientProfileWorkspace
          v-if="currentPage === 'clients'"
          :profiles="clientProfiles"
          :templates="templates"
          :subscriptions="subscriptions"
          :loading="clientProfilesLoading"
          :saving="clientProfileSaving"
          :modal-open="clientProfileModalOpen"
          :form="clientProfileForm"
          :toggling-ids="togglingClientProfileIds"
          :resetting-ids="resettingClientProfileIds"
          :generation-testing-ids="generationTestingClientProfileIds"
          :generation-run-loading-ids="clientProfileGenerationRunLoadingIds"
          :generation-reports="clientProfileGenerationReports"
          :generation-runs="clientProfileGenerationRuns"
          :deleting-id="deletingClientProfileId"
          @create="openCreateClient"
          @edit="openEditClientProfile"
          @delete="deleteClientProfileItem"
          @toggle="toggleClientProfileItem"
          @copy-link="copyClientProfileLink"
          @reset-token="resetClientProfileTokenItem"
          @test-generation="testClientProfileGenerationItem"
          @toggle-generation-report="toggleClientProfileGenerationReport"
          @save="saveClientProfile"
          @close-modal="closeClientProfileModal"
          @toggle-binding="toggleClientProfileBinding"
          @move-binding="moveClientProfileBinding"
          @update-override="updateClientProfileOverride"
        />
      </section>
    </section>

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
import ConfirmDialog from './components/ConfirmDialog.vue';
import TemplateWorkspace from './components/TemplateWorkspace.vue';
import SubscriptionWorkspace from './components/SubscriptionWorkspace.vue';
import ClientProfileWorkspace from './components/ClientProfileWorkspace.vue';
import SettingsWorkspace from './components/SettingsWorkspace.vue';
import ToastHost from './components/ToastHost.vue';
import { getErrorMessage } from './api/errors';
import { useAdminSession } from './composables/useAdminSession';
import { useTemplateManager } from './composables/useTemplateManager';
import { useSubscriptionManager } from './composables/useSubscriptionManager';
import { useClientProfileManager } from './composables/useClientProfileManager';
import { useGenerationSettingsManager } from './composables/useGenerationSettingsManager';

type ToastType = 'success' | 'error' | 'info';

type NavItem = {
  id: string;
  label: string;
  icon: string;
  title: string;
  eyebrow: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { id: 'templates', label: '模板管理', icon: '◇', title: '模板管理', eyebrow: 'CONTROL / TEMPLATES' },
  { id: 'subscriptions', label: '订阅源', icon: '◎', title: '订阅源', eyebrow: 'CONTROL / SOURCES' },
  { id: 'clients', label: '客户端链接', icon: '◈', title: '客户端链接', eyebrow: 'CONTROL / CLIENTS' },
  { id: 'settings', label: '系统设置', icon: '⚙', title: '系统设置', eyebrow: 'CONTROL / SETTINGS' }
];

const toasts = ref<{ id: number; message: string; type: ToastType }[]>([]);
const currentPage = ref('templates');
const menuOpen = ref(false);
let toastId = 0;

const currentNav = computed(() => navItems.find((item) => item.id === currentPage.value) || navItems[0]);
const currentHero = computed(() => {
  if (currentPage.value === 'clients') {
    return {
      title: '客户端链接管理正在接入',
      description: '客户端链接现在可以独立维护，选择模板并绑定有序订阅源集合；公开地址保持稳定，只有手动重置 Token 后才变化。'
    };
  }
  if (currentPage.value === 'settings') {
    return {
      title: '生成参数已经可配置',
      description: '区域识别、节点清洗、订阅拉取和 urltest 参数集中维护，公开客户端链接会在生成时读取当前设置。'
    };
  }
  if (currentPage.value === 'subscriptions') {
    return {
      title: '订阅源管理已完成',
      description: '订阅源作为独立资源维护，支持安全存储、启停控制、区域授权和即时节点统计测试。'
    };
  }
  return {
    title: '模板版本管理已完成',
    description: '模板管理继续保留编辑、复制订阅、版本历史和恢复能力，为后续生成链路提供稳定模板底座。'
  };
});
const currentStats = computed(() => {
  if (currentPage.value === 'clients') {
    return [
      { label: '客户端链接', value: clientProfiles.value.length, note: `${enabledClientProfileCount.value} 个已启用` },
      { label: '模板总数', value: templates.value.length, note: '可绑定模板' },
      { label: '订阅源总数', value: subscriptions.value.length, note: '可绑定订阅源' },
      { label: '当前阶段', value: 'Stage 9', note: '系统设置迁移' }
    ];
  }
  if (currentPage.value === 'settings') {
    return [
      { label: '区域规则', value: settingsRegions.length, note: 'HK / TW / SG / JP / US' },
      { label: '拉取超时', value: `${generationSettings.value.fetch_timeout_ms}ms`, note: '订阅源请求限制' },
      { label: '最大响应', value: `${Math.round(generationSettings.value.max_subscription_bytes / 100000) / 10}MB`, note: '防止异常大响应' },
      { label: '当前阶段', value: 'Stage 9', note: '系统设置迁移' }
    ];
  }
  if (currentPage.value === 'subscriptions') {
    return [
      { label: '订阅源总数', value: subscriptions.value.length, note: `${enabledSubscriptionCount.value} 个已启用` },
      { label: '区域范围', value: regions.length, note: 'HK / TW / SG / JP / US' },
      { label: '测试状态', value: Object.keys(subscriptionReports.value).length, note: '已保留的即时测试结果' },
      { label: '当前阶段', value: 'Stage 9', note: '系统设置迁移' }
    ];
  }
  return [
    { label: '模板总数', value: templates.value.length, note: currentId.value ? '已选择当前模板' : '等待选择模板' },
    { label: '编辑状态', value: currentId.value ? (isDirty.value ? '未保存' : '已同步') : '-', note: currentId.value ? '当前模板变更状态' : '尚未进入编辑' },
    { label: 'JSON 校验', value: currentId.value ? (syntaxError.value ? '失败' : '通过') : '-', note: currentId.value ? 'Monaco 实时诊断' : '未开始校验' },
    { label: '当前阶段', value: 'Stage 9', note: '系统设置迁移' }
  ];
});

const showToast = (message: string, type: ToastType = 'info') => {
  const id = toastId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 3000);
};

const {
  password,
  authLoading,
  isAuthed,
  initializeSession,
  login,
  logout,
  handleAuthError
} = useAdminSession({
  notify: showToast,
  onLoginSuccess: async () => {
    try {
      await refreshList();
    } catch (error) {
      if (handleAuthError(error)) return;
      throw error;
    }
  },
  onLogout: () => {
    resetShellState();
  }
});

const handleRequestError = (error: unknown, fallback = '操作失败') => {
  if (handleAuthError(error)) return;
  showToast(getErrorMessage(error, fallback), 'error');
};

const templateManager = useTemplateManager({
  notify: showToast,
  handleRequestError,
  ensureAuthed: async () => {
    if (isAuthed.value) return true;
    showToast('请先登录', 'error');
    return false;
  }
});

const {
  templates,
  currentId,
  currentName,
  rawJson,
  loading,
  saving,
  syntaxError,
  templateVersions,
  versionsLoading,
  restoringVersionId,
  modal,
  isDirty,
  setSyntaxError,
  resetCurrentTemplate,
  refreshList,
  selectTemplate,
  save,
  openCreate,
  openClone,
  openDelete,
  closeModal,
  confirmModal,
  copyCurrentSubLink,
  restoreVersion
} = templateManager;

const subscriptionManager = useSubscriptionManager({
  notify: showToast,
  handleRequestError,
  ensureAuthed: async () => {
    if (isAuthed.value) return true;
    showToast('请先登录', 'error');
    return false;
  }
});

const {
  regions,
  subscriptions,
  loading: subscriptionsLoading,
  saving: subscriptionSaving,
  testingDraft: testingDraftSubscription,
  modalOpen: subscriptionModalOpen,
  form: subscriptionForm,
  draftReport: draftSubscriptionReport,
  reports: subscriptionReports,
  testingIds: testingSubscriptionIds,
  togglingIds: togglingSubscriptionIds,
  deletingId: deletingSubscriptionId,
  enabledCount: enabledSubscriptionCount,
  refreshList: refreshSubscriptionList,
  openCreate: openCreateSubscription,
  openEdit: openEditSubscription,
  closeModal: closeSubscriptionModal,
  save: saveSubscription,
  remove: deleteSubscriptionItem,
  toggle: toggleSubscriptionItem,
  testSaved: testSubscriptionItem,
  testDraft: testDraftSubscription,
  toggleReport: toggleSubscriptionReport
} = subscriptionManager;

const clientProfileManager = useClientProfileManager({
  notify: showToast,
  handleRequestError,
  ensureAuthed: async () => {
    if (isAuthed.value) return true;
    showToast('请先登录', 'error');
    return false;
  }
});

const {
  profiles: clientProfiles,
  loading: clientProfilesLoading,
  saving: clientProfileSaving,
  modalOpen: clientProfileModalOpen,
  form: clientProfileForm,
  togglingIds: togglingClientProfileIds,
  resettingIds: resettingClientProfileIds,
  generationTestingIds: generationTestingClientProfileIds,
  generationRunLoadingIds: clientProfileGenerationRunLoadingIds,
  generationReports: clientProfileGenerationReports,
  generationRuns: clientProfileGenerationRuns,
  deletingId: deletingClientProfileId,
  enabledCount: enabledClientProfileCount,
  refreshList: refreshClientProfileList,
  openEdit: openEditClientProfile,
  closeModal: closeClientProfileModal,
  save: saveClientProfile,
  remove: deleteClientProfileItem,
  toggle: toggleClientProfileItem,
  resetToken: resetClientProfileTokenItem,
  copyLink: copyClientProfileLink,
  testGeneration: testClientProfileGenerationItem,
  toggleGenerationReport: toggleClientProfileGenerationReport,
  toggleBinding: toggleClientProfileBinding,
  moveBinding: moveClientProfileBinding,
  updateOverride: updateClientProfileOverride
} = clientProfileManager;

const settingsManager = useGenerationSettingsManager({
  notify: showToast,
  handleRequestError,
  ensureAuthed: async () => {
    if (isAuthed.value) return true;
    showToast('请先登录', 'error');
    return false;
  }
});

const {
  regions: settingsRegions,
  loading: settingsLoading,
  saving: settingsSaving,
  settings: generationSettings,
  keywordText: generationKeywordText,
  refresh: refreshGenerationSettings,
  updateKeyword: updateGenerationKeyword,
  updateSetting: updateGenerationSetting,
  updateUrltest: updateGenerationUrltest,
  save: saveGenerationSettings
} = settingsManager;

const openCreateClient = async () => {
  if (!templates.value.length) await refreshList({ autoLoadFirst: false });
  if (!subscriptions.value.length) await refreshSubscriptionList();
  clientProfileManager.openCreate(templates.value, subscriptions.value);
};

const resetShellState = () => {
  templateManager.templates.value = [];
  subscriptionManager.reset();
  clientProfileManager.reset();
  settingsManager.reset();
  resetCurrentTemplate();
  currentPage.value = 'templates';
  menuOpen.value = false;
};

const logoutWithNotice = () => {
  logout({ message: '已退出登录', type: 'info' });
};

const selectPage = async (id: string, disabled = false) => {
  if (disabled) {
    showToast('该模块将在后续阶段逐步迁移', 'info');
    return;
  }
  currentPage.value = id;
  menuOpen.value = false;
  if ((id === 'subscriptions' || id === 'clients') && !subscriptions.value.length) {
    await refreshSubscriptionList();
  }
  if (id === 'clients' && !clientProfiles.value.length) {
    await refreshClientProfileList();
  }
  if (id === 'settings') {
    await refreshGenerationSettings();
  }
};

const copyCurrentLink = async () => {
  await copyCurrentSubLink();
};

const updateCurrentName = (value: string) => {
  currentName.value = value;
};

const updateRawJson = (value: string) => {
  rawJson.value = value;
};

onMounted(async () => {
  initializeSession();
  if (!isAuthed.value) return;
  await refreshList().catch((error) => handleRequestError(error, '初始化失败'));
});
</script>

<style>
:root {
  color-scheme: dark;
  --bg: #080d14;
  --surface: #0e1621;
  --panel: #121d2a;
  --line: #223044;
  --text: #ecf4ff;
  --muted: #8190a5;
  --cyan: #46d9d1;
  --red: #ff6876;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at 70% -20%, #14334a 0, transparent 35%), var(--bg);
  color: var(--text);
  font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.eyebrow {
  margin: 0;
  color: var(--cyan);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid #4ce1d788;
  border-radius: 16px;
  background: #143039;
  color: var(--cyan);
  font-weight: 900;
  box-shadow: 0 0 40px #3cd8d522;
}

.brand-mark.small {
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: 8vw;
  padding: 8vw;
}

.auth-copy {
  max-width: 660px;
}

.auth-copy h1 {
  margin: 24px 0;
  font-size: clamp(42px, 6vw, 82px);
  line-height: 1.02;
}

.auth-copy h1 span {
  color: var(--cyan);
}

.auth-copy > p:last-child {
  max-width: 540px;
  color: var(--muted);
  font-size: 17px;
}

.auth-card {
  width: min(430px, 100%);
  padding: 36px;
  background: #101925e8;
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: 0 30px 80px #0008;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #080d14;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 28px;
}

.auth-tabs button {
  border: 0;
  border-radius: 9px;
  padding: 10px;
  background: transparent;
  color: var(--muted);
}

.auth-tabs button.active {
  background: var(--panel);
  color: var(--text);
}

.auth-tabs button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

label {
  display: grid;
  gap: 7px;
  color: #aab8c9;
  font-weight: 600;
  margin: 16px 0;
}

.input,
.title-input,
.modal input,
.modal textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0a111b;
  color: var(--text);
  padding: 11px 13px;
  outline: none;
}

.input:focus,
.title-input:focus,
.modal input:focus,
.modal textarea:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px #46d9d11a;
}

.title-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.primary,
.ghost,
.danger,
.mini {
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 9px 12px;
}

.primary {
  background: linear-gradient(135deg, var(--cyan), #41aee9) !important;
  color: #052027 !important;
  font-weight: 800;
  border: 0 !important;
}

.ghost,
.mini {
  background: #172334;
  color: #bdd0e5;
}

.danger,
.danger-mini {
  color: #ff9aa3 !important;
  border-color: #6c3038 !important;
  background: #27151a;
}

.wide {
  width: 100%;
  padding: 12px;
}

.form-note,
.muted {
  color: var(--muted);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
}

aside {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 22px 16px;
  border-right: 1px solid var(--line);
  background: #0a111aee;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 6px 24px;
}

.sidebar-brand strong,
.sidebar-brand span {
  display: block;
}

.sidebar-brand span {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.12em;
}

nav {
  display: grid;
  gap: 4px;
}

nav button {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #91a0b4;
  padding: 11px 13px;
  text-align: left;
}

nav button:hover,
nav button.active {
  color: var(--text);
  background: #152131;
}

nav button.active {
  box-shadow: inset 3px 0 var(--cyan);
}

nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sidebar-user {
  margin-top: auto;
  border-top: 1px solid var(--line);
  padding: 18px 6px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-user .avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #19364a;
  color: var(--cyan);
  font-weight: 800;
}

.sidebar-user div {
  flex: 1;
}

.sidebar-user strong,
.sidebar-user small {
  display: block;
}

.sidebar-user small {
  color: var(--muted);
}

.sidebar-user button {
  border: 0;
  background: transparent;
  color: var(--muted);
}

.workspace {
  min-width: 0;
  height: 100vh;
  display: grid;
  grid-template-rows: 88px minmax(0, 1fr);
}

.workspace > header {
  height: 88px;
  padding: 0 34px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--line);
  background: #080d14aa;
  backdrop-filter: blur(15px);
  position: sticky;
  top: 0;
  z-index: 5;
}

.workspace > header h2 {
  margin: 2px 0;
  font-size: 20px;
}

.status-dot {
  margin-left: auto;
  color: #63d58b;
  font-size: 12px;
}

.menu {
  display: none;
}

.content {
  padding: 28px 34px;
  display: grid;
  gap: 20px;
  overflow: auto;
}

.split {
  grid-template-columns: minmax(300px, 400px) minmax(0, 1fr);
  min-height: 0;
}

.workspace-grid {
  display: grid;
  gap: 20px;
}

.hero {
  padding: 32px;
  border: 1px solid #286079;
  background: linear-gradient(120deg, #102738, #101a26);
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.hero h3 {
  font-size: 28px;
  margin: 8px 0;
}

.hero p:last-child {
  color: var(--muted);
  margin: 0;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-grid article,
.panel {
  background: linear-gradient(145deg, #111c29, #0e1722);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
}

.stat-grid span,
.stat-grid small {
  display: block;
  color: var(--muted);
}

.stat-grid strong {
  display: block;
  font-size: 26px;
  margin: 8px 0;
  text-transform: capitalize;
}

.panel {
  min-height: 0;
}

.panel-list {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
}

.panel-editor {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-head h3 {
  margin: 0;
  font-size: 17px;
}

.panel-head--editor {
  align-items: flex-start;
}

.editor-heading {
  min-width: 0;
}

.template-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;
}

.status-pill {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  padding: 5px 8px;
  border: 1px solid transparent;
}

.status-pill.success {
  background: rgba(22, 101, 52, 0.34);
  border-color: #22c55e;
  color: #bbf7d0;
}

.status-pill.error {
  background: rgba(127, 29, 29, 0.48);
  border-color: #ef4444;
  color: #fecaca;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.name-field {
  margin-top: 0;
}

.editor-wrap {
  position: relative;
  min-height: 520px;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: #08111b;
}

.editor,
.center,
.overlay {
  position: absolute;
  inset: 0;
}

.center,
.overlay {
  display: grid;
  place-items: center;
  color: var(--muted);
  background: rgba(8, 17, 27, 0.92);
  z-index: 2;
}

.sidebar__list {
  display: grid;
  gap: 12px;
  min-height: 0;
  align-content: start;
}

.template-item {
  width: 100%;
  text-align: left;
  padding: 12px;
  border: 1px solid #243041;
  background: #0b131e;
  border-radius: 10px;
  color: inherit;
  cursor: pointer;
}

.template-item.active {
  border-color: var(--cyan);
  background: #12303b;
}

.template-item__row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.template-item__name {
  font-size: 14px;
}

.template-item__id {
  font-size: 12px;
  color: var(--muted);
}

.template-item__ops {
  display: flex;
  gap: 6px;
}

.mini {
  padding: 6px 8px;
  font-size: 12px;
}

.empty {
  text-align: center;
  color: var(--muted);
  padding: 35px 0;
}

.version-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
  display: grid;
  gap: 12px;
}

.version-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-section__head h4 {
  margin: 4px 0 0;
  font-size: 14px;
}

.version-list {
  display: grid;
  gap: 10px;
}

.version-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0b131e;
}

.version-item__meta {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.version-item__meta code {
  color: var(--muted);
  word-break: break-all;
}

.version-item__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #000a;
}

.modal {
  width: min(520px, 100%);
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #101925;
  display: grid;
  gap: 16px;
}

.modal h3 {
  margin: 0;
}



.settings-page {
  display: grid;
  gap: 18px;
}

.settings-grid {
  display: grid;
  gap: 16px;
}

.settings-section {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0b131e;
}

.section-title h4 {
  margin: 4px 0 0;
}

.region-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.region-settings label,
.settings-form label {
  display: grid;
  gap: 8px;
}

.region-settings span,
.settings-form span {
  color: var(--muted);
  font-size: 13px;
}

.region-settings textarea,
.settings-form input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #08111b;
  color: var(--text);
  padding: 10px 12px;
  outline: none;
}

.region-settings textarea {
  resize: vertical;
  min-height: 96px;
}

.settings-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.settings-form.compact {
  grid-template-columns: minmax(240px, 1fr) repeat(2, minmax(120px, 180px));
}

.client-page {
  display: grid;
  gap: 20px;
}

.client-list {
  display: grid;
  gap: 14px;
}

.client-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0b131e;
}

.client-main {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.client-main code {
  color: var(--muted);
  word-break: break-all;
}

.bound-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bound-list span {
  border: 1px solid #2c3c52;
  border-radius: 999px;
  padding: 4px 8px;
  color: #bdd0e5;
  background: #101b2b;
  font-size: 12px;
}


.generation-report {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #315c48;
  border-radius: 12px;
  background: #10231c;
}

.generation-report.error {
  border-color: #6c3038;
  background: #27151a;
}

.generation-steps {
  display: grid;
  gap: 8px;
}

.generation-steps article {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0b131e;
}

.generation-steps article.success {
  border-color: #315c48;
}

.generation-steps article.warning {
  border-color: #7a5a20;
}

.generation-steps article.error {
  border-color: #6c3038;
}


.run-history {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

.run-list {
  display: grid;
  gap: 8px;
}

.run-list article {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.32);
}

.run-list article.success {
  border-color: rgba(34, 197, 94, 0.35);
}

.run-list article.fallback {
  border-color: rgba(245, 158, 11, 0.4);
}

.run-list article.error {
  border-color: rgba(248, 113, 113, 0.4);
}

.run-list span {
  font-weight: 700;
}

.run-list em {
  width: fit-content;
  color: #fbbf24;
  font-style: normal;
  font-size: 12px;
}

.run-list p {
  margin: 0;
  color: #fecaca;
  font-size: 12px;
}

.client-modal {
  width: min(760px, 100%);
  max-height: min(86vh, 860px);
  overflow: auto;
}

.client-modal select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0a111b;
  color: var(--text);
  padding: 11px 13px;
  outline: none;
}

.binding-picker {
  display: grid;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  background: #0b131e;
}

.binding-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.binding-head h4 {
  margin: 4px 0 0;
}

.binding-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px;
  border: 1px solid #243041;
  border-radius: 10px;
  background: #08111b;
}

.binding-row.active {
  border-color: #2f8a90;
  background: #102331;
}

.binding-row textarea {
  grid-column: 1 / -1;
  min-height: 76px;
  resize: vertical;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0a111b;
  color: var(--text);
  padding: 10px 12px;
  outline: none;
}

.binding-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.compact-empty {
  padding: 16px 0;
}

.subscription-page {
  display: grid;
  gap: 20px;
}

.source-list {
  display: grid;
  gap: 14px;
}

.source-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0b131e;
}

.source-main,
.source-actions {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.source-main code {
  color: var(--muted);
  word-break: break-all;
}

.source-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.source-title i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #64748b;
}

.source-title i.on {
  background: #63d58b;
  box-shadow: 0 0 16px #63d58b88;
}

.badge {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--muted);
  font-size: 12px;
}

.badge.active {
  border-color: #22c55e;
  color: #bbf7d0;
  background: rgba(22, 101, 52, 0.34);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips span {
  border: 1px solid #2c3c52;
  border-radius: 999px;
  padding: 4px 8px;
  color: #bdd0e5;
  background: #142033;
  font-size: 12px;
}

.inline-switch {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.switch {
  width: 44px;
  height: 24px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px;
  background: #1d2939;
}

.switch i {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #94a3b8;
  transition: transform 0.18s ease, background 0.18s ease;
}

.switch.on {
  border-color: #22c55e;
  background: #14532d;
}

.switch.on i {
  transform: translateX(18px);
  background: #bbf7d0;
}

.subscription-modal fieldset {
  margin: 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.subscription-modal legend {
  color: #aab8c9;
  font-weight: 700;
  padding: 0 6px;
}

.check-row {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-row input {
  width: auto;
}

.test-report {
  grid-column: 1 / -1;
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #315c48;
  border-radius: 12px;
  background: #10231c;
  color: #d7fbe5;
}

.test-report.error {
  border-color: #6c3038;
  background: #27151a;
  color: #fecaca;
}

.report-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.report-heading small,
.test-report small {
  color: var(--muted);
}

.modal-body,
.modal-actions {
  display: grid;
  gap: 12px;
}

.modal-actions {
  grid-template-columns: 1fr 1fr;
}

.toast-stack {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  gap: 8px;
  z-index: 40;
}

.toast {
  padding: 10px 14px;
  border-radius: 999px;
  background: #173126;
  color: #fff;
  border: 1px solid #3c765c;
}

.toast.success {
  background: #14532d;
  border-color: #1e7a43;
}

.toast.error {
  background: #3b1c25;
  border-color: #7a3745;
}

.toast.info {
  background: #163249;
  border-color: #305f87;
}

@media (max-width: 1180px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .auth-shell {
    grid-template-columns: 1fr;
    padding: 28px;
  }

  .auth-copy {
    display: none;
  }

  .app-shell {
    display: block;
  }

  aside {
    position: fixed;
    left: -270px;
    z-index: 20;
    width: 248px;
    transition: 0.2s;
  }

  aside.open {
    left: 0;
    box-shadow: 20px 0 60px #000;
  }

  .workspace {
    height: 100vh;
  }

  .workspace > header {
    height: 72px;
    padding: 0 18px;
  }

  .menu {
    display: block;
    margin-right: 12px;
    border: 0;
    background: transparent;
    color: white;
    font-size: 20px;
  }

  .content {
    padding: 18px;
  }

  .status-dot {
    display: none;
  }

  .hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .source-card,
  .client-card {
    grid-template-columns: 1fr;
  }

  .binding-row {
    grid-template-columns: 1fr;
  }

  .source-actions,
  .inline-switch {
    justify-content: flex-start;
  }
}

@media (max-width: 430px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .auth-card {
    padding: 24px;
  }

  .modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
