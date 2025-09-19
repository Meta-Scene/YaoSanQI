import * as Cesium from 'cesium';

// 目标飞行类
class MissileFlight {
    constructor(viewer) {
        this.viewer = viewer;
        this.missileEntity = null;
        this.trajectoryPoints = [];
        this.currentIndex = 0;
        this.isFlying = false;
        this.animationId = null;
    }

    // 初始化目标实体
    initMissile(trajectoryData) {
        if (!trajectoryData || trajectoryData.length === 0) {
            console.error('轨迹数据为空');
            return false;
        }

        this.trajectoryPoints = trajectoryData;
        this.currentIndex = 0;

        // 打印轨迹数据基本信息
        console.log('=== 目标轨迹数据初始化 ===');
        console.log(`总轨迹点数: ${trajectoryData.length}`);
        console.log('起始点:', {
            tj: trajectoryData[0].tj,
            longitude: trajectoryData[0].longitude,
            latitude: trajectoryData[0].latitude,
            elevation: trajectoryData[0].elevation
        });
        console.log('结束点:', {
            tj: trajectoryData[trajectoryData.length - 1].tj,
            longitude: trajectoryData[trajectoryData.length - 1].longitude,
            latitude: trajectoryData[trajectoryData.length - 1].latitude,
            elevation: trajectoryData[trajectoryData.length - 1].elevation
        });
        console.log('=====================================');

        // 获取起始点
        const startPoint = this.trajectoryPoints[0];
        const position = Cesium.Cartesian3.fromDegrees(
            parseFloat(startPoint.longitude),
            parseFloat(startPoint.latitude),
            parseFloat(startPoint.elevation)
        );

        // 移除之前的目标实体
        if (this.missileEntity) {
            this.viewer.entities.remove(this.missileEntity);
        }

        // 清除之前的轨迹线
        this.clearTrajectoryLines();

        // 创建目标实体
        this.missileEntity = this.viewer.entities.add({
            position: position,
            name: '导弹目标',
            description: `
                <div style="font-family: Arial, sans-serif; padding: 15px; min-width: 250px;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <img src="/daodan.svg" alt="Logo" style="width: 48px; height: 48px; margin-bottom: 10px;" />
                        <h3 style="margin: 0; color: #2c3e50;">导弹目标信息</h3>
                    </div>
                    <div style="border-top: 2px solid #3498db; padding-top: 15px;">
                        <p style="margin: 8px 0;"><strong>目标类型:</strong> 弹道导弹</p>
                        <p style="margin: 8px 0;"><strong>当前位置:</strong></p>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li>经度: ${parseFloat(startPoint.longitude).toFixed(6)}°</li>
                            <li>纬度: ${parseFloat(startPoint.latitude).toFixed(6)}°</li>
                            <li>高度: ${parseFloat(startPoint.elevation).toFixed(2)}m</li>
                        </ul>
                        <p style="margin: 8px 0;"><strong>飞行状态:</strong> 
                            <span style="color: #27ae60; font-weight: bold;">就绪</span>
                        </p>
                        <p style="margin: 8px 0;"><strong>轨迹点数:</strong> ${trajectoryData.length} 个</p>
                    </div>
                    <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
                        <small style="color: #7f8c8d;">点击查看目标详细信息</small>
                    </div>
                </div>
            `,
            billboard: {
                image: '/daodan.svg',
                scale: 0.3,
                color: Cesium.Color.WHITE,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.CENTER
            },
            label: {
                text: '目标',
                font: '14pt sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -50)
            }
        });

        return true;
    }

    // 更新目标描述信息
    updateMissileDescription() {
        if (!this.missileEntity || this.trajectoryPoints.length === 0) return;
        
        const currentPoint = this.trajectoryPoints[this.currentIndex] || this.trajectoryPoints[0];
        const flightStatus = this.isFlying ? 
            `<span style="color: #e74c3c; font-weight: bold;">飞行中 (${this.currentIndex + 1}/${this.trajectoryPoints.length})</span>` :
            `<span style="color: #27ae60; font-weight: bold;">就绪</span>`;
        
        const progress = this.trajectoryPoints.length > 0 ? 
            ((this.currentIndex / this.trajectoryPoints.length) * 100).toFixed(1) : 0;
        
        this.missileEntity.description = `
            <div style="font-family: Arial, sans-serif; padding: 15px; min-width: 250px;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <img src="/daodan.svg" alt="Logo" style="width: 48px; height: 48px; margin-bottom: 10px;" />
                    <h3 style="margin: 0; color: #2c3e50;">导弹目标信息</h3>
                </div>
                <div style="border-top: 2px solid #3498db; padding-top: 15px;">
                    <p style="margin: 8px 0;"><strong>目标类型:</strong> 弹道导弹</p>
                    <p style="margin: 8px 0;"><strong>当前位置:</strong></p>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>经度: ${parseFloat(currentPoint.longitude).toFixed(6)}°</li>
                        <li>纬度: ${parseFloat(currentPoint.latitude).toFixed(6)}°</li>
                        <li>高度: ${parseFloat(currentPoint.elevation).toFixed(2)}m</li>
                    </ul>
                    <p style="margin: 8px 0;"><strong>飞行状态:</strong> ${flightStatus}</p>
                    <p style="margin: 8px 0;"><strong>轨迹点数:</strong> ${this.trajectoryPoints.length} 个</p>
                    ${this.isFlying ? `<p style="margin: 8px 0;"><strong>飞行进度:</strong> ${progress}%</p>` : ''}
                    ${this.isFlying && currentPoint.vx !== undefined ? `
                    <p style="margin: 8px 0;"><strong>速度向量:</strong></p>
                    <ul style="margin: 5px 0; padding-left: 20px; font-size: 12px;">
                        <li>Vx: ${parseFloat(currentPoint.vx).toFixed(2)} m/s</li>
                        <li>Vy: ${parseFloat(currentPoint.vy).toFixed(2)} m/s</li>
                        <li>Vz: ${parseFloat(currentPoint.vz).toFixed(2)} m/s</li>
                    </ul>
                    ` : ''}
                </div>
                <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
                    <small style="color: #7f8c8d;">点击查看目标详细信息</small>
                </div>
            </div>
        `;
    }

