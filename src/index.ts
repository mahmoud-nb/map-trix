import { MapTrix } from './MapTrix'
import { resolveProvider } from './core/registry'
import type { ProviderName } from './core/registry'
import type { IMapProvider } from './core/provider'
import type { MapTrixMapOptions } from './core/types'
import type { googleMapsOptions } from './providers/google/loader'
import Utils from './utils/utils'

export { MapTrix, Utils }
export { StoreLocator } from './features/store-locator'
export { toLngLat, haversineDistance, boundsOf } from './utils/geo'

// Public type surface
export type {
  LngLat,
  LngLatLike,
  MarkerIcon,
  PopupOptions,
  MarkerOptions,
  MapTrixMapOptions,
  PolylineOptions,
  TravelMode,
  RouteResult,
  MarkerHandle,
  PolylineHandle,
  MapTrixEventName,
  MapClickEvent,
  MarkerEvent,
} from './core/types'
export type {
  IMapProvider,
  ProviderCapabilities,
  ClusterOptions,
  FitBoundsOptions,
} from './core/provider'
export type { ProviderName } from './core/registry'
export type { StoreLocation, StoreLocatorOptions, NearestResult } from './features/store-locator'
// Legacy types kept for backward compatibility
export type { Position, customMarkerOptions, MapTrixConfig } from './types/globals'
export type { googleMapsOptions } from './providers/google/loader'

export interface CreateMapOptions extends MapTrixMapOptions {
  /** Provider name (lazy-loaded) or a ready provider instance. */
  provider: ProviderName | IMapProvider
  /** Google Maps API key. */
  apiKey?: string
  /** Mapbox access token. */
  accessToken?: string
  /** Google Maps loader options. */
  language?: string
  version?: string
  libraries?: string[]
  /** Custom OSRM endpoint for routing on non-native providers. */
  osrmEndpoint?: string
}

/**
 * Create a ready-to-use map with the chosen provider.
 *
 * @example
 * const map = await createMap({ provider: 'leaflet', container: '#map', zoom: 12 })
 */
export async function createMap(options: CreateMapOptions): Promise<MapTrix> {
  const {
    provider,
    apiKey,
    accessToken,
    language,
    version,
    libraries,
    osrmEndpoint,
    ...mapOptions
  } = options

  const instance = await resolveProvider(provider, {
    apiKey,
    accessToken,
    language,
    version,
    libraries,
  })

  await instance.loadSdk()

  const map = new MapTrix(instance)
  if (osrmEndpoint) map.setRoutingOptions({ osrmEndpoint })

  await map.create(mapOptions)
  return map
}

/**
 * Load Google Maps and create a MapTrix instance (map created later via `init()`).
 *
 * @deprecated since 2.0 — use `createMap({ provider: 'google', ... })`.
 * @param apiKey Your Google Maps API key. @deprecated use `options.key`.
 * @param options Google Maps loader options.
 */
export async function createMapTrix(
  apiKey: string | null = null,
  options: googleMapsOptions = {},
): Promise<MapTrix> {
  const { default: GoogleProvider } = await import('./providers/google/GoogleProvider')

  const provider = new GoogleProvider({
    apiKey: apiKey ?? options.key,
    language: options.language,
    version: options.version,
    libraries: options.libraries,
  })

  await provider.loadSdk()
  return new MapTrix(provider)
}
