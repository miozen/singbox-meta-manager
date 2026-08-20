<template>
  <section class="client-page">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>客户端链接</h3>
        </div>
        <button class="primary" @click="$emit('create')">新建链接</button>
      </div>

      <div v-if="loading" class="empty">客户端链接加载中...</div>
      <div v-else-if="!profiles.length" class="empty">尚未创建客户端链接</div>
      <div v-else class="client-list">
        <article v-for="profile in profiles" :key="profile.id" class="client-card">
          <div class="client-main">
            <div class="source-title">
              <i :class="{ on: profile.enabled }"></i>
              <strong>{{ profile.name }}</strong>
              <span class="badge" :class="{ active: profile.enabled }">{{ profile.enabled ? '已启用' : '已停用' }}</span>
            </div>
            <code>{{ origin }}/sub/client/{{ profile.public_token }}</code>
            <div class="chips">
              <span>模板 {{ profile.template_name || profile.template_id }}</span>
              <span>{{ profile.subscriptions.length }} 个订阅源</span>
            </div>
            <div class="bound-list" v-if="profile.subscriptions.length">
              <span v-for="binding in profile.subscriptions" :key="binding.subscription_id">
                {{ binding.position + 1 }}. {{ binding.subscription_name }}
              </span>
            </div>
          </div>

          <div class="source-actions">
            <label class="inline-switch">
              <span>{{ profile.enabled ? '启用' : '停用' }}</span>
              <button
                type="button"
                class="switch"
                :class="{ on: profile.enabled }"
                :disabled="Boolean(togglingIds[profile.id])"
                @click.prevent="$emit('toggle', profile)"
              >
                <i></i>
              </button>
            </label>
            <div class="actions">
              <button class="ghost" @click="$emit('copy-link', profile)">复制地址</button>
              <button class="ghost" :disabled="Boolean(generationTestingIds[profile.id])" @click="$emit('test-generation', profile)">
                {{ generationTestingIds[profile.id] ? '生成中...' : '测试生成' }}
              </button>
              <button v-if="generationReports[profile.id]" class="ghost" @click="$emit('toggle-generation-report', profile)">
                {{ generationReports[profile.id].expanded ? '收起' : '报告' }}
              </button>
              <button class="ghost" :disabled="Boolean(resettingIds[profile.id])" @click="$emit('reset-token', profile)">
                {{ resettingIds[profile.id] ? '重置中...' : '重置' }}
              </button>
              <button class="ghost" @click="$emit('edit', profile)">编辑</button>
              <button class="danger" :disabled="deletingId === profile.id" @click="$emit('delete', profile)">
                {{ deletingId === profile.id ? '删除中...' : '删除' }}
              </button>
            </div>
          </div>

          <div v-if="generationReports[profile.id]?.expanded" class="generation-report" :class="{ error: !generationReports[profile.id].success }">
            <div class="report-heading">
              <strong>{{ generationReports[profile.id].success ? '生成成功' : '生成失败' }}</strong>
              <small>{{ generationReports[profile.id].tested_at }}</small>
            </div>
            <div class="chips">
              <span v-for="item in summaryItems(generationReports[profile.id].summary)" :key="item.key">{{ item.key }} {{ item.value }}</span>
            </div>
            <div class="generation-steps">
              <article v-for="step in generationReports[profile.id].steps" :key="step.name" :class="step.status">
                <strong>{{ step.name }}</strong>
                <span>{{ step.message }}</span>
              </article>
            </div>
            <p v-if="generationReports[profile.id].error">{{ generationReports[profile.id].error }}</p>
            <div class="run-history">
              <div class="report-heading">
                <strong>最近生成记录</strong>
                <small v-if="generationRunLoadingIds[profile.id]">加载中...</small>
              </div>
              <div v-if="generationRuns[profile.id]?.length" class="run-list">
                <article v-for="run in generationRuns[profile.id]" :key="run.id" :class="run.status">
                  <span>{{ runStatusLabel(run.status) }}</span>
                  <small>{{ run.trigger_type }} / {{ run.duration_ms }}ms / {{ run.created_at || '-' }}</small>
                  <em v-if="run.used_cache">使用缓存</em>
                  <p v-if="run.error">{{ run.error }}</p>
                </article>
              </div>
              <p v-else class="muted">暂无生成记录</p>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="$emit('close-modal')">
      <form class="modal client-modal" @submit.prevent="$emit('save')">
        <div class="panel-head">
          <h3>{{ form.id ? '编辑客户端链接' : '新建客户端链接' }}</h3>
          <button type="button" class="ghost" @click="$emit('close-modal')">关闭</button>
        </div>

        <label>
          <span>名称</span>
          <input v-model.trim="form.name" maxlength="80" placeholder="软路由主链接" />
        </label>

        <label>
          <span>模板</span>
          <select v-model="form.template_id" class="input">
            <option value="" disabled>请选择模板</option>
            <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }} / {{ tpl.id }}</option>
          </select>
        </label>

        <label class="check-row">
          <input v-model="form.enabled" type="checkbox" />
          <span>启用该客户端链接</span>
        </label>

        <section class="binding-picker">
          <div class="binding-head">
            <div>
              <h4>订阅源绑定</h4>
            </div>
            <span class="muted">{{ form.subscriptions.length }} / {{ subscriptions.length }}</span>
          </div>

          <div v-if="!subscriptions.length" class="empty compact-empty">请先在订阅源页面添加订阅源</div>
          <article v-for="sub in orderedSubscriptions" :key="sub.id" class="binding-row" :class="{ active: isBound(sub.id) }">
            <label class="check-row">
              <input type="checkbox" :checked="isBound(sub.id)" @change="$emit('toggle-binding', sub.id)" />
              <span>{{ sub.name }}</span>
            </label>
          </article>
        </section>

        <div class="modal-actions">
          <button type="button" class="ghost" @click="$emit('close-modal')">取消</button>
          <button class="primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ClientProfileRecord, GenerationRunRecord, GenerationTestResult, SubscriptionRecord, TemplateListItem } from '@shared/types';

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

