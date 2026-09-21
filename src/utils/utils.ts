type GetCurrentPositionOptions = {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const getCurrentPosition = (
  { enableHighAccuracy = true, timeout = 5000, maximumAge = 0 }: GetCurrentPositionOptions = {},
): Promise<GeolocationPosition> => {

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this environment.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })
  })
}

export default {
  getCurrentPosition,
}
