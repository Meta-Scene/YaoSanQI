<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { setAuth, verifyUser, verifyAdmin, registerUser, ensureSeedAdmins } from '@/utils/auth'

const router = useRouter()
const route = useRoute()

const tab = ref('user') // user | admin | register

const userForm = ref({ username: '', password: '' })
const adminForm = ref({ username: '', password: '' })
const regForm = ref({ username: '', password: '', confirm: '', inviteCode: '' })

const captchaInput = ref('')
const captcha = ref('')

const errorMessage = ref('')

const redirectTo = computed(() => (route.query.redirect ? String(route.query.redirect) : null))

function genCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  captcha.value = s
  captchaInput.value = ''
}

function setError(msg) {
  errorMessage.value = msg
  setTimeout(() => (errorMessage.value = ''), 3000)
}

async function loginUser() {
  if (!userForm.value.username || !userForm.value.password) return setError('请输入账号和密码')
  if (captchaInput.value.toUpperCase() !== captcha.value) return setError('验证码错误')

  const ok = verifyUser({ username: userForm.value.username, password: userForm.value.password })
  if (!ok) return setError('账号或密码错误（用户）')

  setAuth({ username: userForm.value.username, role: 'user' })
  router.replace(redirectTo.value || '/')
}

async function loginAdmin() {
  if (!adminForm.value.username || !adminForm.value.password) return setError('请输入账号和密码')
  if (captchaInput.value.toUpperCase() !== captcha.value) return setError('验证码错误')

  const ok = verifyAdmin({ username: adminForm.value.username, password: adminForm.value.password })
  if (!ok) return setError('账号或密码错误（管理员）')

  setAuth({ username: adminForm.value.username, role: 'admin' })
  router.replace(redirectTo.value || '/home')
}

async function doRegister() {
  if (!regForm.value.username || !regForm.value.password) return setError('请输入账号和密码')
  if (regForm.value.password.length < 6) return setError('密码至少 6 位')
  if (regForm.value.password !== regForm.value.confirm) return setError('两次密码不一致')
  if (!regForm.value.inviteCode) return setError('请输入管理员发放的邀请码')
  if (captchaInput.value.toUpperCase() !== captcha.value) return setError('验证码错误')

  const res = registerUser({ username: regForm.value.username, password: regForm.value.password, inviteCode: regForm.value.inviteCode })
  if (!res.ok) return setError(res.message || '注册失败')

  // 注册成功，切到用户登录并带入账号
  tab.value = 'user'
  userForm.value.username = regForm.value.username
  userForm.value.password = ''
  setError('注册成功，请登录')
  genCaptcha()
}

onMounted(() => {
  ensureSeedAdmins()
  genCaptcha()
})
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="title">目标管理平台</div>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'user' }" @click="tab = 'user'">用户登录</button>
        <button class="tab" :class="{ active: tab === 'admin' }" @click="tab = 'admin'">管理员登录</button>
        <button class="tab" :class="{ active: tab === 'register' }" @click="tab = 'register'">注册</button>
      </div>

      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

      <!-- 用户登录 -->
      <div v-if="tab === 'user'" class="form">
        <input v-model="userForm.username" type="text" placeholder="用户名" />
        <input v-model="userForm.password" type="password" placeholder="密码" />

        <div class="captcha-row">
          <input v-model="captchaInput" type="text" placeholder="验证码" />
          <div class="captcha" title="点击刷新" @click="genCaptcha">{{ captcha }}</div>
        </div>

        <button @click="loginUser">登录</button>
      </div>

      <!-- 管理员登录 -->
      <div v-else-if="tab === 'admin'" class="form">
        <input v-model="adminForm.username" type="text" placeholder="管理员账号" />
        <input v-model="adminForm.password" type="password" placeholder="管理员密码" />

        <div class="captcha-row">
          <input v-model="captchaInput" type="text" placeholder="验证码" />
          <div class="captcha" title="点击刷新" @click="genCaptcha">{{ captcha }}</div>
        </div>

        <button @click="loginAdmin">登录</button>
        <div class="hint">默认管理员：admin / admin</div>
      </div>

      <!-- 注册 -->
      <div v-else class="form">
        <input v-model="regForm.username" type="text" placeholder="用户名" />
        <input v-model="regForm.password" type="password" placeholder="密码（至少 6 位）" />
        <input v-model="regForm.confirm" type="password" placeholder="确认密码" />
        <input v-model="regForm.inviteCode" type="text" placeholder="邀请码（管理员发放）" />

        <div class="captcha-row">
          <input v-model="captchaInput" type="text" placeholder="验证码" />
          <div class="captcha" title="点击刷新" @click="genCaptcha">{{ captcha }}</div>
        </div>

        <button @click="doRegister">注册</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0c1e40;
  padding: 24px;
}

.login-card {
  width: 360px;
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.title {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
}
.tab.active {
  border-color: #409eff;
  color: #409eff;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

input {
  height: 40px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}
input:focus {
  border-color: #409eff;
}

.captcha-row {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 10px;
  align-items: center;
}

.captcha {
  height: 40px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  border: 1px dashed #409eff;
  user-select: none;
  font-weight: 800;
  letter-spacing: 3px;
  cursor: pointer;
}

button {
  height: 40px;
  background: #409eff;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
button:hover {
  filter: brightness(0.95);
}

.error {
  color: #e91e63;
  margin-bottom: 10px;
  font-size: 13px;
  text-align: center;
}

.hint {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>