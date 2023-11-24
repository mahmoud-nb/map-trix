const getCurrentPosition = ({ enableHighAccuracy = true, timeout = 5000, maximumAge = 0 } = {}) => {

  const options = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  }

  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  )
}

export default {
  getCurrentPosition,
}