<script setup>
import { onMounted } from 'vue';
import * as Cesium from 'cesium';
import { useRouter } from 'vue-router';

const router = useRouter();

const goToHome = () => {
    router.push('/home');
};

onMounted(() => {
    //设置cesium的token 页面的登陆提示就没了
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNTZhYmJhYi04NTdiLTRjYmYtOWU2NC01OTBhYWJiOTBjMzgiLCJpZCI6MzExNDg2LCJpYXQiOjE3NDk2OTYxMzB9.uSAsttJXzI25DnO2DMDFanIwLM2OlJTJUSFsDjBbxIg'
    const viewer = new Cesium.Viewer('cesiumContainer', {
        // 可选：去除默认控件（如时间轴、动画控件等）
        animation: false,
        //是否播放动画
        animation: false,
        //是否显示时间轴
        timeline: false,
        creditContainer: "creditContainer",// 去除数据来源
    });

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
    /* Align with Cesium toolbar */
    right: 200px;
    /* Position to the left of the toolbar */
    z-index: 410;
    /* Ensure it's above the Cesium canvas */
    height: 32px;
    /* Match Cesium button height */
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
</style>