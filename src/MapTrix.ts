import type { ClusterOptions, FitBoundsOptions, IMapProvider } from './core/provider'
import type {
  LngLat,
  LngLatLike,
  MapTrixEventName,
  MapTrixMapOptions,
  MarkerHandle,
  MarkerOptions,
  PolylineHandle,
  PolylineOptions,
  RouteResult,
  TravelMode,
} from './core/types'
import type { customMarkerOptions, MapTrixConfig, Position } from './types/globals'
import { toLngLat } from './utils/geo'
import { resolveRoute } from './features/routing'

/** Legacy Google `TravelMode` enum values mapped to the agnostic `TravelMode`. */
const LEGACY_TRAVEL_MODE: Record<string, TravelMode> = {
  DRIVING: 'driving',
  WALKING: 'walking',
  BICYCLING: 'cycling',
  TWO_WHEELER: 'cycling',
  TRANSIT: 'transit',
}

function normalizeTravelMode(mode: TravelMode | string | undefined): TravelMode {
  if (!mode) return 'driving'
  if (mode in LEGACY_TRAVEL_MODE) return LEGACY_TRAVEL_MODE[mode]
  return mode as TravelMode
}

function isLegacyMarker(options: unknown): options is customMarkerOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    !('position' in options) &&
    typeof (options as customMarkerOptions).latitude === 'number' &&
    typeof (options as customMarkerOptions).longitude === 'number'
  )
}

/**
 * Provider-agnostic facade. Exposes a single, friendly API and delegates every
 * operation to the active {@link IMapProvider}. Also preserves the historical
 * (Google-only) API surface for backward compatibility.
 */
export class MapTrix {
  private provider: IMapProvider
  private legacyConfig: MapTrixConfig = { enableBounds: false }
  private routingOptions: { osrmEndpoint?: string } = {}

  constructor(provider: IMapProvider) {
    this.provider = provider
  }

  /** The active provider (escape hatch for advanced use). */
  getProvider(): IMapProvider {
    return this.provider
  }

  /** The native map object of the active provider. */
  getNativeMap<T = unknown>(): T {
    return this.provider.getNativeMap<T>()
  }

  /** Configure the OSRM endpoint used for routing on non-native providers. */
  setRoutingOptions(options: { osrmEndpoint?: string }): void {
    this.routingOptions = { ...this.routingOptions, ...options }
  }

  /** Create the map (new, provider-agnostic API). */
  async create(options: MapTrixMapOptions): Promise<void> {
    await this.provider.createMap(options)
  }

  // --- Legacy compatibility ------------------------------------------------

  /**
   * @deprecated Prefer `createMap({ provider, container, ... })`.
   * Kept for backward compatibility with the Google-only API.
   */
  init(
    mapElSelector = '#mapContainer',
    customMapOptions: Record<string, unknown> = {},
    config: Partial<MapTrixConfig> = {},
  ): void {
    this.legacyConfig = { enableBounds: false, ...config }

    const { center, zoom, minZoom, maxZoom, ...rest } = customMapOptions as {
      center?: LngLatLike
      zoom?: number
      minZoom?: number
      maxZoom?: number
    }

    // Google's SDK is already loaded at this point, so createMap resolves
    // synchronously and the native map is available for the calls that follow.
    void this.provider.createMap({
      container: mapElSelector,
      center,
      zoom,
      minZoom,
      maxZoom,
      providerOptions: rest,
    })
  }

  /** @deprecated Use `{ lat, lng }` literals; kept for compatibility. */
  point(latitude: number, longitude: number): LngLat {
    return { lat: latitude, lng: longitude }
  }

  // --- Markers -------------------------------------------------------------

  /**
   * Add a marker. Accepts the new {@link MarkerOptions} or the legacy
   * `{ latitude, longitude, content }` shape (with `enableInfoWindow`).
   */
  addMarker(
    options: MarkerOptions | customMarkerOptions,
    enableInfoWindow = false,
  ): MarkerHandle {
    const normalized = this.normalizeMarker(options, enableInfoWindow)
    const handle = this.provider.addMarker(normalized)

    if (this.legacyConfig.enableBounds) this.boundsMarkers()

    return handle
  }

  private normalizeMarker(
    options: MarkerOptions | customMarkerOptions,
    enableInfoWindow: boolean,
  ): MarkerOptions {
    if (isLegacyMarker(options)) {
      const { latitude, longitude, content, ...rest } = options
      return {
        ...rest,
        position: { lat: latitude, lng: longitude },
        popup: content,
        openPopupOnClick: enableInfoWindow && Boolean(content),
      }
    }
    return options
  }

  removeMarker(handle: MarkerHandle): void {
    this.provider.removeMarker(handle)
  }

  /** @deprecated Alias of {@link removeMarker}. */
  deleteMarker(handle: MarkerHandle): void {
    this.provider.removeMarker(handle)
  }

  clearMarkers(): void {
    this.provider.clearMarkers()
  }

  getMarkers(): MarkerHandle[] {
    return this.provider.getMarkers()
  }

  // --- Camera / bounds -----------------------------------------------------

  setCenter(center: LngLatLike): void {
    this.provider.setCenter(center)
  }

  getCenter(): LngLat {
    return this.provider.getCenter()
  }

  setZoom(zoom: number): void {
    this.provider.setZoom(zoom)
  }

  getZoom(): number {
    return this.provider.getZoom()
  }

  /** Fit the view to the given points, or to all current markers. */
  fitBounds(points?: LngLatLike[], options?: FitBoundsOptions): void {
    const targets = points ?? this.provider.getMarkers().map((m) => m.getPosition())
    if (targets.length === 0) return
    this.provider.fitBounds(targets, options)
  }

  /** @deprecated Use {@link fitBounds}. Fits the view to all markers. */
  boundsMarkers(): void {
    this.fitBounds()
  }

  // --- Polylines -----------------------------------------------------------

  addPolyline(options: PolylineOptions): PolylineHandle {
    return this.provider.addPolyline(options)
  }

  removePolyline(handle: PolylineHandle): void {
    this.provider.removePolyline(handle)
  }

  // --- Events --------------------------------------------------------------

  on(event: MapTrixEventName, handler: (e: unknown) => void): void {
    this.provider.on(event, handler)
  }

  // --- Routing -------------------------------------------------------------

  /**
   * Compute and draw a route between two points. Uses the provider's native
   * directions when available, otherwise OSRM. Resolves with a normalized
   * {@link RouteResult} (`raw` holds the native/service result).
   */
  async traceDirection(
    start: Position | LngLatLike | string,
    end: Position | LngLatLike | string,
    travelMode?: TravelMode | string,
  ): Promise<RouteResult> {
    const route = await resolveRoute(this.provider, {
      start,
      end,
      mode: normalizeTravelMode(travelMode),
      osrmEndpoint: this.routingOptions.osrmEndpoint,
    })

    if (route.geometry.length > 1) {
      this.provider.addPolyline({ path: route.geometry, color: '#4285F4', weight: 5 })
      this.provider.fitBounds(route.geometry, { padding: 48 })
    }

    return route
  }

  // --- Clustering ----------------------------------------------------------

  async enableClustering(options?: ClusterOptions): Promise<void> {
    if (!this.provider.capabilities.clustering || !this.provider.enableClustering) {
      throw new Error(`Provider "${this.provider.name}" does not support clustering.`)
    }
    await this.provider.enableClustering(options)
  }

  disableClustering(): void {
    this.provider.disableClustering?.()
  }

  // --- Lifecycle -----------------------------------------------------------

  destroy(): void {
    this.provider.destroy()
  }
}

export { toLngLat }
