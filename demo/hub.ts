import { hubRedirect } from './host/recipe'

const to = hubRedirect(location.search)
if (to) {
  location.replace(to)
} else {
  const [{ createApp }, { default: Hub }] = await Promise.all([
    import('vue'),
    import('./Hub.vue'),
  ])
  createApp(Hub).mount('#app')
}
