# Map Trix : one API for every map

[![npm](https://img.shields.io/npm/v/map-trix)](https://www.npmjs.com/package/map-trix)

Map-Trix gives you **a single, easy-to-use interface** to display and customize
maps — markers, popups, store locators, routes and clustering — on top of the
map client of your choice: **Google Maps, Leaflet, MapLibre or Mapbox**.

Switch providers by changing one option; your application code stays the same.

## Install

```sh
npm install map-trix
```

Then install the SDK(s) of the provider(s) you use (they are **optional peer
dependencies**, so you only ship what you need):

```sh
npm install leaflet                     # Leaflet
npm install maplibre-gl                 # MapLibre
npm install mapbox-gl                   # Mapbox
# Google Maps is loaded via <script> injection — no package needed
# Optional clustering plugins:
npm install leaflet.markercluster @googlemaps/markerclusterer
```

## Quick start

```javascript
import { createMap } from 'map-trix'

const map = await createMap({
  provider: 'leaflet',                 // 'google' | 'leaflet' | 'maplibre' | 'mapbox'
  container: '#map',
  center: { lat: 48.8566, lng: 2.3522 },
  zoom: 12,
  // apiKey: '…'        // Google
  // accessToken: '…'   // Mapbox
  // style: '…'         // GL style URL/object, or Leaflet tile URL template
})

// Coordinates accept { lat, lng }, { latitude, longitude } or [lng, lat]
const marker = map.addMarker({
  position: { lat: 48.8584, lng: 2.2945 },
  popup: '<b>Eiffel Tower</b>',
  data: { id: 1 },        // any payload you like
})

map.fitBounds()           // fit to all markers
```

Each provider also has its own entry point for explicit imports and full
tree-shaking:

```javascript
import { createMap } from 'map-trix'
import MapLibreProvider from 'map-trix/maplibre'

const map = await createMap({ provider: new MapLibreProvider(), container: '#map' })
```

> **CSS** — Leaflet, MapLibre and Mapbox need their stylesheet. Import it in your
> app (`import 'leaflet/dist/leaflet.css'`, `import 'maplibre-gl/dist/maplibre-gl.css'`, …)
> or let the provider inject it: `createMap({ provider: 'leaflet', css: true, … })`.

## Markers & popups

```javascript
const m = map.addMarker({
  position: [2.2945, 48.8584],           // [lng, lat]
  title: 'HQ',
  icon: { url: '/pin.png', size: [32, 32], anchor: [16, 32] },
  popup: { content: 'Hello', maxWidth: 240 },
  openPopupOnClick: true,                 // default when `popup` is set
})

m.on('click', (e) => console.log(e.position))
m.openPopup()
map.removeMarker(m)
map.clearMarkers()
```

## Store locator

Provider-agnostic helper for “find the nearest store” experiences.

```javascript
import { StoreLocator } from 'map-trix'

const locator = new StoreLocator(map, {
  locations: stores,                      // [{ position, popup, data }, …]
  onSelect: ({ location }) => console.log('picked', location.data),
})

const nearest = locator.findNearest({ lat: 48.86, lng: 2.35 }, 3)  // haversine
locator.filter((s) => s.data.open)         // show a subset
const me = await locator.locateUser()      // browser geolocation
```

## Routing

```javascript
// Uses the provider's native directions (Google) or OSRM otherwise,
// draws the route and returns a normalized result.
const route = await map.traceDirection(
  { lat: 48.8584, lng: 2.2945 },
  { lat: 48.8530, lng: 2.3499 },
  'driving',                               // 'driving' | 'walking' | 'cycling' | 'transit'
)
console.log(route.distance, route.duration, route.geometry)

// Configure a custom OSRM server:
map.setRoutingOptions({ osrmEndpoint: 'https://my-osrm.example.com' })
```

## Clustering

```javascript
await map.enableClustering({ radius: 60 })  // Google/Leaflet plugin, or native GL
map.disableClustering()
```

## Escape hatch

Need something provider-specific? Reach the native objects:

```javascript
map.getNativeMap()                 // google.maps.Map | L.Map | maplibregl.Map | mapboxgl.Map
marker.getNative()                 // the native marker instance
map.getProvider().capabilities     // what the active provider supports
```

## Backward compatibility

The pre-2.0 Google-only API still works (now deprecated in favour of `createMap`):

```javascript
import { createMapTrix, Utils } from 'map-trix'

const mt = await createMapTrix(API_KEY, { language: 'fr' })
mt.init('#map')
mt.addMarker({ latitude: 48.8584, longitude: 2.2945, content: 'Hello' }, true)

Utils.getCurrentPosition().then((pos) => {
  mt.addMarker({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, true)
})
```

## Providers at a glance

| Feature      | Google | Leaflet | MapLibre | Mapbox |
|--------------|:------:|:-------:|:--------:|:------:|
| Markers/popups |  ✅   |   ✅    |    ✅    |   ✅   |
| Polylines      |  ✅   |   ✅    |    ✅    |   ✅   |
| Store locator  |  ✅   |   ✅    |    ✅    |   ✅   |
| Routing        | native | OSRM   |   OSRM   |  OSRM  |
| Clustering     |  ✅   |   ✅    |    ✅    |   ✅   |
| Requires key   | API key | –      |    –     | token  |

See runnable demos in [`examples/`](examples) (Leaflet & MapLibre need no key).
