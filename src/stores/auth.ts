import { ref } from 'vue'

const token = ref(localStorage.getItem('blog_token') || '')
const username = ref(localStorage.getItem('blog_username') || '')
const avatar = ref(localStorage.getItem('blog_avatar') || '')

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
    localStorage.removeItem('blog_avatar')
    username.value = ''
    avatar.value = ''
  }
}

export function getToken() {
  return token.value
}

export function getUsername() {
  return username.value
}

export function getAvatar() {
  return avatar.value
}

export function setAvatar(url: string) {
  avatar.value = url || ''
  if (url) {
    localStorage.setItem('blog_avatar', url)
  } else {
    localStorage.removeItem('blog_avatar')
  }
}

export function clearToken() {
  setToken('')
}
