# Map Trix : Google Maps Interface

[![npm](https://img.shields.io/npm/v/map-trix)](https://www.npmjs.com/package/map-trix)

## Description
This module provides an easy to use interface that allows to load and use Google Maps API.

## Install
Available via npm as the package [Map Trix](https://www.npmjs.com/package/map-trix).

```sh
npm install map-trix
```

## Documentation and Usage
Load the lib and create an instance
```javascript
import { createMapTrix } from 'map-trix'

// Google Maps lib options
const options = { 
    key: 'Your Google API Key',
    language: 'en', 
    version: 'weekly', 
    libraries: ["places"]
    /* TODO : to be completed */ 
}

/**
 * Load the lib and create an instance
 * @param {string} API_KEY : Your Google API Key @deprecated since version 1.4.4 please use options.key
 * @param {object} options : { center: { lat: 0, lng: 0 }, zoom: 5 ... }
 * @param {object} config : { enableBounds: false }
 * @returns : MapTrix instance
 */ 
const mapTrix = await createMapTrix(API_KEY, options)

mapTrix.init('#YourMapElSelector')
```

Add marker
```javascript
// Add marker without infoWindow
const point1 = {
    latitude: 48.85840, 
    longitude: 2.29448
}
mapTrix.addMarker(point)

// Add marker with infoWindow
const point2 = {
    latitude: 48.87574, 
    longitude: 2.29517, 
    content: 'infoWindow content'
}
mapTrix.addMarker(point2, true)

// Center map on loaded markers
mapTrix.boundsMarkers()
```

Create route between two points
```javascript 
/**
 * @param {String|{latitude, longitude}} origin
 * @param {String|{latitude, longitude}} destination
 */
mapTrix.traceDirection(point1, point2).then( successResponse => /* Your code here */ )
```

Load current location
```javascript 
import Utils from './utils/utils'


/**
 * Load current user position
 * @param {enableHighAccuracy = true, timeout = 5000, maximumAge = 0}
 */
Utils.getCurrentPosition().then( response => {
    // Your code here...
    // for example
    mapTrix.addMarker({
        latitude: response.coords.latitude, 
        longitude: response.coords.longitude, 
        content: 'My position'}, 
        true
    )
})
```
