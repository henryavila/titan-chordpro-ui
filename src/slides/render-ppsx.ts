import { EXPORT_MIME } from '../core/exported-file'
import { buildPpsxFilename } from '../core/filenames'
import { parse } from '../core/parse'
import type { TitanChordproDocument } from '../core/types'
import { DEFAULT_COVER_JPEG, DEFAULT_SLIDES_JPEG } from './default-image'
import type { SlidePlan } from './layout'
import { planExport, type SljaFile, type SljaOptions } from './render-slja'
import { zip, type ZipMember } from './zip'

export type PpsxFile = SljaFile
export type PpsxOptions = SljaOptions

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
const NS_PR = 'http://schemas.openxmlformats.org/package/2006/relationships'
const NS_CP = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'
const NS_DC = 'http://purl.org/dc/elements/1.1/'
const NS_DCTERMS = 'http://purl.org/dc/terms/'
const NS_DCMI = 'http://purl.org/dc/dcmitype/'
const NS_XSI = 'http://www.w3.org/2001/XMLSchema-instance'
const NS_EP = 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'
const NS_VT = 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'

const REL_OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const REL_PACK = 'http://schemas.openxmlformats.org/package/2006/relationships'

/** 16:9 — 10" × 5.625", same frame LouvorJA projects into. */
const CX = 9144000
const CY = 5143500
const LETTER = 'FFFFFF'
const AUX = 'EFB400'

const utf8 = new TextEncoder()

export async function exportPpsx(source: string, opts: PpsxOptions = {}): Promise<PpsxFile> {
  const view = parse(source)
  const title = (opts.title ?? view.meta.title ?? 'Sem título').trim() || 'Sem título'
  const bytes = await renderPpsx(view, { ...opts, title })
  return { bytes, filename: buildPpsxFilename(title), mime: EXPORT_MIME.ppsx, title }
}

export async function renderPpsx(view: TitanChordproDocument, opts: PpsxOptions = {}): Promise<Uint8Array> {
  const { title, slides } = planExport(view, opts)
  return buildPpsx({
    title,
    titleAux: opts.titleAux ?? '',
    slides,
    cover: opts.coverImage ?? DEFAULT_COVER_JPEG,
    lyricBg: opts.slidesImage ?? DEFAULT_SLIDES_JPEG,
  })
}

async function buildPpsx(input: {
  title: string
  titleAux: string
  slides: readonly SlidePlan[]
  cover: Uint8Array
  lyricBg: Uint8Array
}): Promise<Uint8Array> {
  const coverKind = imageKind(input.cover)
  const lyricKind = imageKind(input.lyricBg)
  const coverName = `ppt/media/cover.${coverKind.ext}`
  const lyricName = `ppt/media/slides.${lyricKind.ext}`
  const n = input.slides.length + 1

  const members: ZipMember[] = [
    { name: '[Content_Types].xml', data: xmlBytes(contentTypes(n, coverKind, lyricKind)) },
    { name: '_rels/.rels', data: xmlBytes(rootRels()) },
    { name: 'docProps/core.xml', data: xmlBytes(coreXml(input.title)) },
    { name: 'docProps/app.xml', data: xmlBytes(appXml(n)) },
    { name: 'ppt/presentation.xml', data: xmlBytes(presentationXml(n)) },
    { name: 'ppt/_rels/presentation.xml.rels', data: xmlBytes(presentationRels(n)) },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: xmlBytes(slideMasterXml()) },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: xmlBytes(slideMasterRels()) },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: xmlBytes(slideLayoutXml()) },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: xmlBytes(slideLayoutRels()) },
    { name: 'ppt/theme/theme1.xml', data: xmlBytes(themeXml()) },
    { name: coverName, data: input.cover },
    { name: lyricName, data: input.lyricBg },
  ]

  members.push({
    name: 'ppt/slides/slide1.xml',
    data: xmlBytes(coverSlideXml(input.title, input.titleAux)),
  })
  members.push({
    name: 'ppt/slides/_rels/slide1.xml.rels',
    data: xmlBytes(slideRels(`../media/cover.${coverKind.ext}`)),
  })

  input.slides.forEach((slide, i) => {
    const index = i + 2
    members.push({
      name: `ppt/slides/slide${index}.xml`,
      data: xmlBytes(lyricSlideXml(slide)),
    })
    members.push({
      name: `ppt/slides/_rels/slide${index}.xml.rels`,
      data: xmlBytes(slideRels(`../media/slides.${lyricKind.ext}`)),
    })
  })

  return zip(members)
}

