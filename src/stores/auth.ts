import { ref } from 'vue'

const token = ref(localStorage.getItem('blog_token') || '')

export function setToken(t: string) {
  token.value = t
  if (t) localStorage.setItem('blog_token', t)
  else localStorage.removeItem('blog_token')
}

export function getToken() {
  return token.value
}

export function clearToken() {
  setToken('')
}
