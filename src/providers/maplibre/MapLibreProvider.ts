import { GLProvider } from '../gl/GLProvider'
import type { GLModule } from '../gl/GLProvider'

export default class MapLibreProvider extends GLProvider {
  readonly name = 'maplibre'

  /**
   * Self-contained raster style (OpenStreetMap tiles). Works out of the box
   * with no external style.json and no API key.
   */
  protected get defaultStyle(): Record<string, unknown> {
    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    }
  }

  protected get cdnCss(): string {
    return 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.css'
  }

  protected async loadGL(): Promise<GLModule> {
    const mod = await import('maplibre-gl')
    const gl = (mod as unknown as { default?: unknown }).default ?? mod
    return gl as unknown as GLModule
  }
}
