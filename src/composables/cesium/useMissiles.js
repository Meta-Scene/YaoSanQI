import { reactive } from 'vue'
import * as Cesium from 'cesium'

// 图标
const MISSILE_ICON_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Picto_icon_missile.svg/320px-Picto_icon_missile.svg.png'

// 轨迹线采样间隔（轨迹“永久累积”用）
const PATH_SAMPLE_INTERVAL_SEC = 0.5
const KEEP_PATH_GRAPHICS = false

// 平滑函数
const smoothstep = (x) => x * x * (3 - 2 * x)
const clamp01 = (x) => Math.max(0, Math.min(1, x))

/**
 * 根据“输入项”决定弹道参数
 * 你可以继续扩展：不同目标类型、不同轨迹选项、不同大气/气溶胶影响等
 */
function getTrajectoryParams(form) {
  const targetType = form?.target?.type || 'A'
  const traj = form?.other?.trajectory || 'traj_a'

  // 默认基线
  let totalSeconds = 420
  let peakHeightM = 1_200_000
  let samples = 360

  // 目标类型影响（示例：B 更高更久）
  if (targetType === 'B') {
    totalSeconds = 520
    peakHeightM = 1_600_000
    samples = 420
  }

  // 轨迹选项影响（traj_b：更“平缓”更久中段）
  // （这里不改 totalSeconds 也行，我给你做了轻微差异）
  let profile = 'A' // 控制 heightAt/uTime 形态
  if (traj === 'traj_b') profile = 'B'

  return { totalSeconds, peakHeightM, samples, targetType, traj, profile }
}

/**
 * 核心：根据输入起点/终点生成弹道采样（沿大圆 + 高度曲线）
 */
function buildBallisticSamples({ start, end, startTime, totalSeconds, peakHeightM, samples, profile }) {
  const ellipsoid = Cesium.Ellipsoid.WGS84
  const startCarto = Cesium.Cartographic.fromDegrees(start.lon, start.lat, 0)
  const endCarto = Cesium.Cartographic.fromDegrees(end.lon, end.lat, 0)
  const geodesic = new Cesium.EllipsoidGeodesic(startCarto, endCarto, ellipsoid)

  // 分段比例：A/B 两套（与你 SimModal 的 traj_a / traj_b 对应）
  // A：上升/中段/再入 = 0.18/0.64/0.18（你原始）
  // B：中段更长更平稳
  const seg =
    profile === 'B'
      ? { boost: 0.15, mid: 0.72, reentry: 0.13 }
      : { boost: 0.18, mid: 0.64, reentry: 0.18 }

  const boostFrac = seg.boost
  const midFrac = seg.mid
  const reentryFrac = seg.reentry

  // 高度曲线
  const heightAt = (u) => {
    if (u < boostFrac) {
      const t = smoothstep(u / boostFrac)
      return peakHeightM * (0.90 * t)
    }
    if (u < boostFrac + midFrac) {
      const t = (u - boostFrac) / midFrac
      // B：平台更“平”
      const dome =
        profile === 'B'
          ? (1 - Math.pow(2 * t - 1, 4)) // 更平一点
          : (1 - Math.pow(2 * t - 1, 2))
      return peakHeightM * (0.90 + 0.10 * dome)
    }
    const t = smoothstep((u - (boostFrac + midFrac)) / reentryFrac)
    return peakHeightM * (0.90 * (1 - t))
  }

  // 时间重分配：让中段占用更久（B 更明显）
  const uTime = (i) => {
    const p = i / samples
    if (p < boostFrac) {
      const t = p / boostFrac
      return boostFrac * clamp01(Math.pow(t, profile === 'B' ? 0.9 : 0.8))
    }
    if (p < boostFrac + midFrac) {
      const t = (p - boostFrac) / midFrac
      return boostFrac + midFrac * clamp01(Math.pow(t, profile === 'B' ? 1.55 : 1.35))
    }
    const t = (p - (boostFrac + midFrac)) / reentryFrac
    return boostFrac + midFrac + reentryFrac * clamp01(Math.pow(t, profile === 'B' ? 0.95 : 0.85))
  }

  const out = []
  for (let i = 0; i <= samples; i++) {
    const u = uTime(i)
    const cartoOnArc = geodesic.interpolateUsingFraction(u, new Cesium.Cartographic())
    const h = heightAt(u)

    const pos = Cesium.Cartesian3.fromRadians(
      cartoOnArc.longitude,
      cartoOnArc.latitude,
      h,
      ellipsoid
    )

    const sec = (i / samples) * totalSeconds
    const time = Cesium.JulianDate.addSeconds(startTime, sec, new Cesium.JulianDate())
    out.push({ time, pos })
  }
  return out
}

