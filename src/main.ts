import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'
import './style.css'
import './styles/element-override.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 尽早应用主题/字号/布局，避免首屏闪烁
const settings = useSettingsStore(pinia)
settings.applyToDom()

app.mount('#app')
