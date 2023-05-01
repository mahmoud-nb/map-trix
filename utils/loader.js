const defaultOptions = {
    language: 'fr',
    version: "weekly",
}

export async function _loadGoogleMapsScript(API_KEY = null, options = defaultOptions, callback = null) {
    
    const googleLib = 'https://maps.googleapis.com/maps/api/js'
    API_KEY = API_KEY ?? localStorage.getItem('g_api_key')

    let googleLibPath = `${googleLib}?key=${API_KEY}&v=3.exp&signed_in=true` 

    if(options.language) googleLibPath += `&language=${options.language}`

    if(options.version) googleLibPath += `&version=${options.version}`
     

    await _loadScript(googleLibPath)
    if (callback) callback()
}

export function _loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = src
        script.defer = true
        document.body.appendChild(script)

        // Resolve the promise once the script is loaded
        script.addEventListener('load', () => {
            resolve(script)
        })

        // Catch any errors while loading the script
        script.addEventListener('error', () => {
            reject(new Error(`${src} failed to load.`))
        })
    })
}