import type {
  FitBoundsOptions,
  IMapProvider,
  ProviderCapabilities,
} from './provider'
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
 * Shared bookkeeping for providers: keeps the marker registry and implements
 * `removeMarker`/`clearMarkers`/`getMarkers` on top of the marker handles.
 * Concrete providers only implement the native-specific parts.
 */
export abstract class BaseProvider implements IMapProvider {
  abstract readonly name: string
  abstract readonly capabilities: ProviderCapabilities

  protected markers: MarkerHandle[] = []

  abstract loadSdk(): Promise<void>
  abstract createMap(options: MapTrixMapOptions): Promise<void>
  abstract destroy(): void

  abstract setCenter(center: LngLatLike): void
  abstract getCenter(): LngLat
  abstract setZoom(zoom: number): void
  abstract getZoom(): number
  abstract fitBounds(points: LngLatLike[], options?: FitBoundsOptions): void

  abstract addMarker(options: MarkerOptions): MarkerHandle
  abstract addPolyline(options: PolylineOptions): PolylineHandle
  abstract removePolyline(handle: PolylineHandle): void
  abstract on(event: MapTrixEventName, handler: (e: unknown) => void): void
  abstract getNativeMap<T = unknown>(): T

  removeMarker(handle: MarkerHandle): void {
    handle.remove()
    this.markers = this.markers.filter((marker) => marker !== handle)
  }

  clearMarkers(): void {
    for (const marker of this.markers) marker.remove()
    this.markers = []
  }

  getMarkers(): MarkerHandle[] {
    return [...this.markers]
  }

  /** Register a freshly created handle so the base can manage its lifecycle. */
  protected track(handle: MarkerHandle): MarkerHandle {
    this.markers.push(handle)
    return handle
  }
}
