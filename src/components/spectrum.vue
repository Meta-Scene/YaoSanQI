<script setup>
import { ref, onMounted, watch } from 'vue';
import { showLargeImage } from '@/utils/largeImage';
// 截图数据
const screenshots = ref([]);

// 监听localStorage中的截图数据变化
const loadScreenshots = () => {
    try {
        const storedScreenshots = JSON.parse(localStorage.getItem('cesium_screenshots') || '[]');
        screenshots.value = storedScreenshots;
    } catch (error) {
        console.error('加载截图失败:', error);
    }
};

onMounted(() => {
    loadScreenshots();
    
    // 添加storage事件监听器，当其他页面更改localStorage时更新数据
    window.addEventListener('storage', (event) => {
        if (event.key === 'cesium_screenshots') {
            loadScreenshots();
        }
    });
    
    // 监听自定义截图事件
    window.addEventListener('screenshot-taken', () => {
        loadScreenshots();
    });
});

// 获取特定索引的截图，如果不存在则返回null
const getScreenshotAt = (index) => {
    return screenshots.value[index] || null;
};

// 删除截图
const deleteScreenshot = (index) => {
    let storedScreenshots = JSON.parse(localStorage.getItem('cesium_screenshots') || '[]');
    
    // 检查索引是否有效
    if (index >= 0 && index < storedScreenshots.length) {
        // 如果截图的 dataUrl 是 createObjectURL 创建的，需要释放它
        if (storedScreenshots[index].dataUrl.startsWith('blob:')) {
            URL.revokeObjectURL(storedScreenshots[index].dataUrl);
        }
        
        // 从数组中删除截图
        storedScreenshots.splice(index, 1);
        
        // 更新 localStorage
        localStorage.setItem('cesium_screenshots', JSON.stringify(storedScreenshots));
        
        // 更新本地数据
        loadScreenshots();
    }
};

</script>
<template>
    <div class="spectrum-container">
        <div class="spectrum-grid">
            <div class="spectrum-box box1" :class="{'has-image': getScreenshotAt(0)}">
                <div v-if="getScreenshotAt(0)" class="image-container">
                    <img :src="getScreenshotAt(0).dataUrl" 
                         alt="截图1" 
                         @click="showLargeImage(getScreenshotAt(0).dataUrl)" />
                    <div class="delete-button" @click.stop="deleteScreenshot(0)">
                        <i class="delete-icon">x</i>
                    </div>
                </div>
                <span v-else>等待截图</span>
            </div>
            <div class="spectrum-box box2" :class="{'has-image': getScreenshotAt(1)}">
                <div v-if="getScreenshotAt(1)" class="image-container">
                    <img :src="getScreenshotAt(1).dataUrl" 
                         alt="截图2" 
                         @click="showLargeImage(getScreenshotAt(1).dataUrl)" />
                    <div class="delete-button" @click.stop="deleteScreenshot(1)">
                        <i class="delete-icon">x</i>
                    </div>
                </div>
                <span v-else>等待截图</span>
            </div>
            <div class="spectrum-box box3" :class="{'has-image': getScreenshotAt(2)}">
                <div v-if="getScreenshotAt(2)" class="image-container">
                    <img :src="getScreenshotAt(2).dataUrl" 
                         alt="截图3" 
                         @click="showLargeImage(getScreenshotAt(2).dataUrl)" />
                    <div class="delete-button" @click.stop="deleteScreenshot(2)">
                        <i class="delete-icon">x</i>
                    </div>
                </div>
                <span v-else>等待截图</span>
            </div>
            <div class="spectrum-box box4" :class="{'has-image': getScreenshotAt(3)}">
                <div v-if="getScreenshotAt(3)" class="image-container">
                    <img :src="getScreenshotAt(3).dataUrl" 
                         alt="截图4" 
                         @click="showLargeImage(getScreenshotAt(3).dataUrl)" />
                    <div class="delete-button" @click.stop="deleteScreenshot(3)">
                        <i class="delete-icon">x</i>
                    </div>
                </div>
                <span v-else>等待截图</span>
            </div>
        </div>
        <div class="screenshot-info" v-if="screenshots.length > 0">
            已保存 {{ screenshots.length }} 张截图
        </div>
    </div>
</template>
<style lang="scss" scoped>
.spectrum-container {
    width: 100%;
    height: 100%;
    padding: 1rem;
    background-color: #e8eef1;
    box-sizing: border-box;
}

.spectrum-grid {
    width: 100%;
    height: 90%; 
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 1rem;
}

.spectrum-box {
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #ddd;
    font-size: 1.5rem;
    font-weight: bold;
    background-color: #fff;
}

.box1, .box2, .box3, .box4 {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    background-color: #f5f5f5;
    
    span {
        color: #999;
        font-size: 1rem;
    }
    
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        cursor: pointer;
        transition: transform 0.2s ease;
        
        &:hover {
            transform: scale(1.02);
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
    }
}

.has-image {
    padding: 0;
    border-color: #3676F6;
    box-shadow: 0 0 8px rgba(54, 118, 246, 0.5);
}

.image-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.delete-button {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.image-container:hover .delete-button {
    opacity: 1;
}

.delete-icon {
    color: white;
    font-size: 16px;
    font-style: normal;
    font-weight: bold;
}


.screenshot-info {
    margin-top: 1rem;
    text-align: center;
    color: #3676F6;
    font-weight: bold;
}
</style>