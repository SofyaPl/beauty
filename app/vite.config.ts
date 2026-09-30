import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base соответствует имени репозитория: приложение публикуется
// на https://sofyapl.github.io/beauty/
export default defineConfig({
  plugins: [react()],
  base: '/beauty/',
})
