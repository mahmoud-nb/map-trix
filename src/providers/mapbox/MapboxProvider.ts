import { GLProvider } from '../gl/GLProvider'
import type { GLModule } from '../gl/GLProvider'

export default class MapboxProvider extends GLProvider {
  readonly name = 'mapbox'

  protected get defaultStyle(): string {
    return 'mapbox://styles/mapbox/streets-v12'
  }

  protected get cdnCss(): string {
    return 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css'
  }

  protected mapConstructorExtras(): Record<string, unknown> {
    return this.config.accessToken ? { accessToken: this.config.accessToken } : {}
  }

  protected async loadGL(): Promise<GLModule> {
    const mod = await import('mapbox-gl')
    const gl = (mod as unknown as { default?: unknown }).default ?? mod
    if (this.config.accessToken) {
      ;(gl as unknown as { accessToken?: string }).accessToken = this.config.accessToken
    }
    return gl as unknown as GLModule
  }
}
