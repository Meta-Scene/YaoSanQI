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
      // ========= 拾取坐标模式：只写表单，不做选中/跟随 =========
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
        }
        return
      }

      // ========= drillPick：优先导弹本体 =========
      const picks = v.scene.drillPick(movement.position, 10)
      let missileEntity = null

      // 1) ✅ 强优先：带 billboard 的导弹（点中图标时一定选它）
      //    说明：Cesium 的 drillPick 返回顺序不稳定，且 polyline 很容易“抢点”。
      //    我们先从 picks 里找有 billboard 的实体，从而让点击框锁定图标而不是轨迹线。
      for (const p of picks) {
        const e = p?.id
        if (!e || typeof e !== 'object') continue
        if (
          e?.id &&
          typeof e.id === 'string' &&
          e.id.startsWith('missile_') &&
          !e.id.endsWith('_track') &&
          e.billboard
        ) {
          missileEntity = e
          break
        }
      }

      // 2) 次优先：导弹实体（哪怕没命中 billboard，也别选轨迹）
      if (!missileEntity) {
        for (const p of picks) {
          const e = p?.id
          if (
            e?.id &&
            typeof e.id === 'string' &&
            e.id.startsWith('missile_') &&
            !e.id.endsWith('_track')
          ) {
            missileEntity = e
            break
          }
        }
      }

      // 3) 如果只点到轨迹线（_track），映射回导弹实体
      if (!missileEntity) {
        for (const p of picks) {
          const e = p?.id
          if (e?.id && typeof e.id === 'string' && e.id.endsWith('_track')) {
            const baseId = e.id.replace(/_track$/, '')
            const baseEntity = v.entities.getById(baseId)
            if (baseEntity) {
              missileEntity = baseEntity
              break
            }
          }
        }
      }

      // ========= 点空白：清空选中与跟随 =========
      if (!missileEntity?.id || typeof missileEntity.id !== 'string') {
        v.selectedEntity = undefined
        v.trackedEntity = undefined
        hideSelectedInfo()
        return
      }

      // ========= ✅ 关键：让绿色框跟随导弹，并自动锁定跟随视角 =========
      v.selectedEntity = missileEntity
      v.trackedEntity = missileEntity

      selectedInfo.visible = true
      selectedInfo.id = missileEntity.id
      updateSelectedInfo(missileEntity)

      // tick 里只刷新信息面板（绿色框/相机跟随由 Cesium 自动处理）
      if (!v.__missileOnTickBound) {
        v.__missileOnTickBound = true
        v.clock.onTick.addEventListener(() => {
          if (!selectedInfo.visible) return
          const e = v.entities.getById(selectedInfo.id)
          if (!e) {
            v.selectedEntity = undefined
            v.trackedEntity = undefined
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
