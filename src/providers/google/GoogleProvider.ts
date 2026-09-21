import { BaseProvider } from '../../core/base-provider'
import type { FitBoundsOptions, ClusterOptions, ProviderCapabilities } from '../../core/provider'
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
import { resolveElement, uniqueId } from '../../utils/dom-loader'
import { loadGoogleMapsScript } from './loader'

interface GoogleProviderConfig {
  apiKey?: string
  language?: string
  version?: string
  libraries?: string[]
}

const DEFAULT_CENTER: LngLat = { lat: 48.9234, lng: 2.2593 }

function toGoogleIcon(icon?: string | MarkerIcon): string | google.maps.Icon | undefined {
  if (!icon) return undefined
  if (typeof icon === 'string') return icon
  const result: google.maps.Icon = { url: icon.url }
  if (icon.size) result.scaledSize = new google.maps.Size(icon.size[0], icon.size[1])
  if (icon.anchor) result.anchor = new google.maps.Point(icon.anchor[0], icon.anchor[1])
  return result
}

export default class GoogleProvider extends BaseProvider {
  readonly name = 'google'
  readonly capabilities: ProviderCapabilities = {
    markers: true,
    popups: true,
    polylines: true,
    nativeDirections: true,
    clustering: true,
    geocoding: true,
  }

  private config: GoogleProviderConfig
  private map: google.maps.Map | null = null
  private currentInfoWindow: google.maps.InfoWindow | null = null
  private clusterer: { clearMarkers(): void; addMarkers(m: google.maps.Marker[]): void } | null = null

  constructor(config: Record<string, unknown> = {}) {
    super()
    this.config = config as GoogleProviderConfig
  }

  async loadSdk(): Promise<void> {
    await loadGoogleMapsScript(this.config.apiKey ?? null, {
      key: this.config.apiKey,
      language: this.config.language,
      version: this.config.version,
      libraries: this.config.libraries,
    })
  }

  async createMap(options: MapTrixMapOptions): Promise<void> {
    const el = resolveElement(options.container)
    const center = options.center ? toLngLat(options.center) : DEFAULT_CENTER

    this.map = new google.maps.Map(el, {
      center,
      zoom: options.zoom ?? 9,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      mapId: typeof options.style === 'string' ? options.style : undefined,
      ...options.providerOptions,
    })
  }

  private ensureMap(): google.maps.Map {
    if (!this.map) throw new Error('Google map is not initialized. Call createMap() first.')
    return this.map
  }

  destroy(): void {
    this.clearMarkers()
    this.clusterer?.clearMarkers()
    this.clusterer = null
    this.map = null
  }

  setCenter(center: LngLatLike): void {
    this.ensureMap().setCenter(toLngLat(center))
  }

  getCenter(): LngLat {
    const c = this.ensureMap().getCenter()
    return c ? { lat: c.lat(), lng: c.lng() } : DEFAULT_CENTER
  }

  setZoom(zoom: number): void {
    this.ensureMap().setZoom(zoom)
  }

  getZoom(): number {
    return this.ensureMap().getZoom() ?? 0
  }

  fitBounds(points: LngLatLike[], options?: FitBoundsOptions): void {
    const map = this.ensureMap()
    const bounds = new google.maps.LatLngBounds()
    for (const point of points) bounds.extend(toLngLat(point))
    map.fitBounds(bounds, options?.padding)
  }

  addMarker(options: MarkerOptions): MarkerHandle {
    const map = this.ensureMap()
    const position = toLngLat(options.position)
    const id = options.id ?? uniqueId('marker')

    const marker = new google.maps.Marker({
      position,
      map,
      title: options.title,
      draggable: options.draggable,
      icon: toGoogleIcon(options.icon),
    })

    let infoWindow: google.maps.InfoWindow | null = null
    if (options.popup) {
      const content = typeof options.popup === 'string' ? options.popup : options.popup.content
      infoWindow = new google.maps.InfoWindow({
        content,
        maxWidth: typeof options.popup === 'string' ? undefined : options.popup.maxWidth,
      })
    }

    const handle: MarkerHandle = {
      id,
      data: options.data,
      getPosition: () => {
        const p = marker.getPosition()
        return p ? { lat: p.lat(), lng: p.lng() } : position
      },
      setPosition: (pos) => marker.setPosition(toLngLat(pos)),
      openPopup: () => {
        if (!infoWindow) return
        this.currentInfoWindow?.close()
        infoWindow.open(map, marker)
        this.currentInfoWindow = infoWindow
      },
      closePopup: () => infoWindow?.close(),
      remove: () => {
        marker.setMap(null)
        google.maps.event.clearInstanceListeners(marker)
      },
      on: (event, cb: (e: MarkerEvent) => void) => {
        marker.addListener(event, (e: unknown) => {
          cb({ marker: handle, position: handle.getPosition(), originalEvent: e })
        })
      },
      getNative: <T,>() => marker as unknown as T,
    }

    const openOnClick = options.openPopupOnClick ?? Boolean(options.popup)
    if (infoWindow && openOnClick) {
      marker.addListener('click', () => handle.openPopup())
    }

    return this.track(handle)
  }

  addPolyline(options: PolylineOptions): PolylineHandle {
    const map = this.ensureMap()
    const polyline = new google.maps.Polyline({
      path: options.path.map(toLngLat),
      strokeColor: options.color ?? '#4285F4',
      strokeWeight: options.weight ?? 4,
      strokeOpacity: options.opacity ?? 1,
      map,
    })
    return {
      remove: () => polyline.setMap(null),
      getNative: <T,>() => polyline as unknown as T,
    }
  }

  removePolyline(handle: PolylineHandle): void {
    handle.remove()
  }

  on(event: MapTrixEventName, handler: (e: unknown) => void): void {
    const map = this.ensureMap()
    const eventMap: Record<MapTrixEventName, string> = {
      ready: 'tilesloaded',
      click: 'click',
      moveend: 'idle',
      zoomend: 'zoom_changed',
    }
    map.addListener(eventMap[event], (e: unknown) => handler(e))
  }

  async enableClustering(_options?: ClusterOptions): Promise<void> {
    const mod = await import('@googlemaps/markerclusterer')
    const natives = this.markers.map((m) => m.getNative<google.maps.Marker>())
    this.clusterer = new mod.MarkerClusterer({ map: this.ensureMap(), markers: natives })
  }

  disableClustering(): void {
    this.clusterer?.clearMarkers()
    this.clusterer = null
    const map = this.ensureMap()
    for (const marker of this.markers) marker.getNative<google.maps.Marker>().setMap(map)
  }

  getNativeMap<T = unknown>(): T {
    return this.ensureMap() as unknown as T
  }
}
