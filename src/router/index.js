import home from "../components/home.vue";
import cesium from "../components/cesium.vue";

import { createRouter, createWebHashHistory } from "vue-router";


const routes = [
    {
        path: '/',
        name: 'cesium',
        component: () => import('@/components/cesium.vue'),
    },
    {
        path: '/home',
        name: 'home',
        component: () => import('@/components/home.vue'),
    },


];
const router = createRouter({
    history: createWebHashHistory(),
    routes,
});
export default router