import reseolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodePolyfills from 'rollup-plugin-polyfill-node'

export default {
  input: 'src/index.ts',
  output: [
    {
      name: 'map-trix',
      file: 'dist/index.js',
      format: 'umd',
      sourcemap: true,
    },
    {
      name: 'map-trix',
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    reseolve(),
    commonjs(),
    json(),
    nodePolyfills(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }),
  ],
  // specify external modules if any are used in your library
  // external: [],
}