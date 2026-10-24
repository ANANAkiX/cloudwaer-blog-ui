import axios, { AxiosError } from 'axios'

/** 后端统一返回结构（与 common-core Result 对齐） */
export interface Result<T> {
  code: number
  message: string
  data: T
  timestamp?: number
}

/** 分页返回结构（与 common-core PageResult 对齐） */
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

request.interceptors.response.use(
  response => {
    const body = response.data as Result<unknown>
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 200) {
        return body.data as never
      }
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return response.data as never
  },
  (error: AxiosError<Result<unknown>>) => {
    const message =
      error.response?.data?.message || error.message || '网络异常，请稍后重试'
    return Promise.reject(new Error(message))
  }
)

export default request
