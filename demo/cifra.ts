import type { Surface } from './host/recipe'

const el = document.getElementById('app')
if (!el) throw new Error('demo: #app missing')

const surface: Surface = el.dataset.surface === 'site' ? 'site' : 'standalone'
const lista = el.dataset.lista === '1'

const [{ createApp }, { default: CifraDemo }] = await Promise.all([
  import('vue'),
  import('./CifraDemo.vue'),
])
createApp(CifraDemo, { surface, lista }).mount(el)