    // 开始飞行
    startFlight(customSpeed = null) {
        if (this.isFlying || !this.missileEntity) {
            return;
        }

        this.isFlying = true;
        this.currentIndex = 0;
        this.customSpeed = customSpeed; // 保存自定义速度
        
        // 确保目标从起始位置开始
        const startPoint = this.trajectoryPoints[0];
        const startPosition = Cesium.Cartesian3.fromDegrees(
            parseFloat(startPoint.longitude),
            parseFloat(startPoint.latitude),
            parseFloat(startPoint.elevation)
        );
        
        this.missileEntity.position = startPosition;
        this.missileEntity.label.position = startPosition;
        
        // 更新描述信息
        this.updateMissileDescription();
        
        console.log('开始飞行，自定义速度:', this.customSpeed, '米/秒');
        this.flyToNextPoint();
    }

    // 飞行到下一个点
    flyToNextPoint() {
        if (!this.isFlying || this.currentIndex >= this.trajectoryPoints.length) {
            this.stopFlight();
            return;
        }

        const currentPoint = this.trajectoryPoints[this.currentIndex];
        const nextIndex = this.currentIndex + 1;

        // 打印当前使用的轨迹数据
        console.log(`=== 目标飞行数据 [${this.currentIndex + 1}/${this.trajectoryPoints.length}] ===`);
        console.log('当前点数据:', {
            index: this.currentIndex,
            tj: currentPoint.tj,
            longitude: currentPoint.longitude,
            latitude: currentPoint.latitude,
            elevation: currentPoint.elevation,
            vx: currentPoint.vx,
            vy: currentPoint.vy,
            vz: currentPoint.vz
        });

        if (nextIndex < this.trajectoryPoints.length) {
            const nextPoint = this.trajectoryPoints[nextIndex];
            
            // 打印下一个点数据
            console.log('下一个点数据:', {
                index: nextIndex,
                tj: nextPoint.tj,
                longitude: nextPoint.longitude,
                latitude: nextPoint.latitude,
                elevation: nextPoint.elevation,
                vx: nextPoint.vx,
                vy: nextPoint.vy,
                vz: nextPoint.vz
            });
            
            // 创建当前位置和下一个位置
            const currentPosition = Cesium.Cartesian3.fromDegrees(
                parseFloat(currentPoint.longitude),
                parseFloat(currentPoint.latitude),
                parseFloat(currentPoint.elevation)
            );
            
            const nextPosition = Cesium.Cartesian3.fromDegrees(
                parseFloat(nextPoint.longitude),
                parseFloat(nextPoint.latitude),
                parseFloat(nextPoint.elevation)
            );

            // 计算飞行时间（基于自定义速度）
            let duration;
            if (this.customSpeed && this.customSpeed > 0) {
                // 使用自定义速度计算飞行时间
                const distance = this.calculateDistance(currentPosition, nextPosition);
                duration = Math.max((distance / this.customSpeed) * 1000, 20); // 转换为毫秒，最小20ms
                console.log(`自定义速度飞行: 距离=${distance.toFixed(2)}米, 速度=${this.customSpeed}米/秒, 时间=${duration.toFixed(0)}ms`);
            } else {
                // 使用原来的API时间间隔
                const currentTime = parseFloat(currentPoint.tj);
                const nextTime = parseFloat(nextPoint.tj);
                duration = Math.max((nextTime - currentTime) * 33, 30);
                console.log(`API时间间隔飞行: ${duration}ms (${nextTime - currentTime}s)`);
            }

            // 先添加轨迹线（从当前位置到下一个位置）
            this.addTrajectoryLine(currentPosition, nextPosition);

            // 然后更新目标位置到下一个位置
            this.missileEntity.position = nextPosition;
            this.missileEntity.label.position = nextPosition;
            
            // 更新描述信息（每10个点更新一次，减少性能开销）
            if (this.currentIndex % 10 === 0) {
                this.updateMissileDescription();
            }

            console.log(`目标移动到: 经度=${nextPoint.longitude}, 纬度=${nextPoint.latitude}, 高度=${nextPoint.elevation}`);
            console.log(`当前轨迹线数量: ${this.getTrajectoryLineCount()}`);
            console.log('=====================================');

            // 使用 requestAnimationFrame 确保轨迹线绘制完成后再继续
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.currentIndex = nextIndex;
                    this.flyToNextPoint();
                }, duration);
            });
        } else {
            // 到达最后一个点，完成飞行
            console.log('=== 目标飞行完成 ===');
            console.log('最终位置:', {
                tj: currentPoint.tj,
                longitude: currentPoint.longitude,
                latitude: currentPoint.latitude,
                elevation: currentPoint.elevation
            });
            console.log('=====================================');
            this.stopFlight();
        }
    }

    // 验证位置是否有效
    isValidPosition(position) {
        if (!position) return false;
        
        // 检查是否为有效的Cartesian3坐标
        if (!Cesium.Cartesian3.equals(position, Cesium.Cartesian3.ZERO)) {
            const x = position.x;
            const y = position.y;
            const z = position.z;
            
            // 检查坐标值是否为有效数字
            return !isNaN(x) && !isNaN(y) && !isNaN(z) && 
                   isFinite(x) && isFinite(y) && isFinite(z);
        }
        
        return false;
    }

    // 添加轨迹线
    addTrajectoryLine(startPosition, endPosition) {
        try {
            // 再次验证位置
            if (!this.isValidPosition(startPosition) || !this.isValidPosition(endPosition)) {
                console.error('轨迹线位置无效，跳过绘制');
                return;
            }
            
            // 检查两点是否相同（避免零长度线段）
            if (Cesium.Cartesian3.equals(startPosition, endPosition)) {
                console.log('跳过零长度轨迹线段');
                return;
            }
            
            const entity = this.viewer.entities.add({
                polyline: {
                    positions: [startPosition, endPosition],
                    width: 4,  // 稍微增加线宽，更容易看到
                    material: Cesium.Color.YELLOW,
                    clampToGround: false
                }
            });
            
            // 强制重新渲染，确保轨迹线立即显示
            this.viewer.scene.requestRender();
            
            console.log('轨迹线已添加');
        } catch (error) {
            console.error('添加轨迹线失败:', error);
        }
    }

    // 清除所有轨迹线
    clearTrajectoryLines() {
        // 清除所有polyline实体
        const entities = this.viewer.entities.values;
        for (let i = entities.length - 1; i >= 0; i--) {
            const entity = entities[i];
            if (entity.polyline) {
                this.viewer.entities.remove(entity);
            }
        }
    }

    // 停止飞行
    stopFlight() {
        this.isFlying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // 更新描述信息为完成状态
        this.updateMissileDescription();
        
        console.log('目标飞行完成');
    }

    // 重置目标
    reset() {
        this.stopFlight();
        if (this.missileEntity) {
            this.viewer.entities.remove(this.missileEntity);
            this.missileEntity = null;
        }
        this.trajectoryPoints = [];
        this.currentIndex = 0;
    }

    // 获取飞行状态
    getFlightStatus() {
        return {
            isFlying: this.isFlying,
            currentIndex: this.currentIndex,
            totalPoints: this.trajectoryPoints.length,
            progress: this.trajectoryPoints.length > 0 ? (this.currentIndex / this.trajectoryPoints.length * 100).toFixed(1) : 0
        };
    }

    // 检查是否飞行完成
    isFlightCompleted() {
        const isCompleted = !this.isFlying || this.currentIndex >= this.trajectoryPoints.length;
        
        // 添加详细的调试信息
        console.log('=== 飞行完成检查 ===');
        console.log('isFlying:', this.isFlying);
        console.log('currentIndex:', this.currentIndex);
        console.log('trajectoryPoints.length:', this.trajectoryPoints.length);
        console.log('currentIndex >= trajectoryPoints.length:', this.currentIndex >= this.trajectoryPoints.length);
        console.log('isCompleted:', isCompleted);
        console.log('========================');
        
        return isCompleted;
    }

    // 获取当前轨迹线数量
    getTrajectoryLineCount() {
        const entities = this.viewer.entities.values;
        let count = 0;
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.polyline) {
                count++;
            }
        }
        return count;
    }

    // 计算两点之间的距离（米）
    calculateDistance(position1, position2) {
        if (!position1 || !position2) return 0;
        
        // 使用Cesium的Cartesian3.distance方法计算3D距离
        const distance = Cesium.Cartesian3.distance(position1, position2);
        return distance;
    }
}

// 创建目标飞行实例
export function createMissileFlight(viewer) {
    return new MissileFlight(viewer);
}

// 使用轨迹数据启动目标飞行
export async function startMissileFlightWithData(viewer, trajectoryData) {
    const missileFlight = createMissileFlight(viewer);
    
    if (missileFlight.initMissile(trajectoryData)) {
        missileFlight.startFlight();
        return missileFlight;
    } else {
        console.error('初始化目标失败');
        return null;
    }
}
