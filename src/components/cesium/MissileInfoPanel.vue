<template>
  <div v-if="info?.visible" class="missile-info">
    <div class="missile-info-title">已选中：{{ info.id }}</div>
    <div class="missile-info-row">经度：{{ info.lon }}</div>
    <div class="missile-info-row">纬度：{{ info.lat }}</div>
    <div class="missile-info-row">高度：{{ info.alt }} m</div>
    <button class="missile-info-close" @click="$emit('close')">关闭</button>
  </div>
</template>

<script setup>
defineProps({
  info: { type: Object, required: true }
})
defineEmits(['close'])
</script>
