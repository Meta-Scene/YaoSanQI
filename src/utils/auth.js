/**
 * 轻量前端鉴权（无后端示例）
 *
 * 规则（按你的需求）：
 * 1) 管理员账号固定：admin / admin（不可注册管理员）
 * 2) 普通用户注册必须使用管理员发放的邀请码（一次性使用）
 *
 * localStorage:
 *  - auth: { token, username, role }
 *  - users: [{ username, password }]
 *  - admins: [{ username, password }]  // 仅种子管理员
 *  - invite_codes: [{ code, createdAt, usedAt, usedBy }]
 */

const AUTH_KEY = 'auth'
const USERS_KEY = 'users'
const ADMINS_KEY = 'admins'
const INVITE_KEY = 'invite_codes'

function nowISO() {
  return new Date().toISOString()
}

export function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuth({ username, role }) {
  const token = `${role}:${username}:${Date.now()}`
  const auth = { token, username, role }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
  return auth
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

/** 固定管理员：admin/admin（不可注册管理员） */
export function ensureSeedAdmins() {
  const raw = localStorage.getItem(ADMINS_KEY)
  if (!raw) {
    localStorage.setItem(ADMINS_KEY, JSON.stringify([{ username: 'admin', password: 'admin' }]))
  } else {
    // 如果有人把 admins 搞坏了，也兜底恢复
    try {
      const admins = JSON.parse(raw)
      if (!Array.isArray(admins) || admins.length === 0) {
        localStorage.setItem(ADMINS_KEY, JSON.stringify([{ username: 'admin', password: 'admin' }]))
      }
    } catch {
      localStorage.setItem(ADMINS_KEY, JSON.stringify([{ username: 'admin', password: 'admin' }]))
    }
  }
}

export function readAdmins() {
  ensureSeedAdmins()
  try {
    const admins = JSON.parse(localStorage.getItem(ADMINS_KEY) || '[]')
    return Array.isArray(admins) && admins.length ? admins : [{ username: 'admin', password: 'admin' }]
  } catch {
    return [{ username: 'admin', password: 'admin' }]
  }
}

export function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

/** 邀请码：一次性使用，管理员生成 */
export function readInviteCodes() {
  try {
    const codes = JSON.parse(localStorage.getItem(INVITE_KEY) || '[]')
    return Array.isArray(codes) ? codes : []
  } catch {
    return []
  }
}

function writeInviteCodes(list) {
  localStorage.setItem(INVITE_KEY, JSON.stringify(list))
}

function makeCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

/** 生成一个邀请码（未使用） */
export function generateInviteCode() {
  const list = readInviteCodes()

  // 尽量避免重复
  let code = makeCode(8)
  let guard = 0
  while (list.some(x => x.code === code) && guard < 20) {
    code = makeCode(8)
    guard++
  }

  const item = { code, createdAt: nowISO(), usedAt: null, usedBy: null }
  list.unshift(item)
  writeInviteCodes(list)
  return item
}

/** 删除邀请码（仅允许删除未使用的） */
export function deleteInviteCode(code) {
  const list = readInviteCodes()
  const hit = list.find(x => x.code === code)
  if (!hit) return { ok: false, message: '邀请码不存在' }
  if (hit.usedAt) return { ok: false, message: '已使用的邀请码不可删除' }
  writeInviteCodes(list.filter(x => x.code !== code))
  return { ok: true }
}

/** 注册时消费邀请码（一次性） */
export function consumeInviteCode(code, username) {
  const list = readInviteCodes()
  const hit = list.find(x => x.code === code)
  if (!hit) return { ok: false, message: '邀请码无效' }
  if (hit.usedAt) return { ok: false, message: '邀请码已被使用' }

  hit.usedAt = nowISO()
  hit.usedBy = username
  writeInviteCodes(list)
  return { ok: true }
}

/** 普通用户注册：必须带邀请码 */
export function registerUser({ username, password, inviteCode }) {
  const users = readUsers()
  if (!username || !password) return { ok: false, message: '请输入账号和密码' }
  if (users.some(u => u.username === username)) {
    return { ok: false, message: '用户名已存在' }
  }

  const code = String(inviteCode || '').trim().toUpperCase()
  if (!code) return { ok: false, message: '请输入管理员发放的邀请码' }

  const consume = consumeInviteCode(code, username)
  if (!consume.ok) return consume

  users.push({ username, password })
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return { ok: true }
}

export function verifyUser({ username, password }) {
  const users = readUsers()
  return users.some(u => u.username === username && u.password === password)
}

export function verifyAdmin({ username, password }) {
  const admins = readAdmins()
  return admins.some(u => u.username === username && u.password === password)
}
