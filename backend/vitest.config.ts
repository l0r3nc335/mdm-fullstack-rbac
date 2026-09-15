import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret',
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://rbac:rbac@localhost:5433/rbac_test?schema=public',
    },
  },
});
