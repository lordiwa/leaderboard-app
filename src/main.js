
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './firebase/config'; // Initialize Firebase

const app = createApp(App);

app.use(router);
app.mount('#app');