import type { IMapProvider } from '../core/provider'
import type { LngLat, LngLatLike, RouteResult, TravelMode } from '../core/types'
import { toLngLat } from '../utils/geo'

export interface RouteRequest {
  start: LngLatLike | string
  end: LngLatLike | string
  mode: TravelMode
  /** OSRM base URL (non-native providers). */
  osrmEndpoint?: string
}

const DEFAULT_OSRM_ENDPOINT = 'https://router.project-osrm.org'

const OSRM_PROFILE: Record<TravelMode, string> = {
  driving: 'driving',
  walking: 'walking',
  cycling: 'cycling',
  transit: 'driving',
}

const GOOGLE_TRAVEL_MODE: Record<TravelMode, string> = {
  driving: 'DRIVING',
  walking: 'WALKING',
  cycling: 'BICYCLING',
  transit: 'TRANSIT',
}

/** Pick the right routing backend based on provider capabilities. */
export async function resolveRoute(
  provider: IMapProvider,
  request: RouteRequest,
): Promise<RouteResult> {
  if (provider.capabilities.nativeDirections && typeof google !== 'undefined') {
    return googleRoute(request)
  }
  return osrmRoute(request)
}

async function googleRoute(request: RouteRequest): Promise<RouteResult> {
  const service = new google.maps.DirectionsService()

  const toGoogle = (value: LngLatLike | string): string | google.maps.LatLngLiteral => {
    if (typeof value === 'string') return value
    const { lat, lng } = toLngLat(value)
    return { lat, lng }
  }

  const result = await service.route({
    origin: toGoogle(request.start),
    destination: toGoogle(request.end),
    travelMode: GOOGLE_TRAVEL_MODE[request.mode] as google.maps.TravelMode,
  })

  const route = result.routes[0]
  const geometry: LngLat[] = (route?.overview_path ?? []).map((p) => ({
    lat: p.lat(),
    lng: p.lng(),
  }))

  let distance = 0
  let duration = 0
  for (const leg of route?.legs ?? []) {
    distance += leg.distance?.value ?? 0
    duration += leg.duration?.value ?? 0
  }

  return { distance, duration, geometry, raw: result }
}

interface OsrmResponse {
  code: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: { coordinates: [number, number][] }
  }>
}

async function osrmRoute(request: RouteRequest): Promise<RouteResult> {
  if (typeof request.start === 'string' || typeof request.end === 'string') {
    throw new Error(
      'OSRM routing requires coordinates. Geocode the address first, or use the Google provider for address-based directions.',
    )
  }

  const endpoint = request.osrmEndpoint ?? DEFAULT_OSRM_ENDPOINT
  const profile = OSRM_PROFILE[request.mode]
  const a = toLngLat(request.start)
  const b = toLngLat(request.end)
  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`
  const url = `${endpoint}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Routing request failed: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as OsrmResponse
  const route = data.routes?.[0]
  if (data.code !== 'Ok' || !route) {
    throw new Error(`No route found (OSRM code: ${data.code}).`)
  }

  const geometry: LngLat[] = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))

  return {
    distance: route.distance,
    duration: route.duration,
    geometry,
    raw: data,
  }
}
