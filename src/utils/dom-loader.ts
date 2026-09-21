/**
 * Generic browser asset loaders shared by providers that inject scripts/styles
 * (e.g. Google Maps script, optional CSS for Leaflet/GL).
 */

/** Inject a `<script>` once; resolves when loaded (or immediately if present). */
export function loadScript(src: string): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve(existing)
        return
      }
      existing.addEventListener('load', () => resolve(existing))
      existing.addEventListener('error', () => reject(new Error(`${src} failed to load.`)))
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = src
    script.defer = true
    script.async = true
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve(script)
    })
    script.addEventListener('error', () => reject(new Error(`${src} failed to load.`)))
    document.head.appendChild(script)
  })
}

/** Inject a stylesheet `<link>` once (used to auto-load provider CSS). */
export function loadStyle(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

/** Resolve a container from a CSS selector or an element. Throws if not found. */
export function resolveElement(container: string | HTMLElement): HTMLElement {
  if (typeof container !== 'string') return container
  const el = document.querySelector<HTMLElement>(container)
  if (!el) throw new Error(`Map container element not found: "${container}"`)
  return el
}

let idCounter = 0

/** Small stable id generator for markers/layers. */
export function uniqueId(prefix = 'mtx'): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}
