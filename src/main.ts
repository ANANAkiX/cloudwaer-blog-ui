import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 尽早应用主题/字号/布局，避免首屏闪烁
const settings = useSettingsStore(pinia)
settings.applyToDom()

app.mount('#app')
