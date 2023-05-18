const defaultOptions:any = {
    language: 'fr',
    version: 'weekly',
    libraries: [],
}


export async function _loadGoogleMapsScript(API_KEY: string = null, options = defaultOptions, callback:any = null ) {

    API_KEY = API_KEY || localStorage.getItem('g_api_key')

    console.log('OPTIONS', options, '#', API_KEY, '#')

    let googleLibPath = 'https://maps.googleapis.com/maps/api/js'
    
    // signed_in=true

    if(options.language) googleLibPath += `?language=${options.language}`

    if(API_KEY) googleLibPath += `&key=${API_KEY}`
    
    if(options.version) googleLibPath += `&v=${options.version}`

    if ((options?.libraries?.length || 0) > 0) googleLibPath += `&libraries=${options.libraries.join(',')}`
    
    if(options.callback) googleLibPath += `&callback=${options.callback}`

    await _loadScript(googleLibPath)
    if (typeof options.callback === 'function') options.callback()
}

export function _loadScript(src: string) {
    console.log('src', src)
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