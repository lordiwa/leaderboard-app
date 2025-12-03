<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <h1 class="logo">🎯 Leaderboard</h1>
        <nav>
          <router-link to="/" class="nav-link">Leaderboard</router-link>
          <router-link to="/admin" class="nav-link" v-if="isAdmin">Admin</router-link>
          <router-link to="/login" class="nav-link" v-if="!isAdmin">Login</router-link>
          <button v-if="isAdmin" @click="handleLogout" class="nav-link logout-btn">Logout</button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <footer class="app-footer">
      <p>&copy; 2025 Leaderboard System</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const router = useRouter();
const isAdmin = ref(false);

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    isAdmin.value = !!user;
  });
});

const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push('/');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
</script>

<style>
:root {
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #1a1a1a;
  --color-bg-card: #1f1f1f;
  --color-accent: #dc2626;
  --color-accent-hover: #b91c1c;
  --color-accent-light: #ef4444;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #737373;
  --color-border: #2a2a2a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  line-height: 1.6;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.app-header {
  background: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-accent);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent);
}

nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--color-accent);
}

.logout-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-accent);
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: var(--color-accent);
  color: white;
}

.app-main {
  flex: 1;
  padding: 2rem 0;
}

.app-footer {
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  padding: 1.5rem 0;
  text-align: center;
  color: var(--color-text-muted);
}

/* Utility Classes */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-accent);
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Responsive */
@media (max-width: 768px) {
  .app-header .container {
    flex-direction: column;
    gap: 1rem;
  }

  nav {
    width: 100%;
    justify-content: center;
  }
}
</style>