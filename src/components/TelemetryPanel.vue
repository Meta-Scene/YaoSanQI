<template>
  <!-- 折叠态：右侧小胶囊，不占一条竖列 -->
  <div v-if="collapsed" class="collapsed-pill" @click="collapsed = false" title="展开监控面板">
    <span class="pill-text">监控</span>
    <span class="pill-icon">◀</span>
  </div>

  <!-- 展开态：主面板 -->
  <div v-else class="telemetry">
    <div class="header">
      <div class="title">
        <div class="title-main">目标监控</div>
        <div class="title-sub">
          <span class="dot"></span>
          <span>已锁定目标</span>
        </div>
      </div>

      <div class="header-actions">
        <button class="icon-btn" title="折叠" @click="collapsed = true">⟨</button>
        <button class="icon-btn close" title="关闭" @click="emit('close')">×</button>
      </div>
    </div>

    <!-- 基础信息 -->
    <div class="meta">
      <div class="row">
        <span class="k">ID</span>
        <span class="v">{{ info?.id || "-" }}</span>
      </div>
      <div class="row">
        <span class="k">经度</span>
        <span class="v">{{ info?.lon ?? "-" }}</span>
      </div>
      <div class="row">
        <span class="k">纬度</span>
        <span class="v">{{ info?.lat ?? "-" }}</span>
      </div>
      <div class="row">
        <span class="k">高度</span>
        <span class="v">{{ info?.alt ?? "-" }}</span>
      </div>
    </div>

    <!-- 图像区：更像你截图的“上大下两张” -->
    <div class="block">
      <div class="block-title">目标追踪图像</div>

      <div class="gallery">
        <div class="big">
          <img class="img" :src="images?.[0]" alt="main" />
          <div class="overlay">
            <div class="overlay-left">追踪主视图</div>
            <div class="overlay-right">LIVE</div>
          </div>
        </div>

        <div class="small">
          <div class="thumb">
            <img class="img" :src="images?.[1]" alt="sub1" />
            <div class="badge">光谱/成像</div>
          </div>
          <div class="thumb">
            <img class="img" :src="images?.[2]" alt="sub2" />
            <div class="badge">目标锁定</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 光谱区（样式占位） -->
    <div class="block">
      <div class="block-title">光谱数据（模拟）</div>

      <div class="spectrum-top">
        <span class="tag">1.8μm</span>
        <span class="tag">2.5–4.5μm</span>
        <span class="tag">2.5–3.2μm</span>
      </div>

      <div class="fake-chart">
        <div class="line" v-for="n in 10" :key="n"></div>
      </div>

      <div class="hint">样式验收阶段：后续接入后端实时曲线与帧图。</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  info: { type: Object, default: () => ({}) },
  images: { type: Array, default: () => [] },
});

const emit = defineEmits(["close"]);
const collapsed = ref(false);
</script>

<style scoped>
/* ✅ 主面板：vh/vw 留白，避免挡工具栏和时间轴 */
.telemetry {
  position: absolute;
  top: 8vh;
  bottom: 14vh;
  right: 1.2vw;

  width: 26vw;
  min-width: 320px;
  max-width: 480px;

  background: rgba(18, 19, 22, 0.78);
  border: 0.12vh solid rgba(255, 255, 255, 0.08);
  border-radius: 1.6vh;
  backdrop-filter: blur(1vh);
  box-shadow: 0 1.2vh 3vh rgba(0, 0, 0, 0.35);

  padding: 1.6vh 1vw;
  overflow-y: auto;
  z-index: 999;
  color: rgba(255, 255, 255, 0.92);
}

/* ✅ 折叠态：右侧小胶囊 */
.collapsed-pill {
  position: absolute;
  top: 10vh;
  right: 1.2vw;
  height: 5.2vh;
  min-height: 42px;
  width: 6.8vw;
  min-width: 88px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.9vw;

  background: rgba(18, 19, 22, 0.72);
  border: 0.12vh solid rgba(255, 255, 255, 0.10);
  border-radius: 999px;
  backdrop-filter: blur(1vh);
  cursor: pointer;
  z-index: 999;
}

