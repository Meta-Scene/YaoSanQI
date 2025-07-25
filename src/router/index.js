
import { createRouter, createWebHashHistory } from "vue-router";


const routes = [
    {
        path: '/',
        name: 'cesium',
        component: () => import('@/components/cesium.vue'),
    },
    {
        path: '/login',
        name:'login',
        component: () => import('@/components/login.vue'),
    },
    {
        path: '/home',
        name: 'home',
        meta: { requiresAuth: true },
        component: () => import('@/components/home.vue'),
        redirect:'/record',
        children:[
            {
                name:'record',
                path:'/record',
                meta: { requiresAuth: true },
                component: () => import('@/components/record.vue'),
            },
            {
                name:'target',
                path:'/target',
                meta: { requiresAuth: true },
                component: () => import('@/components/target.vue'),
            },
            {
                name:'instrument',
                path:'/instrument',
                meta: { requiresAuth: true },
                component: () => import('@/components/instrument.vue'),
            },
            {
                name:'spectrum',
                path:'/spectrum',
                meta: { requiresAuth: true },
                component: () => import('@/components/spectrum.vue'),
            },
            {
                name:'detection',
                path:'/detection',
                meta: { requiresAuth: true },
                component: () => import('@/components/detection.vue'),
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