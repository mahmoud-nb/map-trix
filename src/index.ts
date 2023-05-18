import { _loadGoogleMapsScript } from './utils/loader'
import { customMarkerOptions } from './types/globals'

const defaultOptions = {
    language: 'fr',
    version: 'weekly',
}

/**
 *
 * @param {String} API_KEY
 * @param {Object} options
 * @returns {MapTrix} MapTrix instance
 */
export async function createMapTrix(API_KEY:string = null, { language = 'en', version = 'weekly'} = {}, callback = () => new MapTrix()) {
    if (typeof google == 'undefined') {
        const options = {
            language,
            version,
            //callback: () => new MapTrix()
        }
        await _loadGoogleMapsScript(API_KEY, options, callback)
        //return new MapTrix()
    }

    return callback()
}

const defaultConfig = {
    enableBounds: false,
}

const defaultMapOptions = {
    center: { lat: 48.92340114684859, lng: 2.259291646326453 },
    zoom: 9,
    minZoom: 2,
    disableDefaultUI: false,
    //zoomControl: true,
    //zoomControlOptions: {style: google.maps.ZoomControlStyle.SMALL},
}

const defaultMarkerOptions = {}

export class MapTrix {

    config:any = {}

    mapEl:HTMLElement = null

    map:google.maps.Map = null
    mapOptions:google.maps.MapOptions = {}

    markers:Array<google.maps.Marker> = []
    markerOptions:google.maps.MarkerOptions = {}

    currentInfoWindow:google.maps.InfoWindow = null

    bounds:google.maps.LatLngBounds = null

    directionsService:google.maps.DirectionsService = null
    directionsRenderer:google.maps.DirectionsRenderer = null

    constructor (API_KEY:string = null) {

        if (typeof google == 'undefined')
            _loadGoogleMapsScript(API_KEY, defaultOptions)
    }

    init(mapElSelector = '#mapContainer', customMapOptions:any = {}, config:any = {}) {
        
        if (this.map !== null) throw new Error('a map is already loaded for this instance!')

        this.config = {
            ...defaultConfig,
            ...config,
        }

        const latitude = customMapOptions?.center?.lat || defaultMapOptions.center.lat
        const longitude = customMapOptions?.center?.lng || defaultMapOptions.center.lng

        this.mapOptions = {
            ...defaultMapOptions,
            center: this.point(latitude, longitude),
            ...customMapOptions,
        }

        const $mapElSelector = <HTMLElement>document.querySelector(mapElSelector)

        if ($mapElSelector) {
            this.mapEl = $mapElSelector

            // TODO : use new way
            // const { Map } = await google.maps.importLibrary("maps")
            // this.map = new Map(this.mapEl, this.mapOptions)

            this.map = new google.maps.Map(this.mapEl, this.mapOptions)
    
            if (this.config.enableBounds){
                this.bounds = google.maps ? new google.maps.LatLngBounds() : null
            }
        } else {
            throw new Error('Map container element not found')
        }
    }

    /**
	 * Set map options
     * @param {google.maps.MapOptions} options
	 */
    setMapOptions(options:any) {
        try {

            if(options.latitude && options.langitude) {
                options.center = this.point(options.latitude, options.langitude)
            }

            this.map.setOptions(options)
        }catch (e) {
            console.log('Exception', e)
        }
    }

    point(latitude:number, longitude:number) {
        return new google.maps.LatLng(latitude, longitude)
    }

    // MARKERS ##############################################
    /**
	 * Add marker
	 * @param {Object} options : object{ title, content, latitude, longitude, draggable, icon ... }
     * @param {Boolean} enableInfoWindow
	 */
    addMarker(options:customMarkerOptions, enableInfoWindow = false) {
        if(options?.latitude && typeof options?.longitude) {
            this.markerOptions = {
                ...defaultMarkerOptions,
                ...options,
                map: this.map,
                position: new google.maps.LatLng(options.latitude, options.longitude),
            }

            const marker = new google.maps.Marker(this.markerOptions)

            this.markers.push(marker)

            if(enableInfoWindow) {
                const infoWindow = this.createInfoWindow(options)

                if(infoWindow)
                    google.maps.event.addListener(marker, 'click', this.openInfoWindow(infoWindow, marker))
            }

            if (this.config.enableBounds){
                this.bounds.extend(marker.getPosition())
                this.map.fitBounds(this.bounds)
            }
        }
    }

