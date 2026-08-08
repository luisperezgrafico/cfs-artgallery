import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Everything under test talks to the in-memory store, never Vercel Blob.
    env: { GALLERY_STORAGE: 'memory' },
  },
});
