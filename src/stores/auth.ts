import { ref } from 'vue'

const token = ref(localStorage.getItem('blog_token') || '')
const username = ref(localStorage.getItem('blog_username') || '')

export function setToken(t: string, name?: string) {
  token.value = t
  if (t) {
    localStorage.setItem('blog_token', t)
    if (name) {
      username.value = name
      localStorage.setItem('blog_username', name)
    }
  } else {
    localStorage.removeItem('blog_token')
    localStorage.removeItem('blog_username')
    username.value = ''
  }
}

export function getToken() {
  return token.value
}

export function getUsername() {
  return username.value
}

export function clearToken() {
  setToken('')
}
