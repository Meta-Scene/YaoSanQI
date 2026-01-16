<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { useRouter } from 'vue-router'
import { getAuth, clearAuth } from '@/utils/auth'

import TopActions from '@/components/cesium/TopActions.vue'
import SimModal from '@/components/cesium/SimModal.vue'
import TelemetryPanel from '@/components/TelemetryPanel.vue'

import { useSimForm } from '@/composables/cesium/useSimForm'
import { useCesiumViewer } from '@/composables/cesium/useCesiumViewer'
import { useMissiles } from '@/composables/cesium/useMissiles'
import { usePicking } from '@/composables/cesium/usePicking'

const router = useRouter()

const { options, simForm } = useSimForm()
const { viewer, initViewer, destroyViewer } = useCesiumViewer()

const {
  selectedInfo,
  hideSelectedInfo,
  createMissile,
  bindMissilePathRecorder,
  cleanupMissiles,
} = useMissiles(viewer, simForm)

const { startPick, bindPickToShowRealtime, destroyPickHandler } = usePicking(
  viewer,
  simForm,
  selectedInfo,
  hideSelectedInfo
)

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

/**
 * ✅ 样式验收：模拟“导弹/航迹/喷焰”图片
 * 你后续要换成自己的截图：
 *
 * 1) 放到 src/assets/telemetry/
 * 2) 用 import 引入
 *    import mainImg from '@/assets/telemetry/missile_main.png'
 *    import img1 from '@/assets/telemetry/missile_1.png'
 *    import img2 from '@/assets/telemetry/missile_2.png'
 *    const mockImages = [mainImg, img1, img2]
 */
const mockImages = [
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=60',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=60',
  'https://images.unsplash.com/photo-1517976547714-720226b864c1?auto=format&fit=crop&w=1600&q=60',
]

onMounted(() => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'

  initViewer('cesiumContainer', {
    animation: true,
    timeline: true,
    creditContainer: 'creditContainer',
    // ✅ 去掉 Cesium 原生顶部 “missile_1” 标签栏
    infoBox: false,
    // ✅ 去掉 Cesium 原生选中 UI
    selectionIndicator: false,
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

    <!-- ✅ 放在 Cesium 工具栏左侧：更自然（同一排） -->
    <div class="toolbar-left">
      <TopActions @go-admin="goToAdmin" @open-sim="openSimModal" />
      <button class="action-button danger" @click="logout">登出</button>
    </div>

    <!-- ✅ 右侧主面板：仅选中时出现；可关闭 -->
    <TelemetryPanel
      v-if="selectedInfo.visible"
      :info="selectedInfo"
      :images="mockImages"
      @close="hideSelectedInfo"
    />

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

/**
 * ✅ Cesium 右上 toolbar 通常在右上角
 * 这组按钮放在它左侧一点（自然，不挡工具）
 * 如果你发现仍然挤到 Cesium toolbar：把 right 再加大一点，比如 10vw
 */
.toolbar-left {
  position: absolute;
  top: 1.2vh;
  right: 7.5vw;
  z-index: 420;
  display: flex;
  align-items: center;
  gap: 0.8vw;
}

/* 登出按钮样式（你的 TopActions 内按钮不动） */
.action-button {
  height: 3.4vh;
  min-height: 32px;
  padding: 0 1vw;
  border: none;
  border-radius: 0.6vh;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  color: #fff;
}

.action-button.danger {
  background-color: #ff4d4f;
}
.action-button.danger:hover {
  background-color: #ff7875;
}
</style>
