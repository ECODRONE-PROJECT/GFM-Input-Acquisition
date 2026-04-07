import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node', // Since we are testing authentication backend APIs/logic
    globals: true,
  },
})
