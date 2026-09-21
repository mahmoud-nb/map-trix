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
import { toLngLat, toLngLatArray, boundsOf } from '../../utils/geo'
import { loadStyle, resolveElement, uniqueId } from '../../utils/dom-loader'

/**
 * Minimal structural typings shared by maplibre-gl and mapbox-gl. Using our own
 * shapes (instead of the packages' types) keeps this base decoupled from either
 * SDK version so the two providers can share it.
 */
export interface GLLngLat {
  lng: number
  lat: number
}

export interface GLMapLike {
  on(type: string, layerOrHandler: unknown, handler?: unknown): void
  once(type: string, handler: (...args: unknown[]) => void): void
  setCenter(center: [number, number]): void
  getCenter(): GLLngLat
  setZoom(zoom: number): void
  getZoom(): number
  fitBounds(bounds: [[number, number], [number, number]], options?: Record<string, unknown>): void
  isStyleLoaded(): boolean
  addSource(id: string, source: Record<string, unknown>): void
  getSource(id: string): unknown
  removeSource(id: string): void
  addLayer(layer: Record<string, unknown>): void
  removeLayer(id: string): void
  getLayer(id: string): unknown
  getCanvas(): { style: { cursor: string } }
  easeTo(options: Record<string, unknown>): void
  resize(): void
  remove(): void
}

export interface GLMarkerLike {
  setLngLat(center: [number, number]): GLMarkerLike
  setPopup(popup: GLPopupLike): GLMarkerLike
  addTo(map: GLMapLike): GLMarkerLike
  remove(): GLMarkerLike
  getLngLat(): GLLngLat
  getElement(): HTMLElement
}

export interface GLPopupLike {
  setHTML(html: string): GLPopupLike
  setDOMContent(node: Node): GLPopupLike
  setLngLat(center: [number, number]): GLPopupLike
  addTo(map: GLMapLike): GLPopupLike
  remove(): GLPopupLike
}

export interface GLModule {
  Map: new (options: Record<string, unknown>) => GLMapLike
  Marker: new (options?: Record<string, unknown>) => GLMarkerLike
  Popup: new (options?: Record<string, unknown>) => GLPopupLike
}

export interface GLProviderConfig {
  accessToken?: string
  css?: string | boolean
}

const DEFAULT_CENTER: LngLat = { lat: 48.9234, lng: 2.2593 }
const CLUSTER_SOURCE = 'maptrix-clusters'

/** Shared implementation for GL-based providers (MapLibre & Mapbox). */
export abstract class GLProvider extends BaseProvider {
  abstract readonly name: string
  readonly capabilities: ProviderCapabilities = {
    markers: true,
    popups: true,
    polylines: true,
    nativeDirections: false,
    clustering: true,
    geocoding: false,
  }

  protected config: GLProviderConfig
  protected gl: GLModule | null = null
  protected map: GLMapLike | null = null

  /** Original specs, needed to rebuild features for clustering. */
  private specs = new Map<string, MarkerOptions>()
  private polylineIds: string[] = []
  private clusterActive = false
  private stylePromise: Promise<void> | null = null

  /** Provider-specific SDK loader + default style/CSS. */
  protected abstract loadGL(): Promise<GLModule>
  protected abstract get defaultStyle(): string | Record<string, unknown>
  protected abstract get cdnCss(): string

  constructor(config: Record<string, unknown> = {}) {
    super()
    this.config = config as GLProviderConfig
  }

  async loadSdk(): Promise<void> {
    if (this.config.css) {
      loadStyle(typeof this.config.css === 'string' ? this.config.css : this.cdnCss)
    }
    this.gl = await this.loadGL()
  }

  protected lib(): GLModule {
    if (!this.gl) throw new Error(`${this.name} SDK is not loaded. Call loadSdk() first.`)
    return this.gl
  }

  protected ensureMap(): GLMapLike {
    if (!this.map) throw new Error(`${this.name} map is not initialized. Call createMap() first.`)
    return this.map
  }

