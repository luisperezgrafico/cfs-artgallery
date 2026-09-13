import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The menu button's markup is asserted with react-dom/server (no DOM needed),
  // so JSX has to compile here too.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    // Everything under test talks to the in-memory store, never Vercel Blob.
    env: { GALLERY_STORAGE: 'memory' },
  },
});
