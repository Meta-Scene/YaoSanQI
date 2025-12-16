<script setup>
import { onMounted, ref, reactive } from 'vue';
import * as Cesium from 'cesium';
import { useRouter } from 'vue-router';
import convertStringToPoints from '@/utils/stringToPoint';
import addPoint from '@/utils/addPoint';
import api from '@/api';
import { createMissileFlight } from '@/utils/missileFlight';
const router = useRouter();
const viewer = ref(null);
const screenshotCount = ref(0);

// 目标飞行相关
const missileFlight = ref(null);
const isMissileFlying = ref(false);
// 第二个目标飞行实例与状态
const missileFlight2 = ref(null);
const isMissileFlying2 = ref(false);
// 第三个目标飞行实例与状态
const missileFlight3 = ref(null);
const isMissileFlying3 = ref(false);

// 控制表单显示/隐藏
const isFormVisible = ref(true);

// 表单数据
const formData = reactive({
    launchPoint1: '39.3 125.3 0 0',
    launchPoint2: '77.8447 -108.644 0 0'
});

const goToHome = () => {
    if(localStorage.getItem('account')=='admin'){
        router.push('/home');
    }else{
        router.push('/login');
    }
};

//截图函数
const takeScreenshot = () => {
  if (!viewer.value) return;

  //下一帧重新渲染（保险）（
  viewer.value.scene.requestRender();

  //监听“真正渲染完成”
  const removeListener = viewer.value.scene.postRender.addEventListener(() => {
    //只执行一次
    removeListener();
    //获取canvas 没获取到return
    const canvas = viewer.value.canvas;
    if (!canvas || canvas.width === 0) return;
    //把canvas转成二进制
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);

      // 从loacaStorage中存取
      let screenshots = JSON.parse(localStorage.getItem('cesium_screenshots') || '[]');
      if (screenshots.length >= 4) screenshots.shift();
      screenshots.push({ id: Date.now(), dataUrl: url, timestamp: new Date().toLocaleString() });
      localStorage.setItem('cesium_screenshots', JSON.stringify(screenshots));
      // 触发截图事件 它是跨组件的 任何组件都能监听
      window.dispatchEvent(new CustomEvent('screenshot-taken'));
      alert(`截图已保存，共 ${screenshots.length} 张`);
    });
  });
};

// 键盘事件监听
const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
        takeScreenshot();
    }
};

// 提交表单
const handleSubmit = async () => {
    try {
        const res=await api.generateStandardBallisticData({
            launch: formData.launchPoint1,
            target: formData.launchPoint2
        });
        if (res.code==200) {
            console.log('生成弹道数据成功:', res)
            
            // 添加起点和终点标记
            let startPoint=convertStringToPoints(formData.launchPoint1).startPoint
            let endPoint=convertStringToPoints(formData.launchPoint2).endPoint
            console.log(startPoint,endPoint)
            addPoint(viewer,startPoint,Cesium.Color.RED)
            addPoint(viewer,endPoint,Cesium.Color.BLUE)
            
            // 获取返回的code
            const trajectoryCode = res.data.code;
            console.log('获取到轨迹代码:', trajectoryCode);
            
            // 使用code获取详细弹道数据并启动导弹飞行
            if (trajectoryCode) {
                alert(`弹道数据生成成功！代码: ${trajectoryCode}，即将启动导弹飞行...`);
                await startMissileFlight(trajectoryCode);
            }
            
            // 清空表单
            formData.launchPoint1 = '';
            formData.launchPoint2 = '';
        } else {
            alert('提交失败，请重试');
        }
    } catch (error) {
        console.log(error)
        alert('提交失败,检查输入是否正确');
    }
};

// 切换表单显示/隐藏
const toggleForm = () => {
    isFormVisible.value = !isFormVisible.value;
};

