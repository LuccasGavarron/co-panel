import { defineConfig } from 'vitest/config'

// Testes do domínio (core) e dos adapters rodam em Node puro, sem Next.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
