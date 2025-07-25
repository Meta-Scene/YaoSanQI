<script setup>
</script>
<template>
    <div class="layout">
        <div class="left">
            <div class="pic1"></div>
            <div class="pic2"></div>
        </div>
        <div class="right">
            <div class="wrapper">
                <div class="rec">
                <img src="../assets/detction_img/Rectangle.png" alt="">
                <span>相似度</span>
                </div>
            <div class="circle">
                <img src="../assets/detction_img/cicle.png" alt="">
                </div>
            </div>

        </div>
    </div>
</template>
<style lang="scss" scoped>
.layout{
    display: flex;
    width: 100%;
    height: 100%;
    .left{
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: pink;
        height: 100%;
        width: 80%;
        .pic1{
            margin-left: 30px;
            width: 45%;
            height: 80%;
            background-color: red;
        }
        .pic2{
            margin-right: 30px;
            width: 45%;
            height: 80%;
            background-color: blue;
        }
    }

    .right{
        display: flex;
        align-items: center;
        margin: 0 auto;
        .wrapper{
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 100px;
            height: 80%;
                .rec{
                    position: relative;
                    span{
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 30px;
                        font-weight: bold;
                        color: #FFFFFF;
                    }
                }
        }

    }
}
</style>