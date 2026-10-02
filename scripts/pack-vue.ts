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
import type { TitanChordproProps } from './public'

export type {
  TitanChordproEmits,
  TitanChordproProps,
  ImageChoice,
  ModesProp,
  TitanChordproCapabilities,
  WriteMode,
} from './public'
export type { AccentId, AccentProp, ChartStore, ThemeId } from '@henryavila/titan-chordpro-ui'

declare const TitanChordpro: DefineComponent<TitanChordproProps>
export { TitanChordpro }
export default TitanChordpro

export function fillAudioCache(url: string): Promise<void>
export function matchAudio(url: string): Promise<Blob | null>
export function putAudio(url: string, blob: Blob): Promise<void>
`,
)

copyFileSync(join(root, 'node_modules/@coderline/alphatab/dist/font/Bravura-OFL.txt'), join(root, 'dist/vue/Bravura-OFL.txt'))
copyFileSync(join(root, 'src/vue/fonts/OFL-Sora.txt'), join(root, 'dist/vue/OFL-Sora.txt'))
copyFileSync(join(root, 'src/vue/fonts/OFL-Space-Mono.txt'), join(root, 'dist/vue/OFL-Space-Mono.txt'))
