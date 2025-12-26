<script setup>
import { ref, computed, onMounted } from 'vue'
import { generateInviteCode, readInviteCodes, deleteInviteCode } from '@/utils/auth'
import { ElMessage } from 'element-plus'

const codes = ref([])

function refresh() {
  codes.value = readInviteCodes()
}

function onGenerate() {
  const item = generateInviteCode()
  refresh()
  // 自动复制到剪贴板（失败也不影响）
  navigator.clipboard?.writeText(item.code).then(() => {
    ElMessage.success('已生成邀请码并复制到剪贴板')
  }).catch(() => {
    ElMessage.success('已生成邀请码')
  })
}

function onDelete(code) {
  const res = deleteInviteCode(code)
  if (!res.ok) return ElMessage.error(res.message || '删除失败')
  ElMessage.success('已删除')
  refresh()
}

const unused = computed(() => codes.value.filter(x => !x.usedAt))
const used = computed(() => codes.value.filter(x => !!x.usedAt))

onMounted(refresh)
</script>

<template>
  <div class="invite-page">
    <div class="header">
      <div class="title">邀请码管理</div>
      <el-button type="primary" @click="onGenerate">生成邀请码</el-button>
    </div>

    <el-alert
      title="普通用户注册必须填写邀请码；邀请码为一次性使用。点击“生成邀请码”会自动复制到剪贴板。"
      type="info"
      show-icon
      :closable="false"
      class="tip"
    />

    <el-card class="card">
      <template #header>
        <div class="card-title">未使用（{{ unused.length }}）</div>
      </template>

      <el-table :data="unused" style="width: 100%">
        <el-table-column prop="code" label="邀请码" min-width="180" />
        <el-table-column prop="createdAt" label="生成时间" min-width="200" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="navigator.clipboard?.writeText(row.code)">复制</el-button>
            <el-button size="small" type="danger" @click="onDelete(row.code)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="card">
      <template #header>
        <div class="card-title">已使用（{{ used.length }}）</div>
      </template>

      <el-table :data="used" style="width: 100%">
        <el-table-column prop="code" label="邀请码" min-width="180" />
        <el-table-column prop="usedBy" label="使用人" min-width="140" />
        <el-table-column prop="usedAt" label="使用时间" min-width="200" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.invite-page{
  padding: 16px;
}
.header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom: 12px;
}
.title{
  font-size: 18px;
  font-weight: 600;
}
.tip{
  margin-bottom: 14px;
}
.card{
  margin-bottom: 14px;
}
.card-title{
  font-weight: 600;
}
</style>
