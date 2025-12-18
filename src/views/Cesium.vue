<script setup>
import { onMounted, onBeforeUnmount, ref, reactive } from 'vue'
import * as Cesium from 'cesium'
import { useRouter } from 'vue-router'

const router = useRouter()
const viewer = ref(null)
const clickHandler = ref(null)

// ========== 可调参数 ==========
const TOTAL_SECONDS = 420
const PEAK_HEIGHT_M = 1_200_000
const SAMPLES = 360

// 轨迹永久存在：由 polyline 累积点实现
const PATH_SAMPLE_INTERVAL_SEC = 0.5

// 是否额外开启 Cesium PathGraphics（可留 false）
const KEEP_PATH_GRAPHICS = false

// ✅ 改动 1：使用 PNG（稳定显示）
// 来源：Wikimedia 的 SVG 缩略图 PNG 输出
const MISSILE_ICON_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Picto_icon_missile.svg/320px-Picto_icon_missile.svg.png'

// ========== 访问后台 ==========
const goToAdmin = () => {
  if (localStorage.getItem('account') === 'admin') router.push('/home')
  else router.push('/login')
}

// ========== 仿真进程弹窗 ==========
const showSimModal = ref(false)
const openSimModal = () => (showSimModal.value = true)
const closeSimModal = () => (showSimModal.value = false)

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

// ========== 选中导弹实时信息 ==========
let missileCounter = 0
const selectedInfo = reactive({
  visible: false,
  id: '',
  lon: '',
  lat: '',
  alt: '',
})

const hideSelectedInfo = () => {
  selectedInfo.visible = false
  selectedInfo.id = ''
  selectedInfo.lon = ''
  selectedInfo.lat = ''
  selectedInfo.alt = ''
}

// ========== 轨迹永久累积 ==========
/**
 * missilePaths[id] = Cesium.Cartesian3[]
 */
const missilePaths = new Map()
const lastPathSampleTime = new Map()

// 工具：随机经纬度
const rand = (min, max) => min + Math.random() * (max - min)
const randomLonLat = () => {
  const lon = rand(80, 130)
  const lat = rand(15, 50)
  return { lon, lat }
}

// 平滑函数
const smoothstep = (x) => x * x * (3 - 2 * x)
const clamp01 = (x) => Math.max(0, Math.min(1, x))

// 更真实弹道：大圆 + 三段高度 + 中段更久
const buildBallisticSamples = (start, end, startTime) => {
  const ellipsoid = Cesium.Ellipsoid.WGS84
  const startCarto = Cesium.Cartographic.fromDegrees(start.lon, start.lat, 0)
  const endCarto = Cesium.Cartographic.fromDegrees(end.lon, end.lat, 0)
  const geodesic = new Cesium.EllipsoidGeodesic(startCarto, endCarto, ellipsoid)

  const boostFrac = 0.18
  const midFrac = 0.64
  const reentryFrac = 0.18

  const heightAt = (u) => {
    if (u < boostFrac) {
      const t = smoothstep(u / boostFrac)
      return PEAK_HEIGHT_M * (0.92 * t)
    }
    if (u < boostFrac + midFrac) {
      const t = (u - boostFrac) / midFrac
      const dome = 1 - Math.pow(2 * t - 1, 2) // 0..1..0
      return PEAK_HEIGHT_M * (0.92 + 0.08 * dome)
    }
    const t = smoothstep((u - (boostFrac + midFrac)) / reentryFrac)
    return PEAK_HEIGHT_M * (0.92 * (1 - t))
  }

  const uTime = (i) => {
    const p = i / SAMPLES
    if (p < boostFrac) {
      const t = p / boostFrac
      return boostFrac * clamp01(Math.pow(t, 0.8))
    }
    if (p < boostFrac + midFrac) {
      const t = (p - boostFrac) / midFrac
      return boostFrac + midFrac * clamp01(Math.pow(t, 1.35))
    }
    const t = (p - (boostFrac + midFrac)) / reentryFrac
    return boostFrac + midFrac + reentryFrac * clamp01(Math.pow(t, 0.85))
  }

  const samples = []
  for (let i = 0; i <= SAMPLES; i++) {
    const u = uTime(i)
    const cartoOnArc = geodesic.interpolateUsingFraction(u, new Cesium.Cartographic())
    const h = heightAt(u)

    const pos = Cesium.Cartesian3.fromRadians(
      cartoOnArc.longitude,
      cartoOnArc.latitude,
      h,
      ellipsoid
    )

    const sec = (i / SAMPLES) * TOTAL_SECONDS
    const time = Cesium.JulianDate.addSeconds(startTime, sec, new Cesium.JulianDate())
    samples.push({ time, pos })
  }
  return samples
}

