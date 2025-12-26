<script setup>
import { useRouter } from 'vue-router'
import { clearAuth } from '@/utils/auth'
import { Menu as IconMenu, Location,VideoCamera,Box,Aim, Document, Compass } from '@element-plus/icons-vue'
const router = useRouter()
const goToEarth = () => {
  router.push('/')
}

const logout = () => {
  clearAuth()
  router.replace('/login')
}

</script>
<template>
    <div class="basic-layout">
        <div class="header">
            <div class="logo">
                <img src="../assets/rocket.png" alt="">
                <span>目标管理平台</span>
            </div>
            <div class="header-actions">
            <a class="back" href="javascript:void(0)" @click="goToEarth">返回地球</a>
            <a class="back logout" href="javascript:void(0)" @click="logout">登出</a>
          </div>
        </div>
        <div class="nav">
            <el-menu
                router
                default-active="4"
                class="el-menu-vertical"
                background-color="#0C1E40"
                text-color="#fff"
                active-text-color="#fff">
                <el-menu-item index="/record" :key="record">
                    <el-icon><Document /></el-icon>
                    <span>模拟记录查询</span>
                </el-menu-item>
                <!-- <el-menu-item index="/target" key="target">
                    <el-icon><Compass /></el-icon>
                    <span>目标模拟</span>
                </el-menu-item> -->
                <el-menu-item index="/instrument" key="instrument">
                    <el-icon><Box /></el-icon>
                    <span>仪器设计设置</span>
                </el-menu-item>
                <el-menu-item index="/spectrum" key="spectrum">
                    <el-icon><VideoCamera /></el-icon>
                    <span>光谱重建</span>
                </el-menu-item>
                <el-menu-item index="/detection" key="detection">
                    <el-icon><Aim /></el-icon>
                    <span>目标检测与识别</span>
                </el-menu-item>
                <el-menu-item index="/invite" key="invite">
                    <el-icon><IconMenu /></el-icon>
                    <span>邀请码管理</span>
                </el-menu-item>
            </el-menu>
        </div>
        <div class="content">
            <router-view></router-view>
        </div>
        
    </div>

</template>
<style lang="scss" scoped>
.basic-layout {
    width: 100%;
    height: 100vh;
    background-color: #f0f2f5;
    overflow: hidden;
    .header {
        width: 100%;
        height: 64px;
        background-color: #3676F6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        .logo {
            display: flex;
            align-items: center;
            margin-left: 20px;
            img {
                width: 30px;
                height: 30px;
            }
            span {
                font-size: 18px;
                font-weight: bold;
                color: #fff;
                margin-left: 10px;
            }
        }
        .header-actions{display:flex;gap:12px;align-items:center;}

        .back{
            text-decoration-line: none;
            color: #fff;
            margin-right: 30px;
                &:hover{
                    color:black;
                }
        }
    }
    .nav {
        position: fixed;
        top: 64px;
        left: 0;
        width: 200px;
        height: calc(100% - 64px);
        background-color: #0C1E40;
        .el-menu-vertical {
            border-right: none;
            width: 100%;
        }
    }
    .content {
        margin-left: 200px;
        height: calc(100% - 64px);
        overflow-y: auto;
    }
}
</style>