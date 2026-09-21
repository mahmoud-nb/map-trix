import { BaseProvider } from '../../core/base-provider'
import type { ClusterOptions, FitBoundsOptions, ProviderCapabilities } from '../../core/provider'
import type {
  LngLat,
  LngLatLike,
  MapTrixEventName,
  MapTrixMapOptions,
  MarkerEvent,
  MarkerHandle,
  MarkerIcon,
  MarkerOptions,
  PolylineHandle,
  PolylineOptions,
} from '../../core/types'
import { toLngLat } from '../../utils/geo'
import { loadStyle, resolveElement, uniqueId } from '../../utils/dom-loader'
import type * as LeafletNS from 'leaflet'

type LeafletModule = typeof LeafletNS

interface LeafletProviderConfig {
  /** Auto-inject Leaflet CSS: `true` uses the CDN, or pass a custom stylesheet URL. */
  css?: string | boolean
}

const DEFAULT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DEFAULT_ATTRIBUTION = '&copy; OpenStreetMap contributors'
const DEFAULT_CENTER: LngLat = { lat: 48.9234, lng: 2.2593 }
const LEAFLET_CDN_CSS = 'https://unpkg.com/leaflet/dist/leaflet.css'

// Leaflet's built-in default icon relies on asset paths that break under
// bundlers/ESM (the well-known "markers don't show" issue). We ship a
// self-contained inline SVG pin instead, so markers always render.
const DEFAULT_MARKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">' +
  '<path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21 12.5 41 12.5 41S25 21 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#EA4335"/>' +
  '<circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>'
const DEFAULT_ICON_URL = `data:image/svg+xml,${encodeURIComponent(DEFAULT_MARKER_SVG)}`

/** Minimal shape of the optional leaflet.markercluster plugin. */
interface MarkerClusterCapable {
  markerClusterGroup(options?: Record<string, unknown>): LeafletNS.LayerGroup & {
    addLayer(layer: LeafletNS.Layer): void
  }
}

export default class LeafletProvider extends BaseProvider {
  readonly name = 'leaflet'
  readonly capabilities: ProviderCapabilities = {
    markers: true,
    popups: true,
    polylines: true,
    nativeDirections: false,
    clustering: true,
    geocoding: false,
  }

  private config: LeafletProviderConfig
  private L: LeafletModule | null = null
  private map: LeafletNS.Map | null = null
  private defaultIcon: LeafletNS.Icon | null = null
  private clusterGroup: (LeafletNS.LayerGroup & { addLayer(l: LeafletNS.Layer): void }) | null = null

  constructor(config: Record<string, unknown> = {}) {
    super()
    this.config = config as LeafletProviderConfig
  }

  async loadSdk(): Promise<void> {
    if (this.config.css) {
      loadStyle(typeof this.config.css === 'string' ? this.config.css : LEAFLET_CDN_CSS)
    }
    const mod = await import('leaflet')
    this.L = ((mod as unknown as { default?: LeafletModule }).default ?? mod) as LeafletModule
  }

  private lib(): LeafletModule {
    if (!this.L) throw new Error('Leaflet SDK is not loaded. Call loadSdk() first.')
    return this.L
  }

  private ensureMap(): LeafletNS.Map {
    if (!this.map) throw new Error('Leaflet map is not initialized. Call createMap() first.')
    return this.map
  }

  async createMap(options: MapTrixMapOptions): Promise<void> {
    const L = this.lib()
    const el = resolveElement(options.container)
    const center = options.center ? toLngLat(options.center) : DEFAULT_CENTER

    this.map = L.map(el, {
      center: [center.lat, center.lng],
      zoom: options.zoom ?? 9,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      ...options.providerOptions,
    })

    const tileUrl = typeof options.style === 'string' ? options.style : DEFAULT_TILES
    L.tileLayer(tileUrl, {
      attribution: DEFAULT_ATTRIBUTION,
      maxZoom: options.maxZoom ?? 19,
    }).addTo(this.map)
  }

  destroy(): void {
    this.clearMarkers()
    this.map?.remove()
    this.map = null
    this.clusterGroup = null
  }

  setCenter(center: LngLatLike): void {
    const { lat, lng } = toLngLat(center)
    this.ensureMap().panTo([lat, lng])
  }

  getCenter(): LngLat {
    const c = this.ensureMap().getCenter()
    return { lat: c.lat, lng: c.lng }
  }

  setZoom(zoom: number): void {
    this.ensureMap().setZoom(zoom)
  }

  getZoom(): number {
    return this.ensureMap().getZoom()
  }

