<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-card">
        <h1 class="login-title">🔐 Admin Login</h1>
        <p class="login-subtitle">Enter your credentials to access the admin dashboard</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input
                id="email"
                v-model="email"
                type="email"
                required
                class="input"
                placeholder="admin@example.com"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
                id="password"
                v-model="password"
                type="password"
                required
                class="input"
                placeholder="••••••••"
            />
          </div>

          <div v-if="error" class="error-message">
            <p>❌ {{ error }}</p>
          </div>

          <button
              type="submit"
              class="btn btn-primary btn-block"
              :disabled="loading"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/admin');
  } catch (err) {
    console.error('Login error:', err);
    error.value = 'Invalid credentials. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-view {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-container {
  width: 100%;
  max-width: 450px;
}

.login-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-title {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5rem;
  color: var(--color-accent);
}

.login-subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-block {
  width: 100%;
}

.error-message {
  padding: 1rem;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid var(--color-accent);
  border-radius: 0.5rem;
  color: var(--color-accent);
  text-align: center;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>