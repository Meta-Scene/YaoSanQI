<script setup>
</script>
<template>
    <div class="layout">
        <div class="left">
            <img src="../assets/target.png" alt="">
        </div>
        <div class="right">
            <div class="info-panel">
                <div class="info-header">目标基本信息</div>
                <div class="info-item">
                    <div class="info-label">发射地</div>
                </div>
                <div class="info-item">
                    <div class="info-label">目标种类</div>
                </div>
                <div class="info-item">
                    <div class="info-label">目标运行路径</div>
                </div>
            </div>
        </div>
    </div>
</template>
<style lang="scss" scoped>
.layout {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-around;
    align-items: center;
    overflow: hidden;
    .left {
        display: flex;
        align-items: center;
        width: 80%;
        height: auto;  
        display: block;
        padding: 30px;
        margin-top: 50px;
        img{
            width: 80%;
            height: auto;
        }
    }
    
    .right {
        width: 20%;
        height: 90%;
        // background-color: #192c53;
        .info-panel {
            height: 100%;
            margin-right: 30px;
            background-color: #192c53;
            color: white;
            
            .info-header {
                height: 70px;
                line-height: 70px;
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                background-color: #1b3b7d;
        }
            
            .info-item {
                padding: 30px;
                font-size: 20px;
                
                .info-label {
                    font-size: 20;
                    padding: 10px 0;
                }
            }
        }
    }
}
</style>