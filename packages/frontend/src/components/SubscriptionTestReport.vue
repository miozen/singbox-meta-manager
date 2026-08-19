<template>
  <div class="test-report" :class="{ error: !report.success }">
    <template v-if="report.success">
      <div class="report-heading">
        <strong>{{ report.name }}</strong>
        <small v-if="testedAt">{{ testedAt }}</small>
      </div>
      <span>耗时 {{ report.duration_ms }} ms</span>
      <span>原始节点 {{ report.raw_nodes }} / 有效节点 {{ report.valid_nodes }}</span>
      <div class="chips">
        <span v-for="region in regions" :key="region">{{ region }} {{ report.regions?.[region] || 0 }}</span>
        <span>未匹配 {{ report.regions?.unmatched || 0 }}</span>
      </div>
      <p v-for="warning in report.warnings" :key="warning">{{ warning }}</p>
    </template>
    <template v-else>
      <strong>测试失败</strong>
      <span>{{ report.error }}</span>
      <small v-if="testedAt">{{ testedAt }}</small>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { RegionCode, SubscriptionTestReport } from '@shared/types';

defineProps<{
  report: SubscriptionTestReport;
  regions: RegionCode[];
  testedAt?: string;
}>();
</script>
