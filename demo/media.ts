import { MEDIA_DEMO_PAGE_TITLE } from './media-host'

document.title = MEDIA_DEMO_PAGE_TITLE

const el = document.getElementById('app')
if (!el) throw new Error('demo: #app missing')

const [{ createApp }, { default: MediaDemo }] = await Promise.all([
  import('vue'),
  import('./MediaDemo.vue'),
])
createApp(MediaDemo).mount(el)