.pill-text {
  font-size: 1.5vh;
  opacity: 0.9;
}
.pill-icon {
  font-size: 1.8vh;
  opacity: 0.9;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1vw;
  margin-bottom: 1.2vh;
}

.title-main {
  font-size: 2.0vh;
  font-weight: 700;
}
.title-sub {
  margin-top: 0.6vh;
  display: flex;
  align-items: center;
  gap: 0.8vh;
  font-size: 1.35vh;
  opacity: 0.85;
}
.dot {
  width: 1.05vh;
  height: 1.05vh;
  border-radius: 999px;
  background: #33d17a;
}

.header-actions {
  display: flex;
  gap: 0.6vw;
}

.icon-btn {
  width: 3.3vh;
  height: 3.3vh;
  min-width: 34px;
  min-height: 34px;

  border-radius: 999px;
  border: 0.12vh solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  font-size: 1.6vh;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.10);
}
.icon-btn.close {
  background: rgba(255, 0, 0, 0.14);
  border-color: rgba(255, 0, 0, 0.20);
}
.icon-btn.close:hover {
  background: rgba(255, 0, 0, 0.22);
}

/* 基础信息 */
.meta {
  padding: 1.2vh 1vw;
  border-radius: 1.4vh;
  background: rgba(255, 255, 255, 0.05);
  border: 0.12vh solid rgba(255, 255, 255, 0.06);
}
.row {
  display: flex;
  justify-content: space-between;
  font-size: 1.4vh;
  padding: 0.35vh 0;
}
.k {
  opacity: 0.7;
}
.v {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
}

/* 块 */
.block {
  margin-top: 1.6vh;
  padding: 1.2vh 1vw;
  border-radius: 1.4vh;
  background: rgba(255, 255, 255, 0.04);
  border: 0.12vh solid rgba(255, 255, 255, 0.06);
}
.block-title {
  font-size: 1.55vh;
  font-weight: 600;
  margin-bottom: 1vh;
}

/* 图片：更像你截图那种“专业面板” */
.gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.2vh;
}

.big {
  position: relative;
  width: 100%;
  height: 22vh;
  border-radius: 1.5vh;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 1vh 2.4vh rgba(0, 0, 0, 0.25);
}

.small {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2vh;
}

.thumb {
  position: relative;
  height: 13vh;
  border-radius: 1.5vh;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 1vh 2.2vh rgba(0, 0, 0, 0.18);
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 大图底部标题条 */
.overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;

  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 0.8vh 0.9vw;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0));
  font-size: 1.25vh;
}
.overlay-right {
  color: rgba(0, 255, 180, 0.95);
  font-weight: 700;
}

/* 小图角标 */
.badge {
  position: absolute;
  left: 0.7vw;
  bottom: 0.8vh;
  font-size: 1.15vh;
  padding: 0.45vh 0.6vw;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  border: 0.12vh solid rgba(255, 255, 255, 0.10);
}

/* 光谱占位 */
.spectrum-top {
  display: flex;
  gap: 0.8vh;
  flex-wrap: wrap;
  margin-bottom: 1vh;
}
.tag {
  font-size: 1.2vh;
  padding: 0.45vh 0.8vw;
  border-radius: 999px;
  background: rgba(0, 255, 255, 0.12);
  border: 0.12vh solid rgba(0, 255, 255, 0.18);
}

.fake-chart {
  height: 16vh;
  border-radius: 1.4vh;
  background: rgba(0, 0, 0, 0.25);
  border: 0.12vh dashed rgba(255, 255, 255, 0.12);
  padding: 1vh 1vw;

  display: grid;
  grid-template-rows: repeat(10, 1fr);
  gap: 0.5vh;
}
.line {
  border-radius: 1vh;
  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0.05),
    rgba(0, 255, 255, 0.35),
    rgba(255, 0, 255, 0.25)
  );
  opacity: 0.85;
}

.hint {
  margin-top: 1vh;
  font-size: 1.2vh;
  opacity: 0.7;
  line-height: 1.4;
}
</style>