  fitBounds(points: LngLatLike[], options?: FitBoundsOptions): void {
    const L = this.lib()
    const latlngs = points.map((p) => {
      const { lat, lng } = toLngLat(p)
      return [lat, lng] as [number, number]
    })
    this.ensureMap().fitBounds(L.latLngBounds(latlngs), {
      padding: [options?.padding ?? 0, options?.padding ?? 0],
      maxZoom: options?.maxZoom,
    })
  }

  private getDefaultIcon(): LeafletNS.Icon {
    if (!this.defaultIcon) {
      this.defaultIcon = this.lib().icon({
        iconUrl: DEFAULT_ICON_URL,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [0, -38],
      })
    }
    return this.defaultIcon
  }

  private toIcon(icon?: string | MarkerIcon): LeafletNS.Icon {
    if (!icon) return this.getDefaultIcon()
    const L = this.lib()
    if (typeof icon === 'string') return L.icon({ iconUrl: icon, iconSize: [25, 41], iconAnchor: [12, 41] })
    return L.icon({
      iconUrl: icon.url,
      iconSize: icon.size,
      iconAnchor: icon.anchor,
    })
  }

  addMarker(options: MarkerOptions): MarkerHandle {
    const L = this.lib()
    const map = this.ensureMap()
    const { lat, lng } = toLngLat(options.position)
    const id = options.id ?? uniqueId('marker')

    const marker = L.marker([lat, lng], {
      draggable: options.draggable,
      title: options.title,
      icon: this.toIcon(options.icon),
    })

    if (options.popup) {
      const content = typeof options.popup === 'string' ? options.popup : options.popup.content
      const maxWidth = typeof options.popup === 'string' ? undefined : options.popup.maxWidth
      marker.bindPopup(content, { maxWidth })
    }

    marker.addTo(map)

    const handle: MarkerHandle = {
      id,
      data: options.data,
      getPosition: () => {
        const p = marker.getLatLng()
        return { lat: p.lat, lng: p.lng }
      },
      setPosition: (pos) => {
        const c = toLngLat(pos)
        marker.setLatLng([c.lat, c.lng])
      },
      openPopup: () => marker.openPopup(),
      closePopup: () => marker.closePopup(),
      remove: () => {
        marker.remove()
      },
      on: (event, cb: (e: MarkerEvent) => void) => {
        marker.on(event, (e: unknown) => {
          cb({ marker: handle, position: handle.getPosition(), originalEvent: e })
        })
      },
      getNative: <T,>() => marker as unknown as T,
    }

    return this.track(handle)
  }

  addPolyline(options: PolylineOptions): PolylineHandle {
    const L = this.lib()
    const map = this.ensureMap()
    const latlngs = options.path.map((p) => {
      const { lat, lng } = toLngLat(p)
      return [lat, lng] as [number, number]
    })
    const line = L.polyline(latlngs, {
      color: options.color ?? '#4285F4',
      weight: options.weight ?? 4,
      opacity: options.opacity ?? 1,
    }).addTo(map)

    return {
      remove: () => line.remove(),
      getNative: <T,>() => line as unknown as T,
    }
  }

  removePolyline(handle: PolylineHandle): void {
    handle.remove()
  }

  on(event: MapTrixEventName, handler: (e: unknown) => void): void {
    const map = this.ensureMap()
    if (event === 'ready') {
      map.whenReady(() => handler(undefined))
      return
    }
    const eventMap: Record<Exclude<MapTrixEventName, 'ready'>, string> = {
      click: 'click',
      moveend: 'moveend',
      zoomend: 'zoomend',
    }
    map.on(eventMap[event], (e: unknown) => handler(e))
  }

  async enableClustering(options?: ClusterOptions): Promise<void> {
    await import('leaflet.markercluster')
    const L = this.lib() as LeafletModule & MarkerClusterCapable
    const map = this.ensureMap()

    // NOTE: passing `disableClusteringAtZoom: undefined` makes markercluster set
    // its internal maxZoom to NaN and silently disables clustering — only include
    // the option when a value is actually provided.
    const clusterOptions: Record<string, unknown> = {
      maxClusterRadius: options?.radius ?? 80,
    }
    if (options?.maxZoom !== undefined) {
      clusterOptions.disableClusteringAtZoom = options.maxZoom
    }

    const group = L.markerClusterGroup(clusterOptions)

    for (const handle of this.markers) {
      const marker = handle.getNative<LeafletNS.Marker>()
      map.removeLayer(marker)
      group.addLayer(marker)
    }

    map.addLayer(group)
    this.clusterGroup = group
  }

  disableClustering(): void {
    if (!this.clusterGroup) return
    const map = this.ensureMap()
    map.removeLayer(this.clusterGroup)
    for (const handle of this.markers) {
      handle.getNative<LeafletNS.Marker>().addTo(map)
    }
    this.clusterGroup = null
  }

  getNativeMap<T = unknown>(): T {
    return this.ensureMap() as unknown as T
  }
}
