import { build } from 'esbuild';

const isProduction = process.env.NODE_ENV === 'production';

await build({
  entryPoints: ['src/lib/service-worker/sw.ts'],

  outfile: 'public/sw.js',

  bundle: true,

  format: 'iife',

  platform: 'browser',

  target: 'es2022',

  minify: isProduction,

  sourcemap: !isProduction,

  legalComments: 'none',
});