import ky from 'ky'

const API_BASE = '/api/v1'

export const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.extend({
  hooks: {
    afterResponse: [
      async (_request, _options, response) => {
        if (!response.ok) {
          const data: any = await response.json()
          const error = new Error(data.message || '请求失败')
          ;(error as any).response = response
          ;(error as any).data = data
          throw error
        }
        return response
      },
    ],
  },
})