function imageKind(bytes: Uint8Array): { ext: 'png' | 'jpg'; contentType: string } {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: 'png', contentType: 'image/png' }
  }
  return { ext: 'jpg', contentType: 'image/jpeg' }
}

function xmlBytes(xml: string): Uint8Array {
  return utf8.encode(xml)
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Projector paint only — planner still sees source casing for phrase splits. */
function stageCaps(text: string): string {
  return text.toLocaleUpperCase('pt-BR')
}

function contentTypes(
  n: number,
  cover: { ext: string; contentType: string },
  lyric: { ext: string; contentType: string },
): string {
  const slides = Array.from({ length: n }, (_, i) => {
    const k = i + 1
    return `<Override PartName="/ppt/slides/slide${k}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  }).join('')
  const extras = new Set([
    `<Default Extension="${cover.ext}" ContentType="${cover.contentType}"/>`,
    `<Default Extension="${lyric.ext}" ContentType="${lyric.contentType}"/>`,
  ])
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${NS_CT}">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${[...extras].join('\n')}
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slides}
</Types>`
}

function rootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PR}">
<Relationship Id="rId1" Type="${REL_OFFICE}/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="${REL_PACK}/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="${REL_OFFICE}/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function coreXml(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="${NS_CP}" xmlns:dc="${NS_DC}" xmlns:dcterms="${NS_DCTERMS}" xmlns:dcmitype="${NS_DCMI}" xmlns:xsi="${NS_XSI}">
<dc:title>${esc(title)}</dc:title>
<dc:creator>TitanChordpro</dc:creator>
<cp:lastModifiedBy>TitanChordpro</cp:lastModifiedBy>
</cp:coreProperties>`
}

function appXml(slides: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS_EP}" xmlns:vt="${NS_VT}">
<Application>TitanChordpro</Application>
<Slides>${slides}</Slides>
</Properties>`
}

function presentationXml(n: number): string {
  const ids = Array.from({ length: n }, (_, i) => {
    const k = i + 1
    return `<p:sldId id="${256 + i}" r:id="rId${k + 1}"/>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${ids}</p:sldIdLst>
<p:sldSz cx="${CX}" cy="${CY}"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`
}

function presentationRels(n: number): string {
  const slides = Array.from({ length: n }, (_, i) => {
    const k = i + 1
    return `<Relationship Id="rId${k + 1}" Type="${REL_OFFICE}/slide" Target="slides/slide${k}.xml"/>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PR}">
<Relationship Id="rId1" Type="${REL_OFFICE}/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slides}
</Relationships>`
}

function slideMasterRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PR}">
<Relationship Id="rId1" Type="${REL_OFFICE}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="${REL_OFFICE}/theme" Target="../theme/theme1.xml"/>
</Relationships>`
}

function slideLayoutRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PR}">
<Relationship Id="rId1" Type="${REL_OFFICE}/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`
}

function slideRels(imageTarget: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PR}">
<Relationship Id="rId1" Type="${REL_OFFICE}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="${REL_OFFICE}/image" Target="${imageTarget}"/>
</Relationships>`
}

function nvGrp(): string {
  return `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${CX}" cy="${CY}"/><a:chOff x="0" y="0"/><a:chExt cx="${CX}" cy="${CY}"/></a:xfrm></p:grpSpPr>`
}

function picture(id: number, name: string): string {
  return `<p:pic>
<p:nvPicPr>
<p:cNvPr id="${id}" name="${name}"/>
<p:cNvPicPr><a:picLocks noChangeAspect="1" noSelect="1"/></p:cNvPicPr>
<p:nvPr/>
</p:nvPicPr>
<p:blipFill>
<a:blip r:embed="rId2"/>
<a:stretch><a:fillRect/></a:stretch>
</p:blipFill>
<p:spPr>
<a:xfrm><a:off x="0" y="0"/><a:ext cx="${CX}" cy="${CY}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
</p:spPr>
</p:pic>`
}

function overlay(id: number, alpha: number): string {
  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${id}" name="Veil"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="0" y="0"/><a:ext cx="${CX}" cy="${CY}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="000000"><a:alpha val="${alpha}"/></a:srgbClr></a:solidFill>
<a:ln><a:noFill/></a:ln>
</p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
</p:sp>`
}

function shadow(): string {
  return `<a:effectLst>
<a:outerShdw blurRad="381000" dist="12700" dir="2700000" algn="ctr" rotWithShape="0">
<a:srgbClr val="000000"><a:alpha val="85000"/></a:srgbClr>
</a:outerShdw>
</a:effectLst>`
}

function textShape(
  id: number,
  name: string,
  lines: readonly { text: string; size: number; color: string; bold: boolean }[],
  box: { x: number; y: number; w: number; h: number },
): string {
  const paras = lines
    .map((line, i) => {
      const spc = i < lines.length - 1 ? '<a:spcAft><a:spcPts val="1200"/></a:spcAft>' : ''
      return `<a:p>
<a:pPr algn="ctr">${spc}</a:pPr>
<a:r>
<a:rPr lang="pt-BR" sz="${line.size * 100}" b="${line.bold ? 1 : 0}" dirty="0">
<a:solidFill><a:srgbClr val="${line.color}"/></a:solidFill>
<a:latin typeface="Arial"/>
<a:ea typeface="Arial"/>
<a:cs typeface="Arial"/>
${shadow()}
</a:rPr>
<a:t>${esc(line.text)}</a:t>
</a:r>
</a:p>`
    })
    .join('')
  return `<p:sp>
<p:nvSpPr>
<p:cNvPr id="${id}" name="${name}"/>
<p:cNvSpPr txBox="1"/>
<p:nvPr/>
</p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.w}" cy="${box.h}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:noFill/>
</p:spPr>
<p:txBody>
<a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr">
<a:noAutofit/>
</a:bodyPr>
<a:lstStyle/>
${paras}
</p:txBody>
</p:sp>`
}

function slideXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">
<p:cSld>
<p:spTree>
${nvGrp()}
${body}
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`
}

function coverSlideXml(title: string, titleAux: string): string {
  const lines = [{ text: stageCaps(title), size: 52, color: LETTER, bold: true }]
  if (titleAux.trim()) lines.push({ text: stageCaps(titleAux.trim()), size: 22, color: AUX, bold: false })
  return slideXml(
    [
      picture(2, 'Capa'),
      overlay(3, 38000),
      textShape(4, 'Título', lines, { x: 457200, y: 1005840, w: 8229600, h: 2400300 }),
    ].join('\n'),
  )
}

function lyricSlideXml(slide: SlidePlan): string {
  const lines = slide.lines.map((text) => ({ text: stageCaps(text), size: 36, color: LETTER, bold: true }))
  if (slide.auxText) lines.push({ text: stageCaps(slide.auxText), size: 16, color: AUX, bold: false })
  return slideXml(
    [
      picture(2, 'Fundo'),
      textShape(3, 'Letra', lines, { x: 457200, y: 914400, w: 8229600, h: 3314700 }),
    ].join('\n'),
  )
}

function slideMasterXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
${nvGrp()}
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles>
<p:titleStyle>${lvl(0, 4400)}</p:titleStyle>
<p:bodyStyle>${lvl(0, 3200)}${lvl(1, 2800)}</p:bodyStyle>
<p:otherStyle>${lvl(0, 1800)}</p:otherStyle>
</p:txStyles>
</p:sldMaster>`
}

function lvl(n: number, sz: number): string {
  return `<a:lvl${n}pPr marL="0" indent="0" algn="ctr">
<a:defRPr sz="${sz}">
<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
<a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/>
</a:defRPr>
</a:lvl${n}pPr>`
}

function slideLayoutXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="blank" preserve="1">
<p:cSld name="Em branco">
<p:spTree>
${nvGrp()}
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`
}

function themeXml(): string {
  const solid = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'
  const ln = (w: number) =>
    `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr">${solid}<a:prstDash val="solid"/></a:ln>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="${NS_A}" name="TitanChordpro">
<a:themeElements>
<a:clrScheme name="Titan">
<a:dk1><a:srgbClr val="000000"/></a:dk1>
<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="1F4E79"/></a:dk2>
<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
<a:accent1><a:srgbClr val="EFB400"/></a:accent1>
<a:accent2><a:srgbClr val="C00000"/></a:accent2>
<a:accent3><a:srgbClr val="548235"/></a:accent3>
<a:accent4><a:srgbClr val="833C0C"/></a:accent4>
<a:accent5><a:srgbClr val="2F5597"/></a:accent5>
<a:accent6><a:srgbClr val="7030A0"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink>
<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Titan">
<a:majorFont><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:majorFont>
<a:minorFont><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Titan">
<a:fillStyleLst>${solid}${solid}${solid}</a:fillStyleLst>
<a:lnStyleLst>${ln(12700)}${ln(25400)}${ln(38100)}</a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst>${solid}${solid}${solid}</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`
}