// 目标飞行功能
const startMissileFlight = async (inCode) => {
    try {
        if (isMissileFlying.value) {
            alert('目标正在飞行中，请等待完成');
            return;
        }


        // 使用默认的code获取轨迹数据
        const code = inCode||"1756201531269"; // 你可以根据需要修改这个code
        const result = await api.getBallisticsDetailedList(code);
        
        if (result && result.data) {
            console.log('获取到轨迹数据:', result.data);
            
            // 创建目标飞行实例
            missileFlight.value = createMissileFlight(viewer.value);
            
            // 初始化目标
            if (missileFlight.value.initMissile(result.data)) {
                isMissileFlying.value = true;
                
                // 开始飞行，使用轨迹数据中的速度
                missileFlight.value.startFlight();
                
                // 监听飞行完成
                const checkFlightStatus = () => {
                    if (missileFlight.value) {
                        const isCompleted = missileFlight.value.isFlightCompleted();
                        console.log('检查飞行状态 - isCompleted:', isCompleted);
                        
                        if (isCompleted) {
                            console.log('检测到飞行完成，停止检查');
                            isMissileFlying.value = false;
                            alert('目标飞行完成！');
                            return;
                        }
                    }
                    // 继续检查
                    setTimeout(checkFlightStatus, 500);
                };
                checkFlightStatus();
                
                alert('目标开始飞行！');
            } else {
                alert('初始化目标失败');
            }
        } else {
            alert('获取轨迹数据失败');
        }
    } catch (error) {
        console.error('目标飞行错误:', error);
        alert('启动目标飞行失败: ' + error.message);
    }
};

// 第二个目标飞行功能
const startMissileFlight2 = async (inCode) => {
    try {
        if (isMissileFlying2.value) {
            alert('目标2正在飞行中，请等待完成');
            return;
        }

        const code = inCode||"1756201531269";
        const result = await api.getBallisticsDetailedList(code);
        
        if (result && result.data) {
            console.log('获取到轨迹数据2:', result.data);

            missileFlight2.value = createMissileFlight(viewer.value);

            if (missileFlight2.value.initMissile(result.data)) {
                isMissileFlying2.value = true;
                missileFlight2.value.startFlight();

                const checkFlightStatus2 = () => {
                    if (missileFlight2.value) {
                        const isCompleted = missileFlight2.value.isFlightCompleted();
                        console.log('检查飞行状态2 - isCompleted:', isCompleted);
                        if (isCompleted) {
                            console.log('检测到飞行完成2，停止检查');
                            isMissileFlying2.value = false;
                            alert('目标飞行2完成！');
                            return;
                        }
                    }
                    setTimeout(checkFlightStatus2, 500);
                };
                checkFlightStatus2();

                alert('目标2开始飞行！');
            } else {
                alert('初始化目标2失败');
            }
        } else {
            alert('获取轨迹数据失败');
        }
    } catch (error) {
        console.error('目标飞行2错误:', error);
        alert('启动目标飞行2失败: ' + error.message);
    }
};

// 第三个目标飞行功能
const startMissileFlight3 = async (inCode) => {
    try {
        if (isMissileFlying3.value) {
            alert('目标3正在飞行中，请等待完成');
            return;
        }

        const code = inCode||"1756201531269";
        const result = await api.getBallisticsDetailedList(code);
        
        if (result && result.data) {
            console.log('获取到轨迹数据3:', result.data);

            missileFlight3.value = createMissileFlight(viewer.value);

            if (missileFlight3.value.initMissile(result.data)) {
                isMissileFlying3.value = true;
                missileFlight3.value.startFlight();

                const checkFlightStatus3 = () => {
                    if (missileFlight3.value) {
                        const isCompleted = missileFlight3.value.isFlightCompleted();
                        console.log('检查飞行状态3 - isCompleted:', isCompleted);
                        if (isCompleted) {
                            console.log('检测到飞行完成3，停止检查');
                            isMissileFlying3.value = false;
                            alert('目标飞行3完成！');
                            return;
                        }
                    }
                    setTimeout(checkFlightStatus3, 500);
                };
                checkFlightStatus3();

                alert('目标3开始飞行！');
            } else {
                alert('初始化目标3失败');
            }
        } else {
            alert('获取轨迹数据失败');
        }
    } catch (error) {
        console.error('目标飞行3错误:', error);
        alert('启动目标飞行3失败: ' + error.message);
    }
};
//请求命中弹道详细数据
const getDetailedData = async (code) => {
    try {
        const result = await api.getBallisticsDetailedList(code);
        return result.data;
    } catch (error) {
        console.error('获取详细数据失败:', error);
    }
};
//
const getDataList=async ()=>{
    try {
        const result=await api.getStandardBallisticDataList()
        return result.data;
    } catch (error) {
        console.error('获取数据列表失败:', error);
    }
}
onMounted(async () => {
    //设置cesium的token 页面的登陆提示就没了
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'
    viewer.value = new Cesium.Viewer('cesiumContainer', {
        animation: true,
        timeline: true,
        creditContainer: "creditContainer",
    });
    // 按回车截图
    window.addEventListener('keydown', handleKeyDown);
    
    // 获取已有截图数量
    const screenshots = JSON.parse(localStorage.getItem('cesium_screenshots') || '[]');
    screenshotCount.value = screenshots.length;
    getDataList()
});
</script>

