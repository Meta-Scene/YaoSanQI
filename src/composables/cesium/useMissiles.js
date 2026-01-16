import { reactive } from 'vue'
import * as Cesium from 'cesium'

// ✅ 写死 SVG（导弹图标，不依赖外链）
const MISSILE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <g fill="none" stroke="white" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <!-- 机身 -->
    <path d="M64 10 C52 24 48 40 48 58 v28 c0 8 6 14 16 14 s16-6 16-14V58 c0-18-4-34-16-48z" fill="white" opacity="0.95"/>
    <!-- 头锥 -->
    <path d="M64 10 L54 24 L74 24 Z" fill="white"/>
    <!-- 尾喷 -->
    <path d="M56 104 L64 118 L72 104 Z" fill="white" opacity="0.9"/>
    <!-- 尾翼 -->
    <path d="M48 78 L28 92 L48 92 Z" fill="white" opacity="0.9"/>
    <path d="M80 78 L80 92 L100 92 Z" fill="white" opacity="0.9"/>
  </g>
</svg>
`.trim()

const MISSILE_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(MISSILE_SVG)}`

// 轨迹线采样间隔（轨迹“永久累积”用）
const PATH_SAMPLE_INTERVAL_SEC = 0.5
const KEEP_PATH_GRAPHICS = false

// 平滑函数
const smoothstep = (x) => x * x * (3 - 2 * x)
const clamp01 = (x) => Math.max(0, Math.min(1, x))

function getTrajectoryParams(form) {
  const targetType = form?.target?.type || 'A'
  const traj = form?.other?.trajectory || 'traj_a'

  let totalSeconds = 420
  let peakHeightM = 1_200_000
  let samples = 360

  if (targetType === 'B') {
    totalSeconds = 520
    peakHeightM = 1_600_000
    samples = 420
  }

  let profile = 'A'
  if (traj === 'traj_b') profile = 'B'

  return { totalSeconds, peakHeightM, samples, targetType, traj, profile }
}

function buildBallisticSamples({ start, end, startTime, totalSeconds, peakHeightM, samples, profile }) {
  const ellipsoid = Cesium.Ellipsoid.WGS84
  const startCarto = Cesium.Cartographic.fromDegrees(start.lon, start.lat, 0)
  const endCarto = Cesium.Cartographic.fromDegrees(end.lon, end.lat, 0)
  const geodesic = new Cesium.EllipsoidGeodesic(startCarto, endCarto, ellipsoid)

  const seg =
    profile === 'B'
      ? { boost: 0.15, mid: 0.72, reentry: 0.13 }
      : { boost: 0.18, mid: 0.64, reentry: 0.18 }

  const boostFrac = seg.boost
  const midFrac = seg.mid
  const reentryFrac = seg.reentry

  const heightAt = (u) => {
    if (u < boostFrac) {
      const t = smoothstep(u / boostFrac)
      return peakHeightM * (0.90 * t)
    }
    if (u < boostFrac + midFrac) {
      const t = (u - boostFrac) / midFrac
      const dome =
        profile === 'B'
          ? (1 - Math.pow(2 * t - 1, 4))
          : (1 - Math.pow(2 * t - 1, 2))
      return peakHeightM * (0.90 + 0.10 * dome)
    }
    const t = smoothstep((u - (boostFrac + midFrac)) / reentryFrac)
    return peakHeightM * (0.90 * (1 - t))
  }

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
  const nlon = Math.max(-180, Math.min(180, lo))
  const nlat = Math.max(-90, Math.min(90, la))
  return { lon: nlon, lat: nlat }
}

export function useMissiles(viewerRef, simForm) {
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

  const missilePaths = new Map()
  const lastPathSampleTime = new Map()

  let missileCounter = 0
  let pathRecorderBound = false

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

    // 仍沿用你原逻辑：每次创建重置全局 clock（需要多导弹并行我再给你升级）
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

    missilePaths.set(id, [])
    lastPathSampleTime.set(id, startTime.clone())

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
