import type { IMapProvider } from './provider'

export type ProviderName = 'google' | 'leaflet' | 'maplibre' | 'mapbox'

type ProviderModule = { default: new (config?: Record<string, unknown>) => IMapProvider }
type ProviderLoader = () => Promise<ProviderModule>

/**
 * Lazy provider registry. Each entry is a dynamic import so bundlers can split
 * providers into separate chunks — consumers only ship the ones they use.
 */
const registry: Record<ProviderName, ProviderLoader> = {
  google: () => import('../providers/google/GoogleProvider'),
  leaflet: () => import('../providers/leaflet/LeafletProvider'),
  maplibre: () => import('../providers/maplibre/MapLibreProvider'),
  mapbox: () => import('../providers/mapbox/MapboxProvider'),
}

export function isProviderInstance(value: unknown): value is IMapProvider {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IMapProvider).createMap === 'function' &&
    typeof (value as IMapProvider).addMarker === 'function'
  )
}

/** Resolve a provider name (lazy import) or pass through a provider instance. */
export async function resolveProvider(
  provider: ProviderName | IMapProvider,
  config?: Record<string, unknown>,
): Promise<IMapProvider> {
  if (isProviderInstance(provider)) return provider

  const loader = registry[provider]
  if (!loader) {
    throw new Error(
      `Unknown map provider: "${String(provider)}". Expected one of: ${Object.keys(registry).join(', ')}.`,
    )
  }

  const mod = await loader()
  return new mod.default(config)
}
