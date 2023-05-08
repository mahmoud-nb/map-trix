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
    libraries: [],
};
export function _loadGoogleMapsScript(API_KEY = null, options = defaultOptions, callback = null) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        API_KEY = API_KEY !== null && API_KEY !== void 0 ? API_KEY : localStorage.getItem('g_api_key');
        let googleLibPath = 'https://maps.googleapis.com/maps/api/js';
        // signed_in=true
        if (options.language)
            googleLibPath += `?language=${options.language}`;
        if (API_KEY)
            googleLibPath += `&key=${API_KEY}`;
        if (options.version)
            googleLibPath += `&v=${options.version}`;
        if ((((_a = options === null || options === void 0 ? void 0 : options.libraries) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0) {
            googleLibPath += `&libraries=${options.libraries.join(',')}`;
        }
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
