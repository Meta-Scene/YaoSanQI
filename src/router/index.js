import { createRouter, createWebHashHistory } from "vue-router";
import { getAuth } from "@/utils/auth";

const routes = [
  // ✅ 旧页面：保持不动（原来的 Cesium.vue）
  {
    path: "/",
    name: "cesium",
    meta: { requiresAuth: true, roles: ["user", "admin"] },
    component: () => import("@/views/Cesium.vue"),
  },

  // ✅ 新页面：拆分后的 CesiumSimPage.vue（并存）
  {
    path: "/sim",
    name: "cesium-sim",
    meta: { requiresAuth: true, roles: ["user", "admin"] },
    component: () => import("@/views/CesiumSimPage.vue"),
  },

  // 登录
  {
    path: "/login",
    name: "login",
    meta: { public: true },
    component: () => import("@/views/Login.vue"),
  },

  // 后台（管理员）
  {
    path: "/home",
    name: "home",
    meta: { requiresAuth: true, roles: ["admin"] },
    component: () => import("@/layouts/BasicLayout.vue"),
    redirect: "/record",
    children: [
      {
        name: "record",
        path: "/record",
        meta: { requiresAuth: true },
        component: () => import("@/views/Record.vue"),
      },
      {
        name: "target",
        path: "/target",
        meta: { requiresAuth: true },
        component: () => import("@/views/Target.vue"),
      },
      {
        name: "instrument",
        path: "/instrument",
        meta: { requiresAuth: true },
        component: () => import("@/views/Instrument.vue"),
      },
      {
        name: "spectrum",
        path: "/spectrum",
        meta: { requiresAuth: true },
        component: () => import("@/views/Spectrum.vue"),
      },
      {
        name: "detection",
        path: "/detection",
        meta: { requiresAuth: true },
        component: () => import("@/views/Detection.vue"),
      },
      {
        name: "invite",
        path: "/invite",
        meta: { requiresAuth: true },
        component: () => import("@/views/Invite.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// ✅ 路由拦截（登录前置 + 分级权限）
router.beforeEach((to, from, next) => {
  const auth = getAuth();

  // 已登录访问登录页：直接跳转到对应首页
  if (to.path === "/login" && auth?.token) {
    return next(auth.role === "admin" ? "/home" : "/");
  }

  // 公共路由放行
  if (to.meta.public) return next();

  // 其余页面都需要登录
  if (!auth?.token) {
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }

  // 角色校验
  if (to.meta.roles && Array.isArray(to.meta.roles) && !to.meta.roles.includes(auth.role)) {
    return next(auth.role === "admin" ? "/home" : "/");
  }

  next();
});

export default router;
