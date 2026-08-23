<template>
  <section class="settings-page">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>系统设置</h3>
        </div>
        <button class="primary" :disabled="saving || loading" @click="$emit('save')">{{ saving ? '保存中...' : '保存设置' }}</button>
      </div>

      <div v-if="loading" class="empty">系统设置加载中...</div>
      <div v-else class="settings-grid">
        <section class="settings-section">
          <div class="section-title">
            <h4>区域识别关键字</h4>
          </div>
          <div class="region-settings">
            <label v-for="region in regions" :key="region">
              <span>{{ region }}</span>
              <textarea :value="keywordText[region]" rows="4" spellcheck="false" @input="emitText('update-keyword', region, $event)"></textarea>
            </label>
          </div>
        </section>

        <section class="settings-section">
          <div class="section-title">
            <h4>订阅拉取与清洗</h4>
          </div>
          <div class="settings-form">
            <label>
              <span>过滤正则</span>
              <input :value="settings.banned_pattern" @input="emitText('update-setting', 'banned_pattern', $event)" />
            </label>
            <label>
              <span>User-Agent</span>
              <input :value="settings.subscription_user_agent" @input="emitText('update-setting', 'subscription_user_agent', $event)" />
            </label>
            <label>
              <span>拉取超时 ms</span>
              <input :value="settings.fetch_timeout_ms" type="number" min="1000" max="60000" step="1000" @input="emitNumber('update-setting', 'fetch_timeout_ms', $event)" />
            </label>
            <label>
              <span>最大响应字节</span>
              <input :value="settings.max_subscription_bytes" type="number" min="100000" max="20000000" step="100000" @input="emitNumber('update-setting', 'max_subscription_bytes', $event)" />
            </label>
          </div>
        </section>

        <section class="settings-section">
          <div class="section-title">
            <h4>测速分组参数</h4>
          </div>
          <div class="settings-form compact">
            <label>
              <span>测速 URL</span>
              <input :value="settings.urltest.url" @input="emitText('update-urltest', 'url', $event)" />
            </label>
            <label>
              <span>间隔</span>
              <input :value="settings.urltest.interval" @input="emitText('update-urltest', 'interval', $event)" />
            </label>
            <label>
              <span>容差</span>
              <input :value="settings.urltest.tolerance" type="number" min="0" max="5000" step="10" @input="emitNumber('update-urltest', 'tolerance', $event)" />
            </label>
          </div>
        </section>

        <section class="settings-section">
          <div class="section-title">
            <h4>DNS 专用节点组</h4>
            <p class="muted">固定 tag：📡 dns-out。启用后，模板中 detour 为“🗽 节点选择”的 DNS server 会改走此组。</p>
          </div>
          <div class="settings-form">
            <label class="check-row">
              <input :checked="settings.dns_urltest.enabled" type="checkbox" @change="emitDnsEnabled" />
              <span>启用 DNS 专用节点组</span>
            </label>
            <label>
              <span>节点筛选关键词</span>
              <textarea :value="dnsKeywordText" rows="4" spellcheck="false" @input="emitDnsKeywords"></textarea>
            </label>
            <label>
              <span>测速 URL</span>
              <input :value="settings.dns_urltest.url" @input="emitDnsText('url', $event)" />
            </label>
            <label>
              <span>间隔</span>
              <input :value="settings.dns_urltest.interval" @input="emitDnsText('interval', $event)" />
            </label>
            <label>
              <span>容差</span>
              <input :value="settings.dns_urltest.tolerance" type="number" min="0" max="5000" step="10" @input="emitDnsNumber('tolerance', $event)" />
            </label>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GenerationSettings, RegionCode } from '@shared/types';

defineProps<{
  regions: RegionCode[];
  loading: boolean;
  saving: boolean;
  settings: GenerationSettings & { updated_at?: string | null };
  keywordText: Record<RegionCode, string>;
  dnsKeywordText: string;
}>();

const emit = defineEmits<{
  save: [];
  'update-keyword': [region: RegionCode, value: string];
  'update-setting': [key: 'banned_pattern' | 'subscription_user_agent' | 'fetch_timeout_ms' | 'max_subscription_bytes', value: string | number];
  'update-urltest': [key: 'url' | 'interval' | 'tolerance', value: string | number];
  'update-dns-urltest': [key: 'enabled' | 'url' | 'interval' | 'tolerance', value: boolean | string | number];
  'update-dns-keyword': [value: string];
}>();

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement)?.value || '';
}

function emitText(eventName: 'update-keyword' | 'update-setting' | 'update-urltest', key: string, event: Event) {
  const value = inputValue(event);
  if (eventName === 'update-keyword') emit('update-keyword', key as RegionCode, value);
  else if (eventName === 'update-setting') emit('update-setting', key as 'banned_pattern' | 'subscription_user_agent', value);
  else emit('update-urltest', key as 'url' | 'interval', value);
}

function emitNumber(eventName: 'update-setting' | 'update-urltest', key: string, event: Event) {
  const value = Number(inputValue(event));
  if (eventName === 'update-setting') emit('update-setting', key as 'fetch_timeout_ms' | 'max_subscription_bytes', value);
  else emit('update-urltest', key as 'tolerance', value);
}

function emitDnsEnabled(event: Event) {
  emit('update-dns-urltest', 'enabled', (event.target as HTMLInputElement).checked);
}

function emitDnsKeywords(event: Event) {
  emit('update-dns-keyword', inputValue(event));
}

function emitDnsText(key: 'url' | 'interval', event: Event) {
  emit('update-dns-urltest', key, inputValue(event));
}

function emitDnsNumber(key: 'tolerance', event: Event) {
  emit('update-dns-urltest', key, Number(inputValue(event)));
}
</script>
