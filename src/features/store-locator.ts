import type { MapTrix } from '../MapTrix'
import type { LngLat, LngLatLike, MarkerHandle, MarkerOptions } from '../core/types'
import { haversineDistance } from '../utils/geo'
import Utils from '../utils/utils'

/** A locatable place: a marker plus arbitrary `data`. */
export type StoreLocation = MarkerOptions

export interface StoreLocatorOptions {
  locations?: StoreLocation[]
  /** Fit the map to all locations after loading (default: true). */
  fitOnLoad?: boolean
  /** Called when a location marker is clicked. */
  onSelect?: (result: { location: StoreLocation; marker: MarkerHandle }) => void
}

export interface NearestResult {
  location: StoreLocation
  marker: MarkerHandle
  /** Distance from the query point in meters. */
  distance: number
}

/**
 * Provider-agnostic store locator built entirely on the MapTrix facade and the
 * geo utilities — works identically on Google, Leaflet, MapLibre and Mapbox.
 */
export class StoreLocator {
  private map: MapTrix
  private all: StoreLocation[] = []
  private handles = new Map<MarkerHandle, StoreLocation>()
  private selectHandler?: StoreLocatorOptions['onSelect']

  constructor(map: MapTrix, options: StoreLocatorOptions = {}) {
    this.map = map
    this.selectHandler = options.onSelect
    if (options.locations) this.load(options.locations, options.fitOnLoad ?? true)
  }

  /** Load (replacing) the full set of locations. */
  load(locations: StoreLocation[], fit = true): MarkerHandle[] {
    this.all = [...locations]
    return this.render(this.all, fit)
  }

  /** Show only the locations matching the predicate (keeps the full set). */
  filter(predicate: (location: StoreLocation) => boolean, fit = true): MarkerHandle[] {
    return this.render(this.all.filter(predicate), fit)
  }

  /** Re-display every loaded location. */
  reset(fit = true): MarkerHandle[] {
    return this.render(this.all, fit)
  }

  /** The N nearest loaded locations to a point, closest first. */
  findNearest(from: LngLatLike, count = 1): NearestResult[] {
    return [...this.handles.entries()]
      .map(([marker, location]) => ({
        marker,
        location,
        distance: haversineDistance(from, location.position),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count)
  }

  /** Fit the map to the currently displayed locations. */
  fitAll(): void {
    const positions = [...this.handles.values()].map((l) => l.position)
    if (positions.length) this.map.fitBounds(positions, { padding: 48 })
  }

  /** Resolve the user's current position (via the Geolocation API). */
  async locateUser(): Promise<LngLat> {
    const position = await Utils.getCurrentPosition()
    return { lat: position.coords.latitude, lng: position.coords.longitude }
  }

  /** Register a selection handler (marker click). */
  onSelect(handler: StoreLocatorOptions['onSelect']): void {
    this.selectHandler = handler
  }

  /** Remove every marker created by this locator. */
  clear(): void {
    for (const marker of this.handles.keys()) this.map.removeMarker(marker)
    this.handles.clear()
  }

  private render(list: StoreLocation[], fit: boolean): MarkerHandle[] {
    this.clear()

    const handles = list.map((location) => {
      const marker = this.map.addMarker(location)
      this.handles.set(marker, location)
      marker.on('click', () => this.selectHandler?.({ location, marker }))
      return marker
    })

    if (fit && handles.length) {
      this.map.fitBounds(handles.map((h) => h.getPosition()), { padding: 48 })
    }

    return handles
  }
}
