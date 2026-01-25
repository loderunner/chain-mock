import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

const external = /^[^/.]/;

export default defineConfig([
  {
    input: 'src/index.ts',
    platform: 'node',
    external,
    output: [
      {
        format: 'cjs',
        dir: 'dist',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
      },
      {
        format: 'esm',
        dir: 'dist',
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs',
      },
    ],
  },
  {
    input: 'src/index.ts',
    platform: 'node',
    external,
    plugins: [
      dts({
        emitDtsOnly: true,
      }),
    ],
    output: {
      dir: 'dist',
    },
  },
]);
