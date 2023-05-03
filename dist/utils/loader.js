var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const defaultOptions = {
    language: 'fr',
    version: 'weekly',
};
export function _loadGoogleMapsScript(API_KEY = null, options = defaultOptions, callback = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const googleLib = 'https://maps.googleapis.com/maps/api/js';
        API_KEY = API_KEY !== null && API_KEY !== void 0 ? API_KEY : localStorage.getItem('g_api_key');
        let googleLibPath = `${googleLib}?key=${API_KEY}&v=3.exp&signed_in=true`;
        if (options.language)
            googleLibPath += `&language=${options.language}`;
        if (options.version)
            googleLibPath += `&version=${options.version}`;
        yield _loadScript(googleLibPath);
        if (typeof callback === 'function')
            callback();
    });
}
export function _loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.defer = true;
        document.body.appendChild(script);
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
