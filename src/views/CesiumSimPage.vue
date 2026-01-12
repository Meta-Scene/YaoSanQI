<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { useRouter } from 'vue-router'
import { getAuth, clearAuth } from '@/utils/auth'

import TopActions from '@/components/cesium/TopActions.vue'
import MissileInfoPanel from '@/components/cesium/MissileInfoPanel.vue'
import SimModal from '@/components/cesium/SimModal.vue'

import { useSimForm } from '@/composables/cesium/useSimForm'
import { useCesiumViewer } from '@/composables/cesium/useCesiumViewer'
import { useMissiles } from '@/composables/cesium/useMissiles'
import { usePicking } from '@/composables/cesium/usePicking'

const router = useRouter()

/* ========= 表单 ========= */
const { options, simForm } = useSimForm()

/* ========= Cesium Viewer ========= */
const { viewer, initViewer, destroyViewer } = useCesiumViewer()

/* ========= 导弹逻辑 ========= */
const {
  selectedInfo,
  hideSelectedInfo,
  createMissile,
  bindMissilePathRecorder,
  cleanupMissiles,
} = useMissiles(viewer, simForm)

/* ========= 拾取逻辑 ========= */
const {
  pickMode,
  startPick,
  bindPickToShowRealtime,
  destroyPickHandler,
} = usePicking(viewer, simForm, selectedInfo, hideSelectedInfo)

/* ========= 顶部按钮 ========= */
const goToAdmin = () => {
  const auth = getAuth()
  if (!auth?.token) return router.push('/login')
  if (auth.role === 'admin') return router.push('/home')
  alert('仅管理员可访问后台')
}

const logout = () => {
  clearAuth()
  router.replace('/login')
}

/* ========= 仿真弹窗 ========= */
const showSimModal = ref(false)
const openSimModal = () => (showSimModal.value = true)
const closeSimModal = () => (showSimModal.value = false)

const runSimulation = () => {
  if (!simForm.target.type) return alert('请选择目标类型')
  if (simForm.target.launchLon === '' || simForm.target.launchLat === '')
    return alert('请填写发射点经纬度')
  if (simForm.target.impactLon === '' || simForm.target.impactLat === '')
    return alert('请填写落点经纬度')
  if (
    !simForm.other.trajectory ||
    !simForm.other.prototypeType ||
    !simForm.other.atmosphere ||
    !simForm.other.aerosol
  ) {
    alert('请在“其他参数”页完成所有选择')
    return
  }

  createMissile()
  closeSimModal()
}

/* ========= 生命周期 ========= */
onMounted(() => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'

  initViewer('cesiumContainer', {
    animation: true,
    timeline: true,
    creditContainer: 'creditContainer',
  })

  bindPickToShowRealtime()
  bindMissilePathRecorder()
})

onBeforeUnmount(() => {
  hideSelectedInfo()
  destroyPickHandler()
  cleanupMissiles()
  destroyViewer()
})
</script>

<template>
  <div class="page">
    <div id="cesiumContainer"></div>
    <div id="creditContainer" class="hidden-credit"></div>

    <!-- ✅ 顶部操作区（完全匹配你的 TopActions.vue） -->
    <div class="top-right-actions">
      <TopActions
        @go-admin="goToAdmin"
        @open-sim="openSimModal"
      />
    </div>

    <!-- 登出按钮 -->
    <div class="top-right-logout">
      <button class="action-button danger" @click="logout">登出</button>
    </div>

    <!-- 导弹信息面板 -->
    <MissileInfoPanel
      :info="selectedInfo"
      @close="hideSelectedInfo"
    />

    <!-- 仿真弹窗 -->
    <SimModal
      :visible="showSimModal"
      :form="simForm"
      :options="options"
      @close="closeSimModal"
      @pickLaunch="startPick('launch')"
      @pickImpact="startPick('impact')"
      @run="runSimulation"
    />
  </div>
</template>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

#cesiumContainer {
  width: 100%;
  height: 100%;
}

.hidden-credit {
  display: none;
}

/* ✅ TopActions 定位（与你旧页面一致） */
.top-right-actions {
  position: absolute;
  top: 1vh;
  right: 14vw;
  z-index: 410;
  display: flex;
  gap: 0.8vw;
}

/* 通用按钮样式 */
.action-button {
  height: 3.2vh;
  min-height: 32px;
  padding: 0 1vw;
  background-color: #4a86c5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}
.action-button:hover {
  background-color: #007bff;
}

/* 登出危险按钮 */
.action-button.danger {
  background-color: #ff4d4f;
}
.action-button.danger:hover {
  background-color: #ff7875;
}

/* 登出按钮位置 */
.top-right-logout {
  position: absolute;
  top: 5vh;
  right: 1.2vw;
  z-index: 410;
}
</style>
