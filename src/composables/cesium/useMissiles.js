import { reactive } from "vue";
import * as Cesium from "cesium";

// ===================== SVG 图标（头朝上） =====================
const MISSILE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <g fill="none" stroke="white" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M64 10 C52 24 48 40 48 58 v28 c0 8 6 14 16 14 s16-6 16-14V58 c0-18-4-34-16-48z" fill="white" opacity="0.95"/>
    <path d="M64 10 L54 24 L74 24 Z" fill="white"/>
    <path d="M56 104 L64 118 L72 104 Z" fill="white" opacity="0.9"/>
    <path d="M48 78 L28 92 L48 92 Z" fill="white" opacity="0.9"/>
    <path d="M80 78 L80 92 L100 92 Z" fill="white" opacity="0.9"/>
  </g>
</svg>
`.trim();

const MISSILE_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  MISSILE_SVG
)}`;

// ===================== 轨迹线采样间隔 =====================
const PATH_SAMPLE_INTERVAL_SEC = 0.5;
const KEEP_PATH_GRAPHICS = false;

// 图标大小（像素）
const MISSILE_BILLBOARD_SIZE = 34;

// 取未来多少秒用于估算速度方向
const ROTATE_LOOKAHEAD_SEC = 0.25;

// SVG “头朝上”，但我们算出来的 heading 是“北为 0，东为 +90°”
// rotation 是贴图旋转（弧度），这里给一个偏移项用于对齐
// 如果你发现头差一点点，就微调这个（一般 0 或 ±0.1 就够）
const ICON_HEADING_OFFSET = 0.0;

// 平滑函数
const smoothstep = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function getTrajectoryParams(form) {
  const targetType = form?.target?.type || "A";
  const traj = form?.other?.trajectory || "traj_a";

  let totalSeconds = 420;
  let peakHeightM = 1_200_000;
  let samples = 360;

  if (targetType === "B") {
    totalSeconds = 520;
    peakHeightM = 1_600_000;
    samples = 420;
  }

  let profile = "A";
  if (traj === "traj_b") profile = "B";

  return { totalSeconds, peakHeightM, samples, targetType, traj, profile };
}

function buildBallisticSamples({
  start,
  end,
  startTime,
  totalSeconds,
  peakHeightM,
  samples,
  profile,
}) {
  const ellipsoid = Cesium.Ellipsoid.WGS84;
  const startCarto = Cesium.Cartographic.fromDegrees(start.lon, start.lat, 0);
  const endCarto = Cesium.Cartographic.fromDegrees(end.lon, end.lat, 0);
  const geodesic = new Cesium.EllipsoidGeodesic(startCarto, endCarto, ellipsoid);

  const seg =
    profile === "B"
      ? { boost: 0.15, mid: 0.72, reentry: 0.13 }
      : { boost: 0.18, mid: 0.64, reentry: 0.18 };

  const boostFrac = seg.boost;
  const midFrac = seg.mid;
  const reentryFrac = seg.reentry;

  const heightAt = (u) => {
    if (u < boostFrac) {
      const t = smoothstep(u / boostFrac);
      return peakHeightM * (0.9 * t);
    }
    if (u < boostFrac + midFrac) {
      const t = (u - boostFrac) / midFrac;
      const dome =
        profile === "B"
          ? 1 - Math.pow(2 * t - 1, 4)
          : 1 - Math.pow(2 * t - 1, 2);
      return peakHeightM * (0.9 + 0.1 * dome);
    }
    const t = smoothstep((u - (boostFrac + midFrac)) / reentryFrac);
    return peakHeightM * (0.9 * (1 - t));
  };

  const uTime = (i) => {
    const p = i / samples;
    if (p < boostFrac) {
      const t = p / boostFrac;
      return boostFrac * clamp01(Math.pow(t, profile === "B" ? 0.9 : 0.8));
    }
    if (p < boostFrac + midFrac) {
      const t = (p - boostFrac) / midFrac;
      return (
        boostFrac +
        midFrac * clamp01(Math.pow(t, profile === "B" ? 1.55 : 1.35))
      );
    }
    const t = (p - (boostFrac + midFrac)) / reentryFrac;
    return (
      boostFrac +
      midFrac +
      reentryFrac * clamp01(Math.pow(t, profile === "B" ? 0.95 : 0.85))
    );
  };

  const out = [];
  for (let i = 0; i <= samples; i++) {
    const u = uTime(i);
    const cartoOnArc = geodesic.interpolateUsingFraction(
      u,
      new Cesium.Cartographic()
    );
    const h = heightAt(u);

    const pos = Cesium.Cartesian3.fromRadians(
      cartoOnArc.longitude,
      cartoOnArc.latitude,
      h,
      ellipsoid
    );

    const sec = (i / samples) * totalSeconds;
    const time = Cesium.JulianDate.addSeconds(
      startTime,
      sec,
      new Cesium.JulianDate()
    );
    out.push({ time, pos });
  }
  return out;
}

