export interface googleMapsOptions {
  key?: string
  language?: string
  version?: string
  libraries?: string[]
  callback?: string
}

export async function _loadGoogleMapsScript(API_KEY: string|null = null, options: googleMapsOptions, callback?:() => any ) {

  API_KEY = API_KEY || options.key || localStorage.getItem('g_api_key')

  const googleMapsLibUrl = new URL('https://maps.googleapis.com/maps/api/js')

  const googleMapsParams: Record<string, string> = {
    key: API_KEY,
    language: options.language,
    version: options.version,
    ...((options?.libraries?.length || 0) > 0 && {libraries: options.libraries.join(',')}),
    ...(options.callback && {callback: options.callback})
  }

  const googleMapsUrlParams = Object.keys(googleMapsParams).map(key => `${key}=${googleMapsParams[key]}`).join('&')

  const googleMapsLibPath = googleMapsUrlParams ? `${googleMapsLibUrl.href}?${googleMapsUrlParams}` : googleMapsLibUrl.href

  await _loadScript(googleMapsLibPath)
  if (typeof callback === 'function') callback()
}

export function _loadScript(src: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = src
    script.defer = true
    document.head.appendChild(script)

    // Resolve the promise once the script is loaded
    script.addEventListener('load', () => {
      resolve(script)
    })

    // Catch any errors while loading the script
    script.addEventListener('error', () => {
      reject(new Error(`${src} failed to load.`))
    })
  })
}