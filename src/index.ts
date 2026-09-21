import { _loadGoogleMapsScript } from './utils/loader'
import type { googleMapsOptions } from './utils/loader'
import type { Position, customMarkerOptions, MapTrixConfig } from './types/globals'
import Utils from './utils/utils'

export { Utils }
export type { googleMapsOptions, Position, customMarkerOptions, MapTrixConfig }

const googleMapsDefaultOptions: googleMapsOptions = {
  language: 'en',
  version: 'weekly',
}

const defaultConfig: MapTrixConfig = {
  enableBounds: false,
}

const defaultMapOptions: google.maps.MapOptions = {
  center: { lat: 48.92340114684859, lng: 2.259291646326453 },
  zoom: 9,
  minZoom: 2,
  disableDefaultUI: false,
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPosition(value: unknown): value is Position {
  return (
    typeof value === 'object' &&
    value !== null &&
    isFiniteNumber((value as Position).latitude) &&
    isFiniteNumber((value as Position).longitude)
  )
}

/**
 * Load the Google Maps script (if needed) and create a MapTrix instance.
 * @param apiKey Your Google Maps API key. @deprecated since 1.4.4, use `options.key` instead.
 * @param options Google Maps loader options.
 * @returns A ready-to-use MapTrix instance.
 */
export async function createMapTrix(
  apiKey: string | null = null,
  options: googleMapsOptions = googleMapsDefaultOptions,
): Promise<MapTrix> {
  if (typeof google === 'object' && google?.maps) return new MapTrix()

  await _loadGoogleMapsScript(apiKey, options)
  return new MapTrix()
}

export class MapTrix {

  config: MapTrixConfig = { ...defaultConfig }

  mapEl: HTMLElement | null = null

  map: google.maps.Map | null = null
  mapOptions: google.maps.MapOptions = {}

  markers: google.maps.Marker[] = []

  currentInfoWindow: google.maps.InfoWindow | null = null

  bounds: google.maps.LatLngBounds | null = null

  directionsService: google.maps.DirectionsService | null = null
  directionsRenderer: google.maps.DirectionsRenderer | null = null

  /**
   * Initialize the map inside the given container.
   * @param mapElSelector CSS selector of the map container element.
   * @param customMapOptions Google Maps options merged over the defaults.
   * @param config MapTrix specific configuration.
   */
  init(
    mapElSelector = '#mapContainer',
    customMapOptions: google.maps.MapOptions = {},
    config: Partial<MapTrixConfig> = {},
  ): void {
    if (typeof google === 'undefined' || !google.maps) {
      throw new Error('Google Maps is not loaded. Use createMapTrix() to load the API first.')
    }

    if (this.map !== null) throw new Error('a map is already loaded for this instance!')

    this.config = {
      ...defaultConfig,
      ...config,
    }

    this.mapOptions = {
      ...defaultMapOptions,
      ...customMapOptions,
      center: customMapOptions.center ?? defaultMapOptions.center,
    }

    const mapEl = document.querySelector<HTMLElement>(mapElSelector)

    if (!mapEl) throw new Error('Map container element not found')

    this.mapEl = mapEl
    this.map = new google.maps.Map(this.mapEl, this.mapOptions)

    if (this.config.enableBounds) {
      this.bounds = new google.maps.LatLngBounds()
    }
  }

  private ensureMap(): google.maps.Map {
    if (!this.map) {
      throw new Error('Map is not initialized. Call init() first.')
    }
    return this.map
  }

  /**
   * Set map options.
   * @param options Google Maps options. `latitude`/`longitude` are converted to `center`.
   */
  setMapOptions(options: google.maps.MapOptions & { latitude?: number; longitude?: number }): void {
    const map = this.ensureMap()
    const { latitude, longitude, ...mapOptions } = options

    if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
      mapOptions.center = this.point(latitude, longitude)
    }

    map.setOptions(mapOptions)
  }

  point(latitude: number, longitude: number): google.maps.LatLng {
    return new google.maps.LatLng(latitude, longitude)
  }

  // MARKERS ##############################################
  /**
   * Add a marker to the map.
   * @param options Marker options including `latitude`, `longitude` and an optional `content`.
   * @param enableInfoWindow Whether to open an InfoWindow (using `content`) on click.
   * @returns The created marker, or `undefined` when coordinates are invalid.
   */
  addMarker(options: customMarkerOptions, enableInfoWindow = false): google.maps.Marker | undefined {
    if (!isFiniteNumber(options?.latitude) || !isFiniteNumber(options?.longitude)) {
      return undefined
    }

    const map = this.ensureMap()

    const markerOptions: google.maps.MarkerOptions = {
      ...options,
      map,
      position: this.point(options.latitude, options.longitude),
    }

    const marker = new google.maps.Marker(markerOptions)

    this.markers.push(marker)

    if (enableInfoWindow) {
      const infoWindow = this.createInfoWindow(options)

      if (infoWindow) {
        marker.addListener('click', this.openInfoWindow(infoWindow, marker))
      }
    }

    if (this.config.enableBounds) {
      const bounds = this.bounds ?? new google.maps.LatLngBounds()
      this.bounds = bounds

      const position = marker.getPosition()
      if (position) {
        bounds.extend(position)
        map.fitBounds(bounds)
      }
    }

    return marker
  }

  /**
   * Delete a marker: remove it from the map, drop its listeners and forget it.
   */
  deleteMarker(marker: google.maps.Marker): void {
    marker.setMap(null)
    google.maps.event.clearInstanceListeners(marker)
    this.markers = this.markers.filter(m => m !== marker)
  }

  /**
   * Clear all markers.
   */
  clearMarkers(): void {
    this.markers.forEach(marker => {
      marker.setMap(null)
      google.maps.event.clearInstanceListeners(marker)
    })
    this.markers = []
  }

  // InfoWindow ############################################

  /**
   * Create an InfoWindow from marker data.
   * @returns The InfoWindow, or `null` when there is no content to display.
   */
  createInfoWindow(data: { content?: string } | null): google.maps.InfoWindow | null {
    if (!data?.content) return null

    const infoWindow = new google.maps.InfoWindow({ content: data.content })

    infoWindow.addListener('closeclick', this.closeInfoWindow(infoWindow))

    return infoWindow
  }

  /**
   * Returns a click handler that opens the given InfoWindow on the given marker.
   */
  openInfoWindow(infoWindow: google.maps.InfoWindow, marker: google.maps.Marker): () => void {
    return () => {
      // Close the last selected marker before opening this one.
      if (this.currentInfoWindow) {
        this.currentInfoWindow.close()
      }

      if (this.map) {
        infoWindow.open(this.map, marker)
      }
      this.currentInfoWindow = infoWindow
    }
  }

  /**
   * Returns a handler that closes the given InfoWindow.
   */
  closeInfoWindow(infoWindow: google.maps.InfoWindow): () => void {
    return () => {
      infoWindow.close()
      if (this.currentInfoWindow === infoWindow) {
        this.currentInfoWindow = null
      }
    }
  }

  // Bounds ######################################################
  boundsMarkers(): void {
    const map = this.ensureMap()

    const bounds = this.bounds ?? new google.maps.LatLngBounds()
    this.bounds = bounds

    if (this.markers.length === 0) return

    this.markers.forEach(marker => {
      const position = marker.getPosition()
      if (position) bounds.extend(position)
    })

    map.fitBounds(bounds)
  }

  // Direction ####################################################
  /**
   * Trace a route between two points and render it on the map.
   * @param start Origin, as a `{ latitude, longitude }` position or an address string.
   * @param end Destination, as a `{ latitude, longitude }` position or an address string.
   * @param travelMode DRIVING | BICYCLING | TRANSIT | WALKING | TWO_WHEELER
   * @returns A promise resolving with the DirectionsResult, or rejecting on failure.
   */
  traceDirection(
    start: Position | string,
    end: Position | string,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<google.maps.DirectionsResult> {
    const map = this.ensureMap()

    if (this.directionsService === null || this.directionsRenderer === null) {
      this.directionsService = new google.maps.DirectionsService()
      this.directionsRenderer = new google.maps.DirectionsRenderer()
      this.directionsRenderer.setMap(map)
    }

    const directionsService = this.directionsService
    const directionsRenderer = this.directionsRenderer

    const origin = isPosition(start) ? this.point(start.latitude, start.longitude) : start
    const destination = isPosition(end) ? this.point(end.latitude, end.longitude) : end

    return new Promise((resolve, reject) => {
      const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        travelMode,
      }

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result)
          resolve(result)
        } else {
          reject(new Error(`Directions request failed: ${status}`))
        }
      })
    })
  }
}
