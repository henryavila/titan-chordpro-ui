import { createApp } from 'vue'
import CifraDemo from './CifraDemo.vue'
import type { Surface } from './host/recipe'

const el = document.getElementById('app')
if (!el) throw new Error('demo: #app missing')

const surface: Surface = el.dataset.surface === 'site' ? 'site' : 'standalone'
const lista = el.dataset.lista === '1'

createApp(CifraDemo, { surface, lista }).mount(el)
