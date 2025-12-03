// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../firebase/config';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/HomeView.vue')
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/AdminLogin.vue')
    },
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../views/AdminDashboard.vue'),
        meta: { requiresAuth: true }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isAuthenticated = auth.currentUser;

    if (requiresAuth && !isAuthenticated) {
        next('/login');
    } else if (to.path === '/login' && isAuthenticated) {
        next('/admin');
    } else {
        next();
    }
});

export default router;