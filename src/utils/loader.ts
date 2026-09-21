export interface googleMapsOptions {
  key?: string
  language?: string
  version?: string
  libraries?: string[]
  callback?: string
}

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api/js'

function resolveApiKey(apiKey: string | null, options: googleMapsOptions): string | null {
  if (apiKey) return apiKey
  if (options.key) return options.key
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('g_api_key')
  }
  return null
}

export async function _loadGoogleMapsScript(
  apiKey: string | null = null,
  options: googleMapsOptions = {},
  callback?: () => void,
): Promise<void> {
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

  await _loadScript(src)

  callback?.()
}

export function _loadScript(src: string): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    // Avoid injecting the same script twice.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      resolve(existing)
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = src
    script.defer = true
    script.async = true

    // Resolve the promise once the script is loaded.
    script.addEventListener('load', () => resolve(script))

    // Reject if the script fails to load.
    script.addEventListener('error', () => reject(new Error(`${src} failed to load.`)))

    document.head.appendChild(script)
  })
}
