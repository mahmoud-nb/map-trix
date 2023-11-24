(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["map-trix"] = {}));
})(this, (function (exports) { 'use strict';

    const defaultOptions$1 = {
        language: 'fr',
        version: 'weekly',
        libraries: [],
    };
    async function _loadGoogleMapsScript(API_KEY = null, options = defaultOptions$1, callback) {
        API_KEY = API_KEY || localStorage.getItem('g_api_key');
        let googleLibPath = 'https://maps.googleapis.com/maps/api/js';
        if (options.callback)
            googleLibPath += `?callback=${options.callback}`;
        if (API_KEY)
            googleLibPath += `&key=${API_KEY}`;
        if (options.language)
            googleLibPath += `&language=${options.language}`;
        if (options.version)
            googleLibPath += `&v=${options.version}`;
        if ((options?.libraries?.length || 0) > 0)
            googleLibPath += `&libraries=${options.libraries.join(',')}`;
        await _loadScript(googleLibPath);
        if (typeof callback === 'function')
            callback();
    }
    function _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = src;
            script.defer = true;
            document.head.appendChild(script);
            // Resolve the promise once the script is loaded
            script.addEventListener('load', () => {
                resolve(script);
            });
            // Catch any errors while loading the script
            script.addEventListener('error', () => {
                reject(new Error(`${src} failed to load.`));
            });
        });
    }

    const getCurrentPosition = ({ enableHighAccuracy = true, timeout = 5000, maximumAge = 0 } = {}) => {
        const options = {
            enableHighAccuracy,
            timeout,
            maximumAge,
        };
        return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
    };
    var utils = {
        getCurrentPosition,
    };

    const defaultOptions = {
        language: 'fr',
        version: 'weekly',
    };
    const createMaptrixInstance = function () {
        console.info('## MapTrix instance created, after Google Maps loading...');
        return new MapTrix();
    };
    /**
     *
     * @param {String} API_KEY
     * @param {Object} options
     * @returns {MapTrix} MapTrix instance
     */
    async function createMapTrix(API_KEY = null, { language = 'en', version = 'weekly' } = {}) {
        window.createMaptrixInstance = createMaptrixInstance;
        if (typeof google === 'object')
            return createMaptrixInstance();
        const options = {
            language,
            version,
            callback: 'createMaptrixInstance',
        };
        await _loadGoogleMapsScript(API_KEY, options);
    }
    const defaultConfig = {
        enableBounds: false,
    };
    const defaultMapOptions = {
        center: { lat: 48.92340114684859, lng: 2.259291646326453 },
        zoom: 9,
        minZoom: 2,
        disableDefaultUI: false,
        //zoomControl: true,
        //zoomControlOptions: {style: google.maps.ZoomControlStyle.SMALL},
    };
    const defaultMarkerOptions = {};
    class MapTrix {
        config = {};
        mapEl = null;
        map = null;
        mapOptions = {};
        markers = [];
        markerOptions = {};
        currentInfoWindow = null;
        bounds = null;
        directionsService = null;
        directionsRenderer = null;
        constructor(API_KEY = null) {
            if (typeof google == 'undefined')
                _loadGoogleMapsScript(API_KEY, defaultOptions);
        }
        init(mapElSelector = '#mapContainer', customMapOptions = {}, config = {}) {
            if (this.map !== null)
                throw new Error('a map is already loaded for this instance!');
            this.config = {
                ...defaultConfig,
                ...config,
            };
            const latitude = customMapOptions?.center?.lat || defaultMapOptions.center.lat;
            const longitude = customMapOptions?.center?.lng || defaultMapOptions.center.lng;
            this.mapOptions = {
                ...defaultMapOptions,
                center: this.point(latitude, longitude),
                ...customMapOptions,
            };
            const $mapElSelector = document.querySelector(mapElSelector);
            if ($mapElSelector) {
                this.mapEl = $mapElSelector;
                // TODO : use new way
                // const { Map } = await google.maps.importLibrary("maps")
                // this.map = new Map(this.mapEl, this.mapOptions)
                this.map = new google.maps.Map(this.mapEl, this.mapOptions);
                if (this.config.enableBounds) {
                    this.bounds = google.maps ? new google.maps.LatLngBounds() : null;
                }
            }
            else {
                throw new Error('Map container element not found');
            }
        }
        /**
         * Set map options
         * @param {google.maps.MapOptions} options
         */
        setMapOptions(options) {
            try {
                if (options.latitude && options.langitude) {
                    options.center = this.point(options.latitude, options.langitude);
                }
                this.map.setOptions(options);
            }
            catch (e) {
                console.log('Exception', e);
            }
        }
        point(latitude, longitude) {
            return new google.maps.LatLng(latitude, longitude);
        }
        // MARKERS ##############################################
        /**
         * Add marker
         * @param {Object} options : object{ title, content, latitude, longitude, draggable, icon ... }
         * @param {Boolean} enableInfoWindow
         */
        addMarker(options, enableInfoWindow = false) {
            if (options?.latitude && typeof options?.longitude) {
                this.markerOptions = {
                    ...defaultMarkerOptions,
                    ...options,
                    map: this.map,
                    position: new google.maps.LatLng(options.latitude, options.longitude),
                };
                const marker = new google.maps.Marker(this.markerOptions);
                this.markers.push(marker);
                if (enableInfoWindow) {
                    const infoWindow = this.createInfoWindow(options);
                    if (infoWindow)
                        google.maps.event.addListener(marker, 'click', this.openInfoWindow(infoWindow, marker));
                }
                if (this.config.enableBounds) {
                    this.bounds.extend(marker.getPosition());
                    this.map.fitBounds(this.bounds);
                }
            }
        }
        /**
         * Delete Marker
         */
        deleteMarker(marker) {
            marker.setMap(null);
        }
        /**
         * Clear all Markers
         */
        clearMarkers() {
            this.markers.forEach(marker => this.deleteMarker(marker));
            this.markers = [];
        }
        // InfoWindow ############################################
        /**
         * Create InfoWindow
         * @param {Object} data
         * @returns {InfoWindow}
         */
        createInfoWindow(data) {
            if (!data)
                return null;
            const infoWindow = new google.maps.InfoWindow({ content: data.content });
            google.maps.event.addListener(infoWindow, 'closeclick', this.closeInfoWindow(infoWindow));
            return infoWindow;
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
                    this.currentInfoWindow.close();
                }
                infoWindow.open(this.map, marker);
                this.currentInfoWindow = infoWindow;
            };
        }
        /**
         * Close InfoWindow
         * @param {InfoWindow} infoWindow
         */
        closeInfoWindow(infoWindow) {
            return () => {
                infoWindow.close();
            };
        }
        // Bounds ######################################################
        boundsMarkers() {
            if (!this.bounds)
                this.bounds = new google.maps.LatLngBounds();
            if (this.markers.length > 0) {
                this.markers.forEach(marker => this.bounds.extend(marker.getPosition()));
                this.map.fitBounds(this.bounds);
            }
        }
        // Direction ####################################################
        /**
         * string|google.maps.LatLng|google.maps.Place|google.maps.LatLngLiteral|Position
         * @param {String} start
         * @param {String} end
         * @param {String} travelMode   // DRIVING | BICYCLING | TRANSIT | WALKING | TWO_WHEELER
         */
        traceDirection(start, end, travelMode = google.maps.TravelMode.DRIVING) {
            if (this.directionsService == null) {
                this.directionsService = new google.maps.DirectionsService();
                this.directionsRenderer = new google.maps.DirectionsRenderer();
                this.directionsRenderer.setMap(this.map);
            }
            return new Promise((resolve, reject) => {
                try {
                    const origin = start.latitude && start.longitude ? this.point(start.latitude, start.longitude) : start;
                    const destination = end.longitude && end.longitude ? this.point(end.latitude, end.longitude) : end;
                    const request = {
                        origin,
                        destination,
                        travelMode: google.maps.TravelMode[travelMode],
                    };
                    this.directionsService.route(request, (result, status) => {
                        if (status == 'OK') {
                            this.directionsRenderer.setDirections(result);
                            resolve(result);
                        }
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        }
    }

    exports.MapTrix = MapTrix;
    exports.Utils = utils;
    exports.createMapTrix = createMapTrix;

}));
//# sourceMappingURL=index.js.map
