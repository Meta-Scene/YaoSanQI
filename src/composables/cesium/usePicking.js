import { ref } from 'vue'
import * as Cesium from 'cesium'

export function usePicking(viewerRef, simForm, selectedInfo, hideSelectedInfo) {
  const pickMode = ref(null) // 'launch' | 'impact' | null
  const clickHandler = ref(null)

  const startPick = (mode) => {
    pickMode.value = mode
  }

  const updateSelectedInfo = (entity) => {
    const v = viewerRef.value
    if (!v) return
    const time = v.clock.currentTime
    const pos = entity.position?.getValue(time)
    if (!pos) return

    const carto = Cesium.Cartographic.fromCartesian(pos)
    selectedInfo.lon = Cesium.Math.toDegrees(carto.longitude).toFixed(6)
    selectedInfo.lat = Cesium.Math.toDegrees(carto.latitude).toFixed(6)
    selectedInfo.alt = carto.height.toFixed(1)
  }

  const bindPickToShowRealtime = () => {
    const v = viewerRef.value
    if (!v) return

    if (clickHandler.value) {
      clickHandler.value.destroy()
      clickHandler.value = null
    }

    const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas)
    clickHandler.value = handler

    handler.setInputAction((movement) => {
      // 处于拾取坐标模式：优先取地球位置并写入表单
      if (pickMode.value) {
        const cartesian = v.camera.pickEllipsoid(movement.position, v.scene.globe.ellipsoid)
        if (cartesian) {
          const carto = Cesium.Cartographic.fromCartesian(cartesian)
          const lon = Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6))
          const lat = Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6))

          if (pickMode.value === 'launch') {
            simForm.target.launchLon = lon
            simForm.target.launchLat = lat
          } else if (pickMode.value === 'impact') {
            simForm.target.impactLon = lon
            simForm.target.impactLat = lat
          }
          pickMode.value = null
          return
        }
      }

      // ✅ drillPick：优先导弹本体
      const picks = v.scene.drillPick(movement.position, 10)
      let missileEntity = null

      for (const p of picks) {
        const e = p?.id
        if (e?.id && typeof e.id === 'string' && e.id.startsWith('missile_') && !e.id.endsWith('_track')) {
          missileEntity = e
          break
        }
      }

      // 兜底：普通 pick
      if (!missileEntity) {
        const picked = v.scene.pick(movement.position)
        missileEntity = picked?.id || null
      }

      if (!missileEntity?.id || typeof missileEntity.id !== 'string') {
        hideSelectedInfo()
        return
      }

      // 点到轨迹线 -> 映射回导弹

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

      // 实时更新（只绑定一次）
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

  const destroyPickHandler = () => {
    if (clickHandler.value) {
      clickHandler.value.destroy()
      clickHandler.value = null
    }
  }

  return {
    pickMode,
    startPick,
    bindPickToShowRealtime,
    destroyPickHandler,
  }
}
