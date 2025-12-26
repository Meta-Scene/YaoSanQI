<template>
  <div class="top-right-actions">
    <button class="action-button" @click="$emit('go-admin')">访问后台</button>
    <button class="action-button" @click="$emit('open-sim')">仿真进程</button>
  </div>
</template>

<script setup>
defineEmits(['go-admin','open-sim'])
</script>