const buildSampledPositionProperty = (samples) => {
  const prop = new Cesium.SampledPositionProperty()
  for (const s of samples) prop.addSample(s.time, s.pos)
  prop.setInterpolationOptions({
    interpolationDegree: 2,
    interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
  })
  return prop
}

const createMissile = () => {
  if (!viewer.value) return
  const v = viewer.value

  missileCounter += 1
  const id = `missile_${missileCounter}`

  const start = randomLonLat()
  const end = randomLonLat()

  const startTime = Cesium.JulianDate.now()
  const stopTime = Cesium.JulianDate.addSeconds(startTime, TOTAL_SECONDS, new Cesium.JulianDate())

  v.clock.startTime = startTime.clone()
  v.clock.stopTime = stopTime.clone()
  v.clock.currentTime = startTime.clone()
  v.clock.clockRange = Cesium.ClockRange.CLAMPED
  v.clock.multiplier = 1
  v.clock.shouldAnimate = true
  v.timeline?.zoomTo(startTime, stopTime)

  const samples = buildBallisticSamples(start, end, startTime)
  const position = buildSampledPositionProperty(samples)

  // 为该导弹准备“永久轨迹数组”
  missilePaths.set(id, [])
  lastPathSampleTime.set(id, startTime.clone())

  // 轨迹线实体（永久）：CallbackProperty 读数组
  const polylinePositions = new Cesium.CallbackProperty(() => {
    const arr = missilePaths.get(id)
    return arr ? arr : []
  }, false)

  v.entities.add({
    id: `${id}_track`,
    polyline: {
      positions: polylinePositions,
      width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.18,
        color: Cesium.Color.CYAN,
      }),
      clampToGround: false,
    },
  })

  // 导弹实体
  const missileEntity = v.entities.add({
    id,
    position,
    orientation: new Cesium.VelocityOrientationProperty(position),
    billboard: {
      image: MISSILE_ICON_URL,
      width: 34,
      height: 34,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      alignedAxis: Cesium.Cartesian3.ZERO,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      // 给一个轻微颜色，避免透明/白底导致看不见（可按需删掉）
      color: Cesium.Color.WHITE,
    },
    ...(KEEP_PATH_GRAPHICS
      ? {
          path: new Cesium.PathGraphics({
            leadTime: 0,
            trailTime: 999999,
            width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.12,
              color: Cesium.Color.CYAN,
            }),
          }),
        }
      : {}),
  })

  v.flyTo(missileEntity, { duration: 1.2 })
  return missileEntity
}

// 每 tick：把导弹当前位置 append 到轨迹数组（永久存在）
const bindMissilePathRecorder = () => {
  const v = viewer.value
  if (!v) return
  if (v.__pathRecorderBound) return
  v.__pathRecorderBound = true

  v.clock.onTick.addEventListener(() => {
    for (const [id, arr] of missilePaths.entries()) {
      const ent = v.entities.getById(id)
      if (!ent) continue

      const now = v.clock.currentTime
      const lastT = lastPathSampleTime.get(id)
      const dt = lastT ? Cesium.JulianDate.secondsDifference(now, lastT) : 999
      if (dt < PATH_SAMPLE_INTERVAL_SEC) continue

      const pos = ent.position?.getValue(now)
      if (!pos) continue

      arr.push(pos)
      lastPathSampleTime.set(id, now.clone())
    }
  })
}

