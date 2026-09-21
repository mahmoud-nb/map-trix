import type {
  LngLat,
  LngLatLike,
  MapTrixEventName,
  MapTrixMapOptions,
  MarkerHandle,
  MarkerOptions,
  PolylineHandle,
  PolylineOptions,
} from './types'

/**
 * What a provider is able to do. The facade reads this to adapt behaviour
 * (e.g. use native directions when available, otherwise fall back to OSRM)
 * or to throw an explicit error instead of failing silently.
 */
export interface ProviderCapabilities {
  markers: boolean
  popups: boolean
  polylines: boolean
  /** Provider ships its own routing/directions service. */
  nativeDirections: boolean
  /** Provider can cluster markers (natively or via an optional plugin). */
  clustering: boolean
  geocoding: boolean
}

export interface FitBoundsOptions {
  /** Padding in pixels around the bounds. */
  padding?: number
  maxZoom?: number
}

export interface ClusterOptions {
  /** Cluster radius in pixels. */
  radius?: number
  /** Stop clustering at/above this zoom level. */
  maxZoom?: number
}

/**
 * The adapter contract. Each map client (Google, Leaflet, MapLibre, Mapbox)
 * implements this so the facade can stay 100% agnostic.
 */
export interface IMapProvider {
  readonly name: string
  readonly capabilities: ProviderCapabilities

  /** Load the underlying SDK (dynamic import / script injection). Idempotent. */
  loadSdk(): Promise<void>
  /** Create the native map instance inside the given container. */
  createMap(options: MapTrixMapOptions): Promise<void>
  /** Tear down the map and release resources. */
  destroy(): void

  setCenter(center: LngLatLike): void
  getCenter(): LngLat
  setZoom(zoom: number): void
  getZoom(): number
  fitBounds(points: LngLatLike[], options?: FitBoundsOptions): void

  addMarker(options: MarkerOptions): MarkerHandle
  removeMarker(handle: MarkerHandle): void
  clearMarkers(): void
  getMarkers(): MarkerHandle[]

  addPolyline(options: PolylineOptions): PolylineHandle
  removePolyline(handle: PolylineHandle): void

  on(event: MapTrixEventName, handler: (e: unknown) => void): void

  getNativeMap<T = unknown>(): T

  /** Capability-gated: only present when `capabilities.clustering` is true. */
  enableClustering?(options?: ClusterOptions): Promise<void>
  disableClustering?(): void
}

/** Constructor signature every provider class must expose. */
export interface ProviderConstructor {
  new (config?: Record<string, unknown>): IMapProvider
}
