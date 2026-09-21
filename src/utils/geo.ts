import type { LngLat, LngLatLike } from '../core/types'

/** Earth mean radius in meters. */
const EARTH_RADIUS = 6_371_008.8

/** Normalize any accepted coordinate shape to the canonical `{ lat, lng }`. */
export function toLngLat(input: LngLatLike): LngLat {
  if (Array.isArray(input)) {
    return { lng: input[0], lat: input[1] }
  }
  if ('latitude' in input && 'longitude' in input) {
    return { lat: input.latitude, lng: input.longitude }
  }
  return { lat: input.lat, lng: input.lng }
}

/** `[lng, lat]` tuple (GeoJSON / GL order). */
export function toLngLatArray(input: LngLatLike): [number, number] {
  const { lat, lng } = toLngLat(input)
  return [lng, lat]
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two points, in meters (haversine). */
export function haversineDistance(a: LngLatLike, b: LngLatLike): number {
  const p1 = toLngLat(a)
  const p2 = toLngLat(b)

  const dLat = toRad(p2.lat - p1.lat)
  const dLng = toRad(p2.lng - p1.lng)

  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)

  const h =
    sinLat * sinLat +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * sinLng * sinLng

  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface Bounds {
  sw: LngLat
  ne: LngLat
}

/** Axis-aligned bounding box of a set of points. */
export function boundsOf(points: LngLatLike[]): Bounds | null {
  if (points.length === 0) return null

  let minLat = Infinity
  let minLng = Infinity
  let maxLat = -Infinity
  let maxLng = -Infinity

  for (const point of points) {
    const { lat, lng } = toLngLat(point)
    if (lat < minLat) minLat = lat
    if (lng < minLng) minLng = lng
    if (lat > maxLat) maxLat = lat
    if (lng > maxLng) maxLng = lng
  }

  return {
    sw: { lat: minLat, lng: minLng },
    ne: { lat: maxLat, lng: maxLng },
  }
}
