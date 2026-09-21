import { createMap, StoreLocator } from 'map-trix'

const stores = [
  { position: { lat: 48.8566, lng: 2.3522 }, popup: '<b>Paris center</b>', data: { name: 'Center' } },
  { position: { lat: 48.8738, lng: 2.2950 }, popup: '<b>Arc de Triomphe</b>', data: { name: 'Arc de Triomphe' } },
  { position: { lat: 48.8584, lng: 2.2945 }, popup: '<b>Eiffel Tower</b>', data: { name: 'Eiffel Tower' } },
  { position: { lat: 48.8606, lng: 2.3376 }, popup: '<b>Louvre</b>', data: { name: 'Louvre' } },
  { position: { lat: 48.8530, lng: 2.3499 }, popup: '<b>Notre-Dame</b>', data: { name: 'Notre-Dame' } },
]

const els = {
  host: document.getElementById('map-host'),
  status: document.getElementById('demo-status'),
  keyRow: document.getElementById('key-row'),
  keyInput: document.getElementById('key-input'),
  keyLabel: document.getElementById('key-label'),
}

let map = null
let locator = null
let provider = 'leaflet'
let clustered = false

const status = (msg) => { els.status.textContent = msg }
const needsKey = (p) => p === 'google' || p === 'mapbox'

async function build() {
  clustered = false
  if (map) {
    try { map.destroy() } catch { /* ignore */ }
    map = null
  }
  els.host.innerHTML = '<div id="map" class="map"></div>'

  if (needsKey(provider) && !els.keyInput.value.trim()) {
    const what = provider === 'google' ? 'a Google Maps API key' : 'a Mapbox access token'
    els.host.querySelector('#map').innerHTML =
      `<div class="map-placeholder">The <b>${provider}</b> provider needs ${what}.<br>Paste it above and click Apply.</div>`
    status(`Enter ${what} to preview ${provider}.`)
    return
  }

  status(`Loading ${provider}…`)
  try {
    const opts = { provider, container: '#map', center: { lat: 48.8566, lng: 2.3522 }, zoom: 12 }
    if (provider === 'google') opts.apiKey = els.keyInput.value.trim()
    if (provider === 'mapbox') opts.accessToken = els.keyInput.value.trim()

    map = await createMap(opts)
    locator = new StoreLocator(map, {
      locations: stores,
      onSelect: ({ location }) => status(`Selected: ${location.data.name}`),
    })
    status(`${provider} ready — ${stores.length} stores loaded.`)
  } catch (e) {
    status(`Failed to load ${provider}: ${e.message}`)
  }
}

document.querySelectorAll('[data-provider]').forEach((btn) => {
  btn.addEventListener('click', () => {
    provider = btn.dataset.provider
    document.querySelectorAll('[data-provider]').forEach((b) => b.classList.toggle('active', b === btn))
    els.keyRow.hidden = !needsKey(provider)
    els.keyLabel.textContent = provider === 'google' ? 'Google Maps API key' : 'Mapbox access token'
    els.keyInput.value = ''
    build()
  })
})

document.getElementById('key-apply').addEventListener('click', build)
document.getElementById('key-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') build() })

document.getElementById('act-nearest').addEventListener('click', () => {
  if (!map || !locator) return
  const [n] = locator.findNearest(map.getCenter(), 1)
  if (n) status(`Nearest to center: ${n.location.data.name} (${Math.round(n.distance)} m)`)
})

document.getElementById('act-route').addEventListener('click', async () => {
  if (!map) return
  status('Routing…')
  try {
    const r = await map.traceDirection(stores[2].position, stores[4].position, 'driving')
    status(`Route: ${(r.distance / 1000).toFixed(2)} km · ${Math.round(r.duration / 60)} min`)
  } catch (e) {
    status(`Routing failed: ${e.message}`)
  }
})

document.getElementById('act-cluster').addEventListener('click', async () => {
  if (!map) return
  try {
    if (clustered) {
      map.disableClustering()
      status('Clustering off.')
    } else {
      await map.enableClustering({ radius: 60 })
      status('Clustering on — zoom out to see markers merge.')
    }
    clustered = !clustered
  } catch (e) {
    status(`Clustering failed: ${e.message}`)
  }
})

document.getElementById('act-reset').addEventListener('click', build)

document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const code = btn.closest('.code')?.querySelector('code')?.textContent ?? ''
    try {
      await navigator.clipboard.writeText(code)
      const prev = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = prev }, 1200)
    } catch { /* ignore */ }
  })
})

build()
