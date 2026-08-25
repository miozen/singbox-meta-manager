<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal qr-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-qr-title">
      <div class="panel-head">
        <div>
          <h3 id="subscription-qr-title">客户端订阅二维码</h3>
          <p class="muted">{{ name }}</p>
        </div>
        <button type="button" class="ghost" @click="$emit('close')">关闭</button>
      </div>

      <div class="qr-preview">
        <img v-if="imageUrl" :src="imageUrl" :alt="`${name} 的客户端订阅二维码`" />
        <span v-else>二维码生成中...</span>
      </div>
      <code>{{ value }}</code>
      <p class="muted">二维码仅包含此客户端订阅地址；请妥善保管，重置 token 后旧二维码将失效。</p>

      <div class="modal-actions">
        <button type="button" class="ghost" @click="copyLink">复制地址</button>
        <button type="button" class="primary" @click="$emit('close')">完成</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import qrcode from 'qrcode-generator';
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  name: string;
  value: string;
}>();

defineEmits<{ close: [] }>();

const imageUrl = ref('');

watch(
  () => [props.open, props.value] as const,
  async ([open, value]) => {
    if (!open || !value) {
      imageUrl.value = '';
      return;
    }
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    imageUrl.value = qr.createDataURL(6, 2);
  },
  { immediate: true }
);

async function copyLink() {
  await navigator.clipboard.writeText(props.value);
}
</script>