// ✅ 改动 2：点击拾取用 drillPick，优先导弹而不是线
const bindPickToShowRealtime = () => {
  const v = viewer.value
  if (!v) return

  if (clickHandler.value) {
    clickHandler.value.destroy()
    clickHandler.value = null
  }

  const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas)
  clickHandler.value = handler

  handler.setInputAction((movement) => {
    // 取鼠标位置下所有对象，优先导弹本体
    const picks = v.scene.drillPick(movement.position, 10)

    let missileEntity = null
    for (const p of picks) {
      const e = p?.id
      if (e?.id && typeof e.id === 'string' && e.id.startsWith('missile_') && !e.id.endsWith('_track')) {
        missileEntity = e
        break
      }
    }

    // 兜底：如果 drillPick 没有，尝试普通 pick
    if (!missileEntity) {
      const picked = v.scene.pick(movement.position)
      missileEntity = picked?.id || null
    }

    if (!missileEntity?.id || typeof missileEntity.id !== 'string') {
      hideSelectedInfo()
      return
    }

    // 如果点到轨迹线，映射回导弹本体
    if (missileEntity.id.endsWith('_track')) {
      const baseId = missileEntity.id.replace(/_track$/, '')
      const baseEntity = v.entities.getById(baseId)
      if (baseEntity) missileEntity = baseEntity
      else {
        hideSelectedInfo()
        return
      }
    }

    if (!missileEntity.id.startsWith('missile_')) {
      hideSelectedInfo()
      return
    }

    selectedInfo.visible = true
    selectedInfo.id = missileEntity.id
    updateSelectedInfo(missileEntity)

    if (!v.__missileOnTickBound) {
      v.__missileOnTickBound = true
      v.clock.onTick.addEventListener(() => {
        if (!selectedInfo.visible) return
        const e = v.entities.getById(selectedInfo.id)
        if (!e) {
          hideSelectedInfo()
          return
        }
        updateSelectedInfo(e)
      })
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const updateSelectedInfo = (entity) => {
  const v = viewer.value
  if (!v) return
  const time = v.clock.currentTime
  const pos = entity.position?.getValue(time)
  if (!pos) return

  const carto = Cesium.Cartographic.fromCartesian(pos)
  selectedInfo.lon = Cesium.Math.toDegrees(carto.longitude).toFixed(6)
  selectedInfo.lat = Cesium.Math.toDegrees(carto.latitude).toFixed(6)
  selectedInfo.alt = carto.height.toFixed(1)
}

const runSimulation = () => {
  if (!simForm.trajectory || !simForm.prototypeType || !simForm.atmosphere || !simForm.aerosol) {
    alert('请先完成所有选项选择')
    return
  }
  createMissile()
  closeSimModal()
}

onMounted(() => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'

  viewer.value = new Cesium.Viewer('cesiumContainer', {
    animation: true,
    timeline: true,
    creditContainer: 'creditContainer',
  })

  bindPickToShowRealtime()
  bindMissilePathRecorder()
})

onBeforeUnmount(() => {
  hideSelectedInfo()

  if (clickHandler.value) {
    clickHandler.value.destroy()
    clickHandler.value = null
  }

  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.destroy()
  }

  missilePaths.clear()
  lastPathSampleTime.clear()
})
</script>

<template>
  <div class="page">
    <div id="cesiumContainer"></div>
    <div id="creditContainer" class="hidden-credit"></div>

    <div class="top-right-actions">
      <button class="action-button" @click="goToAdmin">访问后台</button>
      <button class="action-button" @click="openSimModal">仿真进程</button>
    </div>

    <div v-if="selectedInfo.visible" class="missile-info">
      <div class="missile-info-title">已选中：{{ selectedInfo.id }}</div>
      <div class="missile-info-row">经度：{{ selectedInfo.lon }}</div>
      <div class="missile-info-row">纬度：{{ selectedInfo.lat }}</div>
      <div class="missile-info-row">高度：{{ selectedInfo.alt }} m</div>
      <button class="missile-info-close" @click="hideSelectedInfo">关闭</button>
    </div>

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
.top-right-actions {
  position: absolute;
  top: 1vh;
  right: 14vw;
  z-index: 410;
  display: flex;
  gap: 0.8vw;
}
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
.action-button.ghost {
  background-color: #f2f2f2;
  color: #333;
}
.action-button.ghost:hover {
  background-color: #e8e8e8;
}

/* 弹窗 */
.modal-mask {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
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
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex: 0 0 auto;
}

/* 导弹信息 */
.missile-info {
  position: absolute;
  right: 1.2vw;
  bottom: 2vh;
  z-index: 900;
  width: 260px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(6px);
}
.missile-info-title {
  font-weight: 800;
  margin-bottom: 8px;
}
.missile-info-row {
  font-size: 13px;
  line-height: 1.6;
}
.missile-info-close {
  margin-top: 10px;
  width: 100%;
  height: 30px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.missile-info-close:hover {
  background: rgba(255, 255, 255, 0.28);
}
</style>
