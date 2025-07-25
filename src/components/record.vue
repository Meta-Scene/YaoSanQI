<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';

// 搜索表单
const searchForm = reactive({
  recordNumber: '',
  simulationDate: ''
});

// 生成模拟数据
const generateMockData = () => {
  const data = [];
  for (let i = 1; i <= 50; i++) {
    // 随机生成坐标
    const startLat = (30 + Math.random() * 10).toFixed(4);
    const startLng = (104 + Math.random() * 10).toFixed(4);
    const endLat = (35 + Math.random() * 10).toFixed(4);
    const endLng = (110 + Math.random() * 10).toFixed(4);
    
    // 随机生成日期 (过去30天内)
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const simulationDate = date.toISOString().split('T')[0];
    
    // 随机状态
    const status = Math.random() > 0.5 ? '已完成' : '正在运行';
    
    // 随机总时间 (5-60分钟)
    const totalTime = Math.floor(5 + Math.random() * 55) + '分钟';
    
    data.push({
      id: i,
      recordNumber: `REC${String(i).padStart(4, '0')}`,
      simulationDate,
      startPoint: `${startLat}, ${startLng}`,
      endPoint: `${endLat}, ${endLng}`,
      status,
      totalTime,
      missileInfo: {
        launchSite: ['四川发射基地', '北京发射中心', '海南发射场', '内蒙古发射站'][Math.floor(Math.random() * 4)],
        missileType: ['远程导弹', '中程导弹', '近程导弹', '战略导弹'][Math.floor(Math.random() * 4)],
        trajectory: ['抛物线轨迹', '直线轨迹', '复合轨迹', '变轨轨迹'][Math.floor(Math.random() * 4)]
      }
    });
  }
  return data;
};

// 所有数据
const allData = ref(generateMockData());

// 表格数据
const tableData = ref([]);

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize:20,
  total: 0
});

// 初始化加载数据
onMounted(() => {
  pagination.total = allData.value.length;
  updateTableData();
});

// 重置表单
const resetForm = () => {
  searchForm.recordNumber = '';
  searchForm.simulationDate = '';
  handleSearch();
};

// 搜索处理
const handleSearch = () => {
  let results = [...allData.value];
  
  // 筛选记录编号
  if (searchForm.recordNumber) {
    results = results.filter(item => 
      item.recordNumber.toLowerCase().includes(searchForm.recordNumber.toLowerCase())
    );
  }
  
  // 筛选模拟日期
  if (searchForm.simulationDate) {
    results = results.filter(item => 
      item.simulationDate === searchForm.simulationDate
    );
  }
  
  // 更新分页信息
  pagination.total = results.length;
  pagination.currentPage = 1;
  
  // 更新表格数据
  filteredData.value = results;
  updateTableData();
};

// 存储筛选后的数据
const filteredData = ref([]);

// 更新表格数据
const updateTableData = () => {
  const data = filteredData.value.length > 0 ? filteredData.value : allData.value;
  const start = (pagination.currentPage - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  tableData.value = data.slice(start, end);
};

// 页码变化
const handleCurrentChange = (val) => {
  pagination.currentPage = val;
  updateTableData();
};

// 每页条数变化
const handleSizeChange = (val) => {
  pagination.pageSize = val;
  pagination.currentPage = 1; // 重置到第一页
  updateTableData();
};

// 弹窗相关
const dialogVisible = ref(false);
const currentMissileInfo = ref(null);

// 查看导弹信息
const handleViewMissileInfo = (row) => {
  currentMissileInfo.value = row.missileInfo;
  dialogVisible.value = true;
};

// 删除记录
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除记录 ${row.recordNumber} 吗?`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      // 从数据源中移除
      allData.value = allData.value.filter(item => item.id !== row.id);
      
      // 更新筛选后的数据
      if (filteredData.value.length > 0) {
        filteredData.value = filteredData.value.filter(item => item.id !== row.id);
      }
      
      // 更新分页信息
      pagination.total = filteredData.value.length > 0 ? filteredData.value.length : allData.value.length;
      
      // 更新表格
      updateTableData();
      
      ElMessage({
        type: 'success',
        message: '删除成功',
      });
    })
    .catch(() => {
      // 取消删除
    });
};
</script>

<template>
  <div class="record-container">
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" class="search-form">
        <el-form-item label="模拟记录编号">
          <el-input v-model="searchForm.recordNumber" placeholder="请输入" clearable></el-input>
        </el-form-item>
        <el-form-item label="模拟日期">
          <el-date-picker
            v-model="searchForm.simulationDate"
            type="date"
            placeholder="选择日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格区域 -->
    <div class="table-area">
      <el-table :data="tableData" style="width: 100%;height:100%" border>
        <el-table-column prop="id" label="ID" ></el-table-column>
        <el-table-column prop="recordNumber" label="记录编号" ></el-table-column>
        <el-table-column prop="simulationDate" label="模拟日期" ></el-table-column>
        <el-table-column prop="startPoint" label="起始点" ></el-table-column>
        <el-table-column prop="endPoint" label="目标点" ></el-table-column>
        <el-table-column prop="status" label="状态" >
          <template #default="scope">
            <el-tag :type="scope.row.status === '已完成' ? 'success' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalTime" label="总时间" ></el-table-column>
        <el-table-column label="操作"  fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleViewMissileInfo(scope.row)">导弹信息</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 导弹信息弹窗 -->
    <el-dialog v-model="dialogVisible" title="导弹详细信息" width="30%">
      <div v-if="currentMissileInfo" class="missile-info">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="发射地">{{ currentMissileInfo.launchSite }}</el-descriptions-item>
          <el-descriptions-item label="导弹种类">{{ currentMissileInfo.missileType }}</el-descriptions-item>
          <el-descriptions-item label="导弹运行路径">{{ currentMissileInfo.trajectory }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分页区域 -->
    <div class="pagination-area">
      <div class="pagination-info">总共 {{ pagination.total }} 条记录</div>
      <div class="pagination-container">
        <el-select v-model="pagination.pageSize" class="page-size-select" @change="handleSizeChange">
          <el-option :value="5" label="5条/页" />
          <el-option :value="10" label="10条/页" />
          <el-option :value="20" label="20条/页" />
        </el-select>
        <span class="page-text">第</span>
        <el-pagination
          v-model:current-page="pagination.currentPage"
          :page-size="pagination.pageSize"
          :pager-count="5"
          layout="prev, pager, next"
          :total="pagination.total"
          @current-change="handleCurrentChange"
          small
          background
        ></el-pagination>
        <span class="page-text">页</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.record-container {
  width: 100%;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.search-area {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 0.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.table-area {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 0.25rem;
  margin-bottom: 1rem;
  flex: 1;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  overflow: auto;
}

.pagination-area {
  padding: 1rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.pagination-info {
  color: #666;
  font-size: 14px;
}

.pagination-container {
  display: flex;
  align-items: center;
}

.page-text {
  margin: 0 8px;
  font-size: 14px;
  color: #666;
}

.page-size-select {
  width: 100px;
  margin-right: 15px;
}

.missile-info {
  padding: 1rem 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>