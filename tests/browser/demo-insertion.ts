// Mount the real demo host: its upload callback and IndexedDB are not mocked.
import { createApp } from 'vue'
import CifraDemo from '../../demo/CifraDemo.vue'
import '../../src/vue/cpv.css'
createApp(CifraDemo, { surface: 'standalone', lista: false }).mount('#app')
