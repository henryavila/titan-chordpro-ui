# Preview from titan-chordpro-gen

The demo is a host. When `TITAN_PREVIEW_DIR` is set, Vite serves
`GET /__titan_preview` (plugin in `demo/preview-plugin.ts`) and `App.vue`
**merges** those files into the bundled fixtures (does not wipe the setlist).
Query `?song=<id>` selects one.

Extensions: `.cho`, `.chordpro`, `.chopro`, `.onsong`, `.txt`, `.pro`, `.crd`.

Gen CLI: `titan-chordpro-gen preview`. Do not merge the generator into this
package; do not treat this demo as the Titan app.