    /**
	 * Delete Marker
	 */
    deleteMarker(marker:google.maps.Marker) {
        marker.setMap(null)
    }

    /**
	 * Clear all Markers
	 */
    clearMarkers () {
        this.markers.forEach(marker => this.deleteMarker(marker))
        this.markers = []
    }

    // InfoWindow ############################################

    /**
     * Create InfoWindow
     * @param {Object} data
     * @returns {InfoWindow}
     */
    createInfoWindow(data:any):google.maps.InfoWindow {
        if(!data) return null

        const infoWindow = new google.maps.InfoWindow({ content: data.content })

        google.maps.event.addListener(infoWindow, 'closeclick', this.closeInfoWindow(infoWindow))

        return infoWindow
    }

    /**
     * Open InfoWindow
     * @param {InfoWindow} infoWindow
     * @param {Marker} marker
     */
    openInfoWindow(infoWindow:google.maps.InfoWindow, marker:google.maps.Marker) {
        return () => {
            // Close the last selected marker before opening this one.
            if (this.currentInfoWindow) {
                this.currentInfoWindow.close()
            }

            infoWindow.open(this.map, marker)
            this.currentInfoWindow = infoWindow
        }
    }

    /**
	 * Close InfoWindow
     * @param {InfoWindow} infoWindow
	 */
    closeInfoWindow(infoWindow:google.maps.InfoWindow) {
        return () => {
            infoWindow.close()
        }
    }

    // Bounds ######################################################
    boundsMarkers() {
        if(!this.bounds)
            this.bounds = new google.maps.LatLngBounds()

        if (this.markers.length > 0) {
            this.markers.forEach(marker => this.bounds.extend(marker.getPosition()))
            this.map.fitBounds(this.bounds)
        }
    }

    // Direction ####################################################
    /**
     * string|google.maps.LatLng|google.maps.Place|google.maps.LatLngLiteral|Position
     * @param {String} start
     * @param {String} end
     * @param {String} travelMode   // DRIVING | BICYCLING | TRANSIT | WALKING | TWO_WHEELER
     */
    traceDirection(start:any, end:any, travelMode:google.maps.TravelMode = google.maps.TravelMode.DRIVING) {

        if (this.directionsService == null) {
            this.directionsService = new google.maps.DirectionsService()
            this.directionsRenderer = new google.maps.DirectionsRenderer()
            this.directionsRenderer.setMap(this.map)
        }

        return new Promise((resolve, reject) => {

            try {
                const origin:string|google.maps.LatLng|google.maps.Place|google.maps.LatLngLiteral = start.latitude && start.longitude ? this.point(start.latitude, start.longitude) : start
                const destination:string|google.maps.LatLng|google.maps.Place|google.maps.LatLngLiteral = end.longitude && end.longitude ? this.point(end.latitude, end.longitude)  : end

                const request:google.maps.DirectionsRequest = {
                    origin,
                    destination,
                    travelMode: google.maps.TravelMode[travelMode],
                }
                this.directionsService.route(request, (result, status) => {
                    if (status == 'OK') {
                        this.directionsRenderer.setDirections(result)
                        resolve(result)
                    }
                })
            } catch (e) {
                reject(e)
            }
        })
    }

    // GeoLocalisation #############################################################
    /**
	 * Load current position
	 */
    getCurrentPosition({enableHighAccuracy = true, timeout = 5000, maximumAge = 0} = {}) {

        const options = {
            enableHighAccuracy,
            timeout,
            maximumAge,
        }

        return new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, options)
        )
    }

}