<template>
    <div id="cesiumContainer"></div>
    <div id="creditContainer" style="display: none;"></div>
    <button class="home-button" @click="goToHome">访问后台</button>
    
    <!-- 目标飞行按钮 -->
    <div class="missile-buttons-container">
        <button class="missile-button" @click="startMissileFlight(1756351099396)" :disabled="isMissileFlying">
            {{ isMissileFlying ? '目标飞行中...' : '目标飞行1' }}
        </button>
        <button class="missile-button" @click="startMissileFlight2(1756350115708)" :disabled="isMissileFlying2">
            {{ isMissileFlying2 ? '目标飞行中...' : '目标飞行2' }}
        </button>
        <button class="missile-button" @click="startMissileFlight3(1756201531269)" :disabled="isMissileFlying3">
            {{ isMissileFlying3 ? '目标飞行中...' : '目标飞行3' }}
        </button>
    </div>
    <!-- 箭头控制按钮 -->
    <div class="arrow-button" @click="toggleForm">
        <span class="arrow-icon" :class="{ 'arrow-left': isFormVisible, 'arrow-right': !isFormVisible }">
            {{ isFormVisible ? '‹' : '›' }}
        </span>
    </div>
    
    <!-- 输入框表单 -->
    <div class="input-form" :class="{ 'form-hidden': !isFormVisible }">
        <div class="form-group">
            <label>发射点和目标点1:</label>
            <input 
                type="text" 
                v-model="formData.launchPoint1" 
                placeholder="请输入发射点和目标点1"
                class="form-input"
            />
        </div>
        <div class="form-group">
            <label>发射点和目标点2:</label>
            <input 
                type="text" 
                v-model="formData.launchPoint2" 
                placeholder="请输入发射点和目标点2"
                class="form-input"
            />
        </div>
        <button class="submit-button" @click="handleSubmit">提交</button>
    </div>
</template>

<style scoped>
html,
body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

#cesiumContainer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
}

.cesium-viewer-bottom {
    display: none !important;
}

.home-button {
    position: absolute;
    top: 5px;
    right: 200px;
    z-index: 410;
    height: 32px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    background-color: #4a86c5;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.home-button:hover {
    background-color: #007bff;
}

.missile-buttons-container {
    position: absolute;
    top: 5px;
    left: 20px;
    z-index: 410;
    display: flex;
    flex-direction: column;
    gap: 8px;
}


.missile-button {
    height: 32px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    background-color:#007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.missile-button:hover:not(:disabled) {
    background-color: #007bff;
    transform: translateY(-1px);
}

.missile-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
    transform: none;
}

.screenshot-hint {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 100;
}

/* 输入框表单样式 */
.input-form {
    position: absolute;
    top: 20%;
    z-index: 1000;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;
    transition: transform 0.3s ease;
}

.form-hidden {
    transform: translateX(-100%);
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #333;
    font-size: 14px;
}

.form-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.8);
    transition: border-color 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: #4a86c5;
    box-shadow: 0 0 0 2px rgba(74, 134, 197, 0.2);
}

.submit-button {
    width: 100%;
    padding: 10px;
    background-color: #4a86c5;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.submit-button:hover {
    background-color: #3676F6;
}

.submit-button:active {
    transform: translateY(1px);
}

/* 箭头按钮样式 */
.arrow-button {
    position: absolute;
    top: 27%;
    left: 0px;
    z-index: 1001;
    width: 20px;
    height: 50px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
}

.arrow-button:hover {
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.arrow-icon {
    font-size: 20px;
    font-weight: bold;
    color: #4a86c5;
    transition: transform 0.3s ease;
}


</style>