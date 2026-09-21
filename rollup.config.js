import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodePolyfills from 'rollup-plugin-polyfill-node'

// Underlying map SDKs are optional peer dependencies — never bundle them.
const external = [
  'leaflet',
  'leaflet.markercluster',
  'maplibre-gl',
  'mapbox-gl',
  '@googlemaps/markerclusterer',
]

export default {
  input: {
    index: 'src/index.ts',
    'providers/google/index': 'src/providers/google/index.ts',
    'providers/leaflet/index': 'src/providers/leaflet/index.ts',
    'providers/maplibre/index': 'src/providers/maplibre/index.ts',
    'providers/mapbox/index': 'src/providers/mapbox/index.ts',
  },
  external,
  output: [
    {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].esm.js',
      chunkFileNames: 'chunks/[name]-[hash].esm.js',
      sourcemap: true,
    },
    {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      sourcemap: true,
      exports: 'named',
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    json(),
    nodePolyfills(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }),
  ],
}