function buildSampledPositionProperty(samples) {
  const prop = new Cesium.SampledPositionProperty();
  for (const s of samples) prop.addSample(s.time, s.pos);
  prop.setInterpolationOptions({
    interpolationDegree: 2,
    interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
  });
  return prop;
}

function normalizeLonLat(lon, lat) {
  const lo = Number(lon);
  const la = Number(lat);
  if (Number.isNaN(lo) || Number.isNaN(la)) return null;
  const nlon = Math.max(-180, Math.min(180, lo));
  const nlat = Math.max(-90, Math.min(90, la));
  return { lon: nlon, lat: nlat };
}

/**
 * ✅ 世界坐标航向旋转（不会随相机变化）
 * - 用 p0 -> p1 得到速度向量 v
 * - 转到 ENU（East, North, Up）
 * - heading = atan2(E, N)
 * - billboard.rotation 直接用这个 heading（再加 offset）
 */
function makeWorldHeadingRotation(positionProperty) {
  const scratchVel = new Cesium.Cartesian3();
  const scratchENU = new Cesium.Cartesian3();
  const scratchMat = new Cesium.Matrix4();

  return new Cesium.CallbackProperty((time) => {
    if (!positionProperty) return 0;

    const p0 = positionProperty.getValue(time);
    if (!p0) return 0;

    const t1 = Cesium.JulianDate.addSeconds(
      time,
      ROTATE_LOOKAHEAD_SEC,
      new Cesium.JulianDate()
    );
    const p1 = positionProperty.getValue(t1);
    if (!p1) return 0;

    // v = p1 - p0（世界坐标速度方向）
    Cesium.Cartesian3.subtract(p1, p0, scratchVel);

    // 太小就不转
    if (Cesium.Cartesian3.magnitudeSquared(scratchVel) < 1e-6) return 0;

    // 转到局部 ENU 坐标系
    const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(p0, Cesium.Ellipsoid.WGS84, scratchMat);

    // 世界向量 -> ENU：用逆矩阵（只取旋转部分）
    const inv = Cesium.Matrix4.inverseTransformation(enuTransform, scratchMat);
    Cesium.Matrix4.multiplyByPointAsVector(inv, scratchVel, scratchENU);

    const east = scratchENU.x;
    const north = scratchENU.y;

    // heading: 0=北，π/2=东
    const heading = Math.atan2(east, north);

    // SVG 头朝上：rotation=heading（通常就是对的）
    return heading + ICON_HEADING_OFFSET;
  }, false);
}