const props = defineProps<{
  profiles: ClientProfileRecord[];
  templates: TemplateListItem[];
  subscriptions: SubscriptionRecord[];
  loading: boolean;
  saving: boolean;
  modalOpen: boolean;
  form: ClientProfileForm;
  togglingIds: Record<string, boolean>;
  resettingIds: Record<string, boolean>;
  generationTestingIds: Record<string, boolean>;
  generationRunLoadingIds: Record<string, boolean>;
  generationReports: Record<string, GenerationTestResult & { tested_at: string; expanded: boolean }>;
  generationRuns: Record<string, GenerationRunRecord[]>;
  deletingId: string;
}>();

const emit = defineEmits<{
  create: [];
  edit: [profile: ClientProfileRecord];
  delete: [profile: ClientProfileRecord];
  toggle: [profile: ClientProfileRecord];
  'copy-link': [profile: ClientProfileRecord];
  'reset-token': [profile: ClientProfileRecord];
  'test-generation': [profile: ClientProfileRecord];
  'toggle-generation-report': [profile: ClientProfileRecord];
  save: [];
  'close-modal': [];
  'toggle-binding': [subscriptionId: string];
  'move-binding': [subscriptionId: string, offset: -1 | 1];
}>();

const origin = window.location.origin;
const orderedSubscriptions = computed(() => {
  const order = new Map(props.form.subscriptions.map((binding, index) => [binding.subscription_id, index]));
  return [...props.subscriptions].sort((a, b) => {
    const aOrder = order.has(a.id) ? order.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const bOrder = order.has(b.id) ? order.get(b.id)! : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
});

function summaryItems(summary: Record<string, unknown>) {
  return Object.entries(summary)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({ key, value }));
}

function runStatusLabel(status: GenerationRunRecord['status']) {
  if (status === 'success') return '成功';
  if (status === 'fallback') return '回退';
  return '失败';
}


function isBound(subscriptionId: string) {
  return props.form.subscriptions.some((binding) => binding.subscription_id === subscriptionId);
}

</script>