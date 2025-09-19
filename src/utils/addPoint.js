import * as Cesium from 'cesium';

const addPoint = (viewer, coords, color = Cesium.Color.RED) => {
    if (!viewer.value) return;
    
    // 转换经纬度高度为Cesium坐标（注意：Cesium中是经度在前，纬度在后）
    const position = Cesium.Cartesian3.fromDegrees(
      coords.y,  // 经度
      coords.x,  // 纬度
      // coords.h   // 高度
    );
    
    // 创建点实体
    const pointEntity = viewer.value.entities.add({
      position: position,
      point: {
        pixelSize: 10,        // 点的像素大小
        color: color,         // 点的颜色
        outlineColor: Cesium.Color.WHITE,  // 点的轮廓颜色
        outlineWidth: 2,      // 点的轮廓宽度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND  // 高度参考方式
      },
      // 可选：添加标签显示坐标信息
      label: {
        text: `经:${coords.y.toFixed(2)}, 纬:${coords.x.toFixed(2)}`,
        font: '12px sans-serif',
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, 20),  // 标签偏移量
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      }
    });
}

export default addPoint;