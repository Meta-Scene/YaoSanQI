import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useCesiumViewer() {
  const viewer = ref(null)

  const initViewer = (containerId, viewerOptions = {}) => {
    if (viewer.value && !viewer.value.isDestroyed()) return viewer.value

    viewer.value = new Cesium.Viewer(containerId, {
      animation: true,
      timeline: true,
      // 保留绿色选择框 / 信息框（如果你不用 infoBox 可改 false）
      selectionIndicator: true,
      infoBox: true,
      ...viewerOptions,
    })

    // ✅ 关键：禁用 Cesium Viewer 默认的点击选取
    // 否则默认会先选到 polyline（missile_x_track）
    const h = viewer.value.screenSpaceEventHandler
    h.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    h.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

    return viewer.value
  }

  const destroyViewer = () => {
    if (viewer.value && !viewer.value.isDestroyed()) {
      viewer.value.destroy()
    }
    viewer.value = null
  }

  return { viewer, initViewer, destroyViewer }
}
