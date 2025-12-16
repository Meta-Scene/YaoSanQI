<script setup>
import { onMounted, ref } from 'vue';
import * as echarts from 'echarts';

const chartContainerVX = ref(null);
const chartContainerVY = ref(null);
const chartContainerVZ = ref(null);
let chartVX = null;
let chartVY = null;
let chartVZ = null;

// 解析数据函数
const parseTrajectoryData = (data) => {
  const lines = data.trim().split('\n');
  const timeData = [];
  const vxData = [];
  const vyData = [];
  const vzData = [];
  
  // 跳过标题和单位行
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    const columns = line.split(/\s+/);
    
    if (columns.length >= 7) {
      // TJ(时间)是第一列, VX(经度速度)是第5列, VY(纬度速度)是第6列, VZ(高度速度)是第7列
      const tj = parseFloat(columns[0]);
      const vx = parseFloat(columns[4]);
      const vy = parseFloat(columns[5]);
      const vz = parseFloat(columns[6]);
      
      if (!isNaN(tj) && !isNaN(vx) && !isNaN(vy) && !isNaN(vz)) {
        timeData.push(tj);
        vxData.push(vx);
        vyData.push(vy);
        vzData.push(vz);
      }
    }
  }
  
  return { timeData, vxData, vyData, vzData };
};

//图表配置
const createChartOption = (title, xData, yData, yAxisName, seriesName) => {
  return {
    title: {
      text: title,
      left: 'center',
      top: '5%',
      textStyle: {
        color: '#fff',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '10%',
      right: '5%',
      bottom: '15%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      name: '时间 (s)',
      nameLocation: 'middle',
      nameGap: 25,
      data: xData,
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        fontSize: 10,
        interval: Math.floor(xData.length / 10)
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameLocation: 'middle',
      nameGap: 40,
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        fontSize: 10
      }
    },
    series: [
      {
        name: seriesName,
        type: 'line',
        data: yData,
        lineStyle: {
          color: '#3676F6',
          width: 2
        },
        symbol: 'circle',
        symbolSize: 3,
        itemStyle: {
          color: '#3676F6'
        }
      }
    ]
  };
};

// 初始化图表
const initCharts = async () => {
  if (!chartContainerVX.value || !chartContainerVY.value || !chartContainerVZ.value) return;
  
  try {
    // 使用fetch获取文本文件内容
    const response = await fetch('/src/assets/data/HEAD1_TRAJ.txt');
    const textData = await response.text();
    
    // 解析数据
    const { timeData, vxData, vyData, vzData } = parseTrajectoryData(textData);
    
    // 创建VX图表
    chartVX = echarts.init(chartContainerVX.value);
    const optionVX = createChartOption('经度速度分析', timeData, vxData, '经度速度 (m/s)', '经度速度');
    chartVX.setOption(optionVX);
    
    // 创建VY图表
    chartVY = echarts.init(chartContainerVY.value);
    const optionVY = createChartOption('纬度速度分析', timeData, vyData, '纬度速度 (m/s)', '纬度速度');
    chartVY.setOption(optionVY);
    
    // 创建VZ图表
    chartVZ = echarts.init(chartContainerVZ.value);
    const optionVZ = createChartOption('高度速度分析', timeData, vzData, '高度速度 (m/s)', '高度速度');
    chartVZ.setOption(optionVZ);
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      chartVX && chartVX.resize();
      chartVY && chartVY.resize();
      chartVZ && chartVZ.resize();
    });
  } catch (error) {
    console.error('加载数据失败:', error);
  }
};

onMounted(() => {
  initCharts();
});
</script>

<template>
    <div class="layout">
        <div class="charts-grid">
            <div ref="chartContainerVX" class="chart-container"></div>
            <div ref="chartContainerVY" class="chart-container"></div>
            <div ref="chartContainerVZ" class="chart-container"></div>
            <div class="chart-container empty-chart">
                <span>预留图表位置</span>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.layout {
    width: 100%;
    height: 100%;
    background: url(../assets/instrument.png) no-repeat center center;
    background-size: 100% 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2%;
    box-sizing: border-box;
}

.charts-grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 20px;
}

.chart-container {
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 5px;
    width: 100%;
    height: 100%;
}

.empty-chart {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 16px;
    border: 1px dashed rgba(255, 255, 255, 0.3);
    background-color: rgba(0, 0, 0, 0.5);
}
</style>