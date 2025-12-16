<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { useRouter } from 'vue-router'

const router = useRouter()
const viewer = ref(null)

const goToHome = () => {
  if (localStorage.getItem('account') === 'admin') {
    router.push('/home')
  } else {
    router.push('/login')
  }
}

onMounted(() => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'

  viewer.value = new Cesium.Viewer('cesiumContainer', {
    // 只保留 Cesium 默认交互即可；如果你想隐藏时间轴/动画就改成 false
    animation: true,
    timeline: true,

    // 避免默认 credit UI 占位（你用自定义容器并隐藏它）
    creditContainer: 'creditContainer',
  })
})

onBeforeUnmount(() => {
  // 防止热更新/页面切换导致 WebGL 资源泄漏
  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.destroy()
  }
})
</script>

<template>
  <div class="page">
    <div id="cesiumContainer"></div>
    <div id="creditContainer" class="hidden-credit"></div>

    <button class="admin-button" @click="goToHome">访问后台</button>
  </div>
</template>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
}

#cesiumContainer {
  width: 100%;
  height: 100%;
}

.hidden-credit {
  display: none;
}

.admin-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 410;
  height: 32px;
  padding: 0 12px;
  background-color: #4a86c5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.admin-button:hover {
  background-color: #007bff;
}
</style>
