import { _loadGoogleMapsScript } from './utils/loader'

const defaultOptions = {
    language: 'fr'
}

/**
 * 
 * @param {String} API_KEY 
 * @param {Object} options 
 * @returns {MapTrix} MapTrix instance
 */
export async function createMapTrix(API_KEY = null, { language = 'en'} = {}) {
    if (typeof google == 'undefined') {
        const options = {
            language,
        }
        await _loadGoogleMapsScript(API_KEY, options)
        return new MapTrix()
    }

    return new MapTrix()
}

const defaultConfig = {
    enableBounds: false,
}

const defaultMapOptions = {
    center: { latitude: 48.92340114684859, longitude: 2.259291646326453 },
    zoom: 9,
    minZoom: 2,
    disableDefaultUI: false,
    //zoomControl: true,
    //zoomControlOptions: {style: google.maps.ZoomControlStyle.SMALL},
};

const defaultMarkerOptions = {}

export class MapTrix {

    config = {}

    mapEl = null

    map = null
    mapOptions = {}

    markers = []
    markerOptions = {}

    currentInfoWindow = null

    bounds = null

    directionsService = null
    directionsRenderer = null

    constructor (API_KEY = null) {

        if (typeof google == 'undefined') 
            _loadGoogleMapsScript(API_KEY, defaultOptions)
    }

    init(mapElSelector = '#mapContainer', customMapOptions = {}, config = {}) {
        
        this.config = {
            ...defaultConfig,
            ...config,
        }

        this.mapOptions = {
            ...defaultMapOptions,
            center: this.point(customMapOptions?.center?.latitude && customMapOptions?.center?.longitude ? {
                ...ustomMapOptions.center
            } : {
                ...defaultMapOptions.center
            }),
            ...customMapOptions,
        }

        this.mapEl = document.querySelector(mapElSelector);

        this.map = new google.maps.Map(this.mapEl, this.mapOptions)

        if (this.config.enableBounds){
            this.bounds = google.maps ? new google.maps.LatLngBounds() : null
        }
    }


    /**
	 * Set map options
     * @param {Object} options
	 */
    setMapOptions(options) {
        try {
            
            if(options.latitude && options.langitude) {
                options.center = this.point({latitude: options.latitude, langitude: options.langitude});
            }

            options.zoom = parseInt(options.zoom);

            this.map.setOptions(options);
        }catch (e) {
            console.log( 'Exception', e );
        }
    }

    point(p) {
        return new google.maps.LatLng(p.latitude, p.longitude)
    }

    // MARKERS ##############################################
    /**
	 * Add marker
	 * @param {Object} options : object{ title, content, latitude, longitude, draggable, icon ... }
     * @param {Boolean} enableInfoWindow
	 */
    addMarker(options = null, enableInfoWindow = false) {
        if(options && options?.latitude && typeof options?.longitude) {
            this.markerOptions = {
                ...defaultMarkerOptions,
                ...options,
                map: this.map,
                position: new google.maps.LatLng(options.latitude, options.longitude),
            }

            const marker = new google.maps.Marker(this.markerOptions)

            this.markers.push(marker);

            if(enableInfoWindow) {
                const infoWindow = this.createInfoWindow(options)

                if(infoWindow)
                    google.maps.event.addListener(marker, 'click', this.openInfoWindow(infoWindow, marker));
            }

            if (this.config.enableBounds){
                this.bounds.extend(marker.position)
                this.map.fitBounds(this.bounds)
            }
        }
    }

    /**
	 * Delete Marker
	 */
    deleteMarker(marker) {
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
    createInfoWindow(data) {
        if(!data) return null

        const infoWindow = new google.maps.InfoWindow({ title: data.title, content: data.content });

        google.maps.event.addListener(infoWindow, 'closeclick', this.closeInfoWindow(infoWindow))

        return infoWindow
    }

    /**
     * Open InfoWindow
     * @param {InfoWindow} infoWindow 
     * @param {Marker} marker  
     */
    openInfoWindow(infoWindow, marker) {
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
    closeInfoWindow(infoWindow) {
        return () => {
            infoWindow.close()
        }
    }

    // Bounds ######################################################
    boundsMarkers() {
    	if(!this.bounds)
    		this.bounds = new google.maps.LatLngBounds()
    	
        if (this.markers.length > 0) {
            this.markers.forEach(marker => {
                const position = new google.maps.LatLng(marker.latitude, marker.longitude)
                this.bounds.extend(position)
            })
            this.map.fitBounds(this.bounds)
        }
    }

    // Direction ####################################################
    /**
     * 
     * @param {String|{latitude, longitude}} start 
     * @param {String|{latitude, longitude}} end 
     * @param {String} travelMode   // DRIVING | BICYCLING | TRANSIT | WALKING | TWO_WHEELER
     */
    traceDirection(start, end, travelMode = 'DRIVING') {

        if (this.directionsService == null) {
			this.directionsService = new google.maps.DirectionsService();
			this.directionsRenderer = new google.maps.DirectionsRenderer();
			this.directionsRenderer.setMap(this.map);
		}

        return new Promise((resolve, reject) => {    
            
            try {
                const origin = start.latitude && start.longitude ? new google.maps.LatLng(start.latitude, start.longitude) : start
                const destination = end.longitude && end.longitude ? new google.maps.LatLng(end.latitude, end.longitude)  : end
    
                const request = {
                    origin,
                    destination,
                    travelMode: google.maps.TravelMode[travelMode],
                }
                this.directionsService.route(request, (result, status) => {
                    if (status == 'OK') {
                        this.directionsRenderer.setDirections(result);
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
