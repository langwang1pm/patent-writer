import ky from 'ky'

const API_BASE = '/api/v1'

export const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 响应拦截器
api.extend({
  hooks: {
    afterResponse: [
      (_request, _options, response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            const error = new Error(data.message || '请求失败')
            ;(error as any).response = response
            ;(error as any).data = data
            throw error
          })
        }
        return response
      },
    ],
  },
})
