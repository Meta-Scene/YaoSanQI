
import { createRouter, createWebHashHistory } from "vue-router";


const routes = [
    {
        path: '/',
        name: 'cesium',
        component: () => import('@/views/Cesium.vue'),
    },
    {
        path: '/login',
        name:'login',
        component: () => import('@/views/Login.vue'),
    },
    {
        path: '/home',
        name: 'home',
        meta: { requiresAuth: true },
        component: () => import('@/layouts/BasicLayout.vue'),
        redirect:'/record',
        children:[
            {
                name:'record',
                path:'/record',
                meta: { requiresAuth: true },
                component: () => import('@/views/Record.vue'),
            },
            {
                name:'target',
                path:'/target',
                meta: { requiresAuth: true },
                component: () => import('@/views/Target.vue'),
            },
            {
                name:'instrument',
                path:'/instrument',
                meta: { requiresAuth: true },
                component: () => import('@/views/Instrument.vue'),
            },
            {
                name:'spectrum',
                path:'/spectrum',
                meta: { requiresAuth: true },
                component: () => import('@/views/Spectrum.vue'),
            },
            {
                name:'detection',
                path:'/detection',
                meta: { requiresAuth: true },
                component: () => import('@/views/Detection.vue'),
            }
        ]
    },


];
const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

//路由拦截
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
      const token = localStorage.getItem('account')
      if (!token) {
        next({ path: '/login', query: { redirect: to.fullPath } })
      } else {
        next()
      }
    } else {
      next() 
    }
  })
export default router