---
"map-trix": major
---

Multi-provider rewrite: one unified API across Google Maps, Leaflet, MapLibre and Mapbox.

- New `createMap({ provider, container, ... })` entry point (provider by name, lazily imported, or by instance) plus per-provider subpath exports (`map-trix/google`, `/leaflet`, `/maplibre`, `/mapbox`).
- Provider-agnostic facade with markers, popups, polylines, `fitBounds`, events and a native escape hatch (`getNativeMap()`, `getProvider()`).
- Unified **routing** (`traceDirection`): native Google Directions, OSRM elsewhere; returns a normalized `RouteResult`.
- Unified **clustering** (`enableClustering`): MarkerClusterer (Google), leaflet.markercluster (Leaflet), native GL clustering (MapLibre/Mapbox).
- Provider-agnostic **StoreLocator** (nearest/filter/fitAll/locateUser) built on haversine geo utilities.
- SDKs are now optional peer dependencies loaded on demand; published TypeScript declarations are fixed and emitted per entry point.

**Breaking**: `traceDirection` now resolves a normalized `RouteResult` (the native result is available on `.raw`), and `point()` returns a `{ lat, lng }` literal. The legacy `createMapTrix()` / `init()` / `addMarker({ latitude, longitude, content })` API still works but is deprecated in favour of `createMap()`.
