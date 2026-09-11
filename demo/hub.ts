import { createApp } from 'vue'
import Hub from './Hub.vue'
import { hubRedirect } from './host/recipe'

const to = hubRedirect(location.search)
if (to) {
  location.replace(to)
} else {
  createApp(Hub).mount('#app')
}
