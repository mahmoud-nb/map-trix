/**
 * Provider-agnostic types shared across the whole library.
 * Nothing here depends on a specific map client (Google, Leaflet, GL...).
 */

/** Canonical coordinate shape used internally. */
export interface LngLat {
  lat: number
  lng: number
}

/**
 * Anything that can be understood as a coordinate:
 * - `{ lat, lng }` (canonical)
 * - `{ latitude, longitude }` (legacy MapTrix shape)
 * - `[lng, lat]` (GeoJSON / GL order)
 */
export type LngLatLike =
  | LngLat
  | { latitude: number; longitude: number }
  | [lng: number, lat: number]

export interface MarkerIcon {
  url: string
  /** [width, height] in pixels. */
  size?: [number, number]
  /** [x, y] anchor offset in pixels. */
  anchor?: [number, number]
}

export interface PopupOptions {
  content: string | HTMLElement
  maxWidth?: number
  /** [x, y] offset in pixels. */
  offset?: [number, number]
}

export interface MarkerOptions {
  position: LngLatLike
  /** Stable id; generated when omitted. */
  id?: string
  title?: string
  draggable?: boolean
  icon?: string | MarkerIcon
  /** Popup content or full options. */
  popup?: string | PopupOptions
  /** Open the popup on marker click (default: true when `popup` is set). */
  openPopupOnClick?: boolean
  /** Arbitrary user payload — used by the store locator and filtering. */
  data?: unknown
}

export interface MapTrixMapOptions {
  container: string | HTMLElement
  center?: LngLatLike
  zoom?: number
  minZoom?: number
  maxZoom?: number
  /**
   * Provider-dependent base style:
   * - Leaflet: XYZ tile URL template
   * - MapLibre/Mapbox: style URL or style object
   * - Google: `mapId`
   */
  style?: string | Record<string, unknown>
  /** Escape hatch merged into the native map constructor options. */
  providerOptions?: Record<string, unknown>
}

export interface PolylineOptions {
  path: LngLatLike[]
  color?: string
  weight?: number
  opacity?: number
}

export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit'

/** Normalized routing result, independent of the routing backend. */
export interface RouteResult {
  /** Total distance in meters. */
  distance: number
  /** Total duration in seconds. */
  duration: number
  /** Decoded route geometry. */
  geometry: LngLat[]
  /** Native result from the underlying routing service. */
  raw: unknown
}

export type MapTrixEventName = 'ready' | 'click' | 'moveend' | 'zoomend'

export interface MapClickEvent {
  position: LngLat
  originalEvent?: unknown
}

export type MarkerEventName = 'click' | 'dragend'

export interface MarkerEvent {
  marker: MarkerHandle
  position: LngLat
  originalEvent?: unknown
}

/**
 * Opaque handle to a marker living on the map.
 * The facade only ever manipulates markers through this interface.
 */
export interface MarkerHandle {
  readonly id: string
  readonly data: unknown
  getPosition(): LngLat
  setPosition(position: LngLatLike): void
  openPopup(): void
  closePopup(): void
  remove(): void
  on(event: MarkerEventName, handler: (e: MarkerEvent) => void): void
  getNative<T = unknown>(): T
}

export interface PolylineHandle {
  remove(): void
  getNative<T = unknown>(): T
}
