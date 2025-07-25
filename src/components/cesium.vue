<script setup>
import { onMounted, ref } from 'vue';
import * as Cesium from 'cesium';
import { useRouter } from 'vue-router';

const router = useRouter();
const viewer = ref(null);
const screenshotCount = ref(0);

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

onMounted(() => {
    //设置cesium的token 页面的登陆提示就没了
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'
    viewer.value = new Cesium.Viewer('cesiumContainer', {
        animation: false,
        animation: false,
        timeline: false,
        creditContainer: "creditContainer",
    });
    
    // 按回车截图
    window.addEventListener('keydown', handleKeyDown);
    
    // 获取已有截图数量
    const screenshots = JSON.parse(localStorage.getItem('cesium_screenshots') || '[]');
    screenshotCount.value = screenshots.length;
});
</script>

<template>
    <div id="cesiumContainer"></div>
    <div id="creditContainer" style="display: none;"></div>
    <button class="home-button" @click="goToHome">访问后台</button>
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


</style>