export function useMissiles(viewerRef, simForm) {
  const selectedInfo = reactive({
    visible: false,
    id: "",
    lon: "",
    lat: "",
    alt: "",
  });

  const hideSelectedInfo = () => {
    selectedInfo.visible = false;
    selectedInfo.id = "";
    selectedInfo.lon = "";
    selectedInfo.lat = "";
    selectedInfo.alt = "";
  };

  const missilePaths = new Map();
  const lastPathSampleTime = new Map();

  let missileCounter = 0;
  let pathRecorderBound = false;

  const createMissile = () => {
    const v = viewerRef.value;
    if (!v) return null;

    const start = normalizeLonLat(simForm?.target?.launchLon, simForm?.target?.launchLat);
    const end = normalizeLonLat(simForm?.target?.impactLon, simForm?.target?.impactLat);
    if (!start || !end) {
      alert("发射点/落点经纬度不合法");
      return null;
    }

    const { totalSeconds, peakHeightM, samples, targetType, traj, profile } = getTrajectoryParams(simForm);

    missileCounter += 1;
    const id = `missile_${missileCounter}`;

    const startTime = Cesium.JulianDate.now();
    const stopTime = Cesium.JulianDate.addSeconds(startTime, totalSeconds, new Cesium.JulianDate());

    v.clock.startTime = startTime.clone();
    v.clock.stopTime = stopTime.clone();
    v.clock.currentTime = startTime.clone();
    v.clock.clockRange = Cesium.ClockRange.CLAMPED;
    v.clock.multiplier = 1;
    v.clock.shouldAnimate = true;
    v.timeline?.zoomTo(startTime, stopTime);

    const samplesArr = buildBallisticSamples({
      start,
      end,
      startTime,
      totalSeconds,
      peakHeightM,
      samples,
      profile,
    });

    const position = buildSampledPositionProperty(samplesArr);

    missilePaths.set(id, []);
    lastPathSampleTime.set(id, startTime.clone());

    const polylinePositions = new Cesium.CallbackProperty(() => {
      const arr = missilePaths.get(id);
      return arr ? arr : [];
    }, false);

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
    });

    const missileEntity = v.entities.add({
      id,
      position,

      // billboard 永远面对相机，但 rotation 用世界航向（不随相机变化）
      billboard: {
        image: MISSILE_ICON_URL,
        width: MISSILE_BILLBOARD_SIZE,
        height: MISSILE_BILLBOARD_SIZE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        color: Cesium.Color.WHITE,

        // ✅ 核心：世界航向旋转（不会因相机转动而改变）
        rotation: makeWorldHeadingRotation(position),
      },

      properties: new Cesium.PropertyBag({
        targetType,
        trajectory: traj,
        launchLon: start.lon,
        launchLat: start.lat,
        impactLon: end.lon,
        impactLat: end.lat,
      }),

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
    });

    v.flyTo(missileEntity, { duration: 1.2 });
    return missileEntity;
  };

  const bindMissilePathRecorder = () => {
    const v = viewerRef.value;
    if (!v || pathRecorderBound) return;
    pathRecorderBound = true;

    v.clock.onTick.addEventListener(() => {
      for (const [id, arr] of missilePaths.entries()) {
        const ent = v.entities.getById(id);
        if (!ent) continue;

        const now = v.clock.currentTime;
        const lastT = lastPathSampleTime.get(id);
        const dt = lastT ? Cesium.JulianDate.secondsDifference(now, lastT) : 999;
        if (dt < PATH_SAMPLE_INTERVAL_SEC) continue;

        const pos = ent.position?.getValue(now);
        if (!pos) continue;

        arr.push(pos);
        lastPathSampleTime.set(id, now.clone());
      }
    });
  };

  const cleanupMissiles = () => {
    const v = viewerRef.value;
    if (!v) {
      missilePaths.clear();
      lastPathSampleTime.clear();
      return;
    }

    for (const [id] of missilePaths.entries()) {
      v.entities.removeById(id);
      v.entities.removeById(`${id}_track`);
    }
    missilePaths.clear();
    lastPathSampleTime.clear();
  };

  return {
    selectedInfo,
    hideSelectedInfo,
    createMissile,
    bindMissilePathRecorder,
    cleanupMissiles,
  };
}