function buildSampledPositionProperty(samples) {
  const prop = new Cesium.SampledPositionProperty()
  for (const s of samples) prop.addSample(s.time, s.pos)
  prop.setInterpolationOptions({
    interpolationDegree: 2,
    interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
  })
  return prop
}

function normalizeLonLat(lon, lat) {
  const lo = Number(lon)
  const la = Number(lat)
  if (Number.isNaN(lo) || Number.isNaN(la)) return null
  // 简单夹取
  const nlon = Math.max(-180, Math.min(180, lo))
  const nlat = Math.max(-90, Math.min(90, la))
  return { lon: nlon, lat: nlat }
}

export function useMissiles(viewerRef, simForm) {
  // 选中导弹信息（面板）
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

  // 轨迹永久累积点
  const missilePaths = new Map() // id -> Cartesian3[]
  const lastPathSampleTime = new Map()

  let missileCounter = 0
  let pathRecorderBound = false

  /**
   * ✅ 现在 createMissile 由输入项决定 start/end
   */
  const createMissile = () => {
    const v = viewerRef.value
    if (!v) return null

    const start = normalizeLonLat(simForm?.target?.launchLon, simForm?.target?.launchLat)
    const end = normalizeLonLat(simForm?.target?.impactLon, simForm?.target?.impactLat)
    if (!start || !end) {
      alert('发射点/落点经纬度不合法')
      return null
    }

    const { totalSeconds, peakHeightM, samples, targetType, traj, profile } = getTrajectoryParams(simForm)

    missileCounter += 1
    const id = `missile_${missileCounter}`

    const startTime = Cesium.JulianDate.now()
    const stopTime = Cesium.JulianDate.addSeconds(startTime, totalSeconds, new Cesium.JulianDate())

    // 仍沿用你的逻辑：每次创建重置全局 clock（你要多导弹并行我再给你升级）
    v.clock.startTime = startTime.clone()
    v.clock.stopTime = stopTime.clone()
    v.clock.currentTime = startTime.clone()
    v.clock.clockRange = Cesium.ClockRange.CLAMPED
    v.clock.multiplier = 1
    v.clock.shouldAnimate = true
    v.timeline?.zoomTo(startTime, stopTime)

    const samplesArr = buildBallisticSamples({
      start,
      end,
      startTime,
      totalSeconds,
      peakHeightM,
      samples,
      profile,
    })
    const position = buildSampledPositionProperty(samplesArr)

    // 轨迹数组准备
    missilePaths.set(id, [])
    lastPathSampleTime.set(id, startTime.clone())

    // 轨迹线实体
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

    // 导弹实体（挂 properties 方便调试/展示）
    const missileEntity = v.entities.add({
      id,
      position,
      orientation: new Cesium.VelocityOrientationProperty(position),
      properties: new Cesium.PropertyBag({
        targetType,
        trajectory: traj,
        launchLon: start.lon,
        launchLat: start.lat,
        impactLon: end.lon,
        impactLat: end.lat,
      }),
      billboard: {
        image: MISSILE_ICON_URL,
        width: 34,
        height: 34,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        alignedAxis: Cesium.Cartesian3.ZERO,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
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

  // 每 tick 把导弹当前位置 append 到轨迹数组（永久存在）
  const bindMissilePathRecorder = () => {
    const v = viewerRef.value
    if (!v || pathRecorderBound) return
    pathRecorderBound = true

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

  const cleanupMissiles = () => {
    const v = viewerRef.value
    if (!v) {
      missilePaths.clear()
      lastPathSampleTime.clear()
      return
    }

    for (const [id] of missilePaths.entries()) {
      v.entities.removeById(id)
      v.entities.removeById(`${id}_track`)
    }
    missilePaths.clear()
    lastPathSampleTime.clear()
  }

  return {
    selectedInfo,
    hideSelectedInfo,
    createMissile,
    bindMissilePathRecorder,
    cleanupMissiles,
  }
}
