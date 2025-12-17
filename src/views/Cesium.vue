<script setup>
import { onMounted, onBeforeUnmount, ref, reactive } from 'vue'
import * as Cesium from 'cesium'
import { useRouter } from 'vue-router'

const router = useRouter()
const viewer = ref(null)

/** 访问后台 */
const goToAdmin = () => {
  if (localStorage.getItem('account') === 'admin') {
    router.push('/home')
  } else {
    router.push('/login')
  }
}

/** 仿真进程弹窗开关 */
const showSimModal = ref(false)

const openSimModal = () => {
  showSimModal.value = true
}
const closeSimModal = () => {
  showSimModal.value = false
}

/** 下拉选项（先给示例；后续可改成接口加载） */
const options = {
  trajectory: [
    { label: '轨迹A（示例）', value: 'traj_a' },
    { label: '轨迹B（示例）', value: 'traj_b' },
  ],
  prototypeType: [
    { label: '样机-01（示例）', value: 'proto_01' },
    { label: '样机-02（示例）', value: 'proto_02' },
  ],
  atmosphere: [
    { label: '标准大气（示例）', value: 'atm_std' },
    { label: '热带大气（示例）', value: 'atm_tropical' },
  ],
  aerosol: [
    { label: '城市气溶胶（示例）', value: 'aero_urban' },
    { label: '海洋气溶胶（示例）', value: 'aero_ocean' },
  ],
}

/** 表单数据 */
const simForm = reactive({
  trajectory: '',
  prototypeType: '',
  atmosphere: '',
  aerosol: '',
})

const resetSimForm = () => {
  simForm.trajectory = ''
  simForm.prototypeType = ''
  simForm.atmosphere = ''
  simForm.aerosol = ''
}

const runSimulation = () => {
  if (!simForm.trajectory || !simForm.prototypeType || !simForm.atmosphere || !simForm.aerosol) {
    alert('请先完成所有选项选择')
    return
  }

  // TODO：替换为真实执行逻辑（调用后端接口/WS）
  console.log('执行仿真参数：', JSON.parse(JSON.stringify(simForm)))
  alert('已触发执行（当前为示例）')
}

onMounted(() => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'

  viewer.value = new Cesium.Viewer('cesiumContainer', {
    animation: true,
    timeline: true,
    creditContainer: 'creditContainer',
  })
})

onBeforeUnmount(() => {
  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.destroy()
  }
})
</script>

<template>
  <div class="page">
    <div id="cesiumContainer"></div>
    <div id="creditContainer" class="hidden-credit"></div>

    <!-- 右上角按钮组 -->
    <div class="top-right-actions">
      <button class="action-button" @click="goToAdmin">访问后台</button>
      <button class="action-button" @click="openSimModal">仿真进程</button>
    </div>

    <!-- 仿真进程弹窗 -->
    <div v-if="showSimModal" class="modal-mask" @click.self="closeSimModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">仿真进程</div>
          <button class="modal-close" @click="closeSimModal">×</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-item">
              <label class="form-label">目标轨迹</label>
              <select class="form-select" v-model="simForm.trajectory">
                <option value="" disabled>请选择目标轨迹</option>
                <option v-for="o in options.trajectory" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">样机类型</label>
              <select class="form-select" v-model="simForm.prototypeType">
                <option value="" disabled>请选择样机类型</option>
                <option v-for="o in options.prototypeType" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">大气轮廓线</label>
              <select class="form-select" v-model="simForm.atmosphere">
                <option value="" disabled>请选择大气轮廓线</option>
                <option v-for="o in options.atmosphere" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">气溶胶模型</label>
              <select class="form-select" v-model="simForm.aerosol">
                <option value="" disabled>请选择气溶胶模型</option>
                <option v-for="o in options.aerosol" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="action-button ghost" @click="resetSimForm">重置</button>
          <button class="action-button" @click="runSimulation">执行</button>
          <button class="action-button" @click="closeSimModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
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

/* 右上角按钮容器 */
.top-right-actions {
  position: absolute;
  top: 1vh;
  right: 14vw;
  z-index: 410;
  display: flex;
  gap: 0.8vw;
}

/* 按钮基础样式（两者颜色一致） */
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

/* 弹窗遮罩 */
.modal-mask {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 大弹窗 */
.modal {
  width: 70vw;
  height: 70vh;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.modal-header {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  flex: 0 0 auto;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #f2f2f2;
  cursor: pointer;
  font-size: 20px;
  line-height: 32px;
}

.modal-close:hover {
  background: #e8e8e8;
}

.modal-body {
  padding: 16px;
  overflow: auto;
  flex: 1 1 auto;
}

/* 表单布局 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 700;
  color: #333;
}

.form-select {
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #4a86c5;
  box-shadow: 0 0 0 2px rgba(74, 134, 197, 0.2);
}

/* 底部按钮区 */
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex: 0 0 auto;
}

/* 重置按钮用浅色风格，避免和“执行”太像 */
.action-button.ghost {
  background-color: #f2f2f2;
  color: #333;
}

.action-button.ghost:hover {
  background-color: #e8e8e8;
}
</style>
