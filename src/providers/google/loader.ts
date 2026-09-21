import { loadScript } from '../../utils/dom-loader'

export interface googleMapsOptions {
  key?: string
  language?: string
  version?: string
  libraries?: string[]
  callback?: string
}

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api/js'

function resolveApiKey(apiKey: string | null | undefined, options: googleMapsOptions): string | null {
  if (apiKey) return apiKey
  if (options.key) return options.key
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('g_api_key')
  }
  return null
}

/** Inject the Google Maps JS API script. Idempotent (skips if already present). */
export async function loadGoogleMapsScript(
  apiKey: string | null = null,
  options: googleMapsOptions = {},
): Promise<void> {
  if (typeof google === 'object' && google?.maps) return

  const key = resolveApiKey(apiKey, options)
  if (!key) {
    console.warn('[map-trix] No Google Maps API key provided. The map may fail to load.')
  }

  const params = new URLSearchParams()
  if (key) params.set('key', key)
  if (options.language) params.set('language', options.language)
  if (options.version) params.set('version', options.version)
  if (options.libraries?.length) params.set('libraries', options.libraries.join(','))
  if (options.callback) params.set('callback', options.callback)

  const query = params.toString()
  const src = query ? `${GOOGLE_MAPS_BASE_URL}?${query}` : GOOGLE_MAPS_BASE_URL

  await loadScript(src)
}
