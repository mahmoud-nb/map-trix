export type Position = {
    latitude: number
    longitude: number
}

export type customMarkerOptions = {
    latitude: number
    longitude: number
    content?: string
    title?: string
    draggable?: boolean
}

export type MapTrixConfig = {
    enableBounds: boolean
}
