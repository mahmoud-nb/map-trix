export type Position = {
    latitude: number
    longitude: number
}

export type customMarkerOptions = google.maps.MarkerOptions & {
    latitude: number
    longitude: number
    content?: string
}

export type MapTrixConfig = {
    enableBounds: boolean
}