  async createMap(options: MapTrixMapOptions): Promise<void> {
    const gl = this.lib()
    const el = resolveElement(options.container)
    const center = options.center ? toLngLat(options.center) : DEFAULT_CENTER

    this.map = new gl.Map({
      container: el,
      style: options.style ?? this.defaultStyle,
      center: [center.lng, center.lat],
      zoom: options.zoom ?? 9,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      ...this.mapConstructorExtras(),
      ...options.providerOptions,
    })

    // Cache a promise that resolves once the style spec is parsed (the 'load'
    // event). We can't rely on isStyleLoaded() here: with raster styles it stays
    // false while tiles stream in, but addSource/addLayer only need the spec.
    const map = this.map
    this.stylePromise = new Promise<void>((resolve) => {
      if (map.isStyleLoaded()) {
        resolve()
        return
      }
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }
      map.once('load', finish)
      // Fallback so createMap can never hang on a broken/blocked style.
      setTimeout(finish, 8000)
    })

    await this.stylePromise

    // GL maps size their drawing buffer at init; if the container wasn't at its
    // final size yet (hidden tab, late layout), tiles never load. A resize once
    // the style is ready makes the basemap render reliably.
    this.map.resize()
  }

  /** Resolve once the style spec is ready (so addSource/addLayer are safe). */
  protected styleReady(): Promise<void> {
    return this.stylePromise ?? Promise.resolve()
  }

  /** Hook for subclasses to inject e.g. Mapbox `accessToken`. */
  protected mapConstructorExtras(): Record<string, unknown> {
    return {}
  }

  destroy(): void {
    this.clearMarkers()
    this.map?.remove()
    this.map = null
    this.specs.clear()
  }

  setCenter(center: LngLatLike): void {
    this.ensureMap().setCenter(toLngLatArray(center))
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
    const bounds = boundsOf(points)
    if (!bounds) return

    // NOTE: GL (MapLibre v6) throws "Invalid LngLat (NaN, NaN)" when an option
    // such as maxZoom is present but undefined — only set keys that have a value.
    const fitOptions: Record<string, unknown> = { padding: options?.padding ?? 0 }
    if (options?.maxZoom !== undefined) fitOptions.maxZoom = options.maxZoom

    this.ensureMap().fitBounds(
      [
        [bounds.sw.lng, bounds.sw.lat],
        [bounds.ne.lng, bounds.ne.lat],
      ],
      fitOptions,
    )
  }

  private buildMarkerElement(icon?: string | MarkerIcon): HTMLElement | undefined {
    if (!icon) return undefined
    const img = document.createElement('img')
    if (typeof icon === 'string') {
      img.src = icon
    } else {
      img.src = icon.url
      if (icon.size) {
        img.width = icon.size[0]
        img.height = icon.size[1]
      }
    }
    return img
  }

  private buildPopup(popup: string | { content: string | HTMLElement; maxWidth?: number }): GLPopupLike {
    const gl = this.lib()
    const isString = typeof popup === 'string'
    const glPopup = new gl.Popup({
      maxWidth: isString ? undefined : popup.maxWidth ? `${popup.maxWidth}px` : undefined,
    })
    const content = isString ? popup : popup.content
    return typeof content === 'string' ? glPopup.setHTML(content) : glPopup.setDOMContent(content)
  }

  addMarker(options: MarkerOptions): MarkerHandle {
    const gl = this.lib()
    const map = this.ensureMap()
    const { lat, lng } = toLngLat(options.position)
    const id = options.id ?? uniqueId('marker')

    const element = this.buildMarkerElement(options.icon)
    const marker = new gl.Marker({ element, draggable: options.draggable })
      .setLngLat([lng, lat])
      .addTo(map)

    if (options.popup) {
      const openOnClick = options.openPopupOnClick ?? true
      if (openOnClick) marker.setPopup(this.buildPopup(options.popup))
    }

    this.specs.set(id, options)

    const handle: MarkerHandle = {
      id,
      data: options.data,
      getPosition: () => {
        const p = marker.getLngLat()
        return { lat: p.lat, lng: p.lng }
      },
      setPosition: (pos) => {
        marker.setLngLat(toLngLatArray(pos))
      },
      openPopup: () => {
        this.buildPopup(options.popup ?? '')
          .setLngLat([lng, lat])
          .addTo(map)
      },
      closePopup: () => {
        /* GL popups are self-managed via setPopup; no-op for detached popups. */
      },
      remove: () => {
        marker.remove()
        this.specs.delete(id)
      },
      on: (event, cb: (e: MarkerEvent) => void) => {
        const domEvent = event === 'dragend' ? 'dragend' : 'click'
        marker.getElement().addEventListener(domEvent, (e: Event) => {
          cb({ marker: handle, position: handle.getPosition(), originalEvent: e })
        })
      },
      getNative: <T,>() => marker as unknown as T,
    }

    return this.track(handle)
  }

  addPolyline(options: PolylineOptions): PolylineHandle {
    const map = this.ensureMap()
    const id = uniqueId('line')
    const coordinates = options.path.map(toLngLatArray)

    const add = () => {
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates },
        },
      })
      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': options.color ?? '#4285F4',
          'line-width': options.weight ?? 4,
          'line-opacity': options.opacity ?? 1,
        },
      })
    }

    void this.styleReady().then(add)

    this.polylineIds.push(id)

    return {
      remove: () => this.removeGlLayer(id),
      getNative: <T,>() => id as unknown as T,
    }
  }

  private removeGlLayer(id: string): void {
    const map = this.map
    if (!map) return
    if (map.getLayer(id)) map.removeLayer(id)
    if (map.getSource(id)) map.removeSource(id)
    this.polylineIds = this.polylineIds.filter((x) => x !== id)
  }

  removePolyline(handle: PolylineHandle): void {
    handle.remove()
  }

  on(event: MapTrixEventName, handler: (e: unknown) => void): void {
    const map = this.ensureMap()
    const eventMap: Record<MapTrixEventName, string> = {
      ready: 'load',
      click: 'click',
      moveend: 'moveend',
      zoomend: 'zoomend',
    }
    map.on(eventMap[event], (e: unknown) => handler(e))
  }

  /**
   * GL clustering uses a native clustered GeoJSON source. NOTE: this replaces
   * the DOM markers with rendered circle layers; popups open on point click
   * using each marker's stored `popup` content.
   */
  async enableClustering(options?: ClusterOptions): Promise<void> {
    const map = this.ensureMap()
    await this.styleReady()
    if (this.clusterActive) this.disableClustering()

    const features = [...this.specs.entries()].map(([id, spec]) => {
      const { lat, lng } = toLngLat(spec.position)
      const popup = typeof spec.popup === 'string' ? spec.popup : spec.popup?.content
      return {
        type: 'Feature' as const,
        properties: {
          id,
          title: spec.title ?? '',
          popup: typeof popup === 'string' ? popup : '',
        },
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      }
    })

    // Hide the DOM markers while the clustered source is active.
    for (const handle of this.markers) handle.getNative<GLMarkerLike>().remove()

    map.addSource(CLUSTER_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
      cluster: true,
      clusterRadius: options?.radius ?? 50,
      clusterMaxZoom: options?.maxZoom ?? 14,
    })

    map.addLayer({
      id: `${CLUSTER_SOURCE}-clusters`,
      type: 'circle',
      source: CLUSTER_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#4285F4',
        'circle-opacity': 0.85,
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
      },
    })
    map.addLayer({
      id: `${CLUSTER_SOURCE}-count`,
      type: 'symbol',
      source: CLUSTER_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12,
      },
      paint: { 'text-color': '#ffffff' },
    })
    map.addLayer({
      id: `${CLUSTER_SOURCE}-points`,
      type: 'circle',
      source: CLUSTER_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#EA4335',
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    map.on('click', `${CLUSTER_SOURCE}-points`, (e: unknown) => {
      const feature = (e as { features?: Array<{ geometry: { coordinates: [number, number] }; properties: { popup?: string } }> }).features?.[0]
      if (!feature?.properties?.popup) return
      this.buildPopup(feature.properties.popup).setLngLat(feature.geometry.coordinates).addTo(map)
    })
    const pointer = (cursor: string) => () => {
      map.getCanvas().style.cursor = cursor
    }
    map.on('mouseenter', `${CLUSTER_SOURCE}-points`, pointer('pointer'))
    map.on('mouseleave', `${CLUSTER_SOURCE}-points`, pointer(''))

    this.clusterActive = true
  }

  disableClustering(): void {
    const map = this.map
    if (!map || !this.clusterActive) return
    for (const layer of ['-clusters', '-count', '-points']) {
      const id = `${CLUSTER_SOURCE}${layer}`
      if (map.getLayer(id)) map.removeLayer(id)
    }
    if (map.getSource(CLUSTER_SOURCE)) map.removeSource(CLUSTER_SOURCE)
    // Restore DOM markers.
    for (const handle of this.markers) handle.getNative<GLMarkerLike>().addTo(map)
    this.clusterActive = false
  }

  getNativeMap<T = unknown>(): T {
    return this.ensureMap() as unknown as T
  }
}
