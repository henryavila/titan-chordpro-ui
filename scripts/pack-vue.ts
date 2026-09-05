import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vueJs = join(root, 'dist/vue/index.js')
const cssImport = `import './style.css'\n`

const js = readFileSync(vueJs, 'utf8')
if (!js.includes("import './style.css'") && !js.includes('import "./style.css"')) {
  writeFileSync(vueJs, cssImport + js)
}

copyFileSync(join(root, 'src/vue/public.ts'), join(root, 'dist/vue/public.d.ts'))
writeFileSync(
  join(root, 'dist/vue/index.d.ts'),
  `import type { DefineComponent } from 'vue'
import type { ChordproViewerProps } from './public'

export type {
  ChordproViewerEmits,
  ChordproViewerProps,
  ImageChoice,
  ModesProp,
  ViewerCapabilities,
  WriteMode,
} from './public'
export type { AccentId, AccentProp, ChartStore, ThemeId } from 'titan-chordpro-ui'

declare const ChordproViewer: DefineComponent<ChordproViewerProps>
export { ChordproViewer }
export default ChordproViewer
`,
)
