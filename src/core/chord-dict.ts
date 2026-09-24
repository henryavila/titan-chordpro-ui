/**
 * Package chord dictionary: one lowest-open voicing per name.
 * Guitar is EADGBE (6). Ukulele is GCEA (4). No baritone.
 * Lookups use Object.hasOwn so prototype keys stay a miss.
 */

export type DictInstrument = 'guitar' | 'ukulele' | 'piano'
export type FretSlot = number | 'x'

export type DictVoicing = {
  instrument: DictInstrument
  baseFret?: number
  frets?: FretSlot[]
  fingers?: FretSlot[]
  keys?: number[]
}

/** Canonical quality → pitch-class intervals from the tonic. */
const QUALITY_INTERVALS: Record<string, number[]> = Object.create(null)
QUALITY_INTERVALS.major = [0, 4, 7]
QUALITY_INTERVALS.m = [0, 3, 7]
QUALITY_INTERVALS['5'] = [0, 7]
QUALITY_INTERVALS['6'] = [0, 4, 7, 9]
QUALITY_INTERVALS['6add9'] = [0, 4, 7, 9, 14]
QUALITY_INTERVALS['7'] = [0, 4, 7, 10]
QUALITY_INTERVALS['9'] = [0, 4, 7, 10, 14]
QUALITY_INTERVALS.add9 = [0, 4, 7, 14]
QUALITY_INTERVALS.maj7 = [0, 4, 7, 11]
QUALITY_INTERVALS.maj9 = [0, 4, 7, 11, 14]
QUALITY_INTERVALS.m6 = [0, 3, 7, 9]
QUALITY_INTERVALS.m7 = [0, 3, 7, 10]
QUALITY_INTERVALS.m9 = [0, 3, 7, 10, 14]
QUALITY_INTERVALS.m11 = [0, 3, 7, 10, 14, 17]
QUALITY_INTERVALS.sus2 = [0, 2, 7]
QUALITY_INTERVALS.sus4 = [0, 5, 7]
QUALITY_INTERVALS['7sus4'] = [0, 5, 7, 10]
QUALITY_INTERVALS.dim = [0, 3, 6]

/** 12 roots, C=0 … B=11. `x` mute; digits are fret numbers from the nut. */
const GUITAR: Record<string, string[]> = Object.create(null)
GUITAR.major = ['x32010', 'x43121', 'xx0232', 'xx1343', '022100', '133211', '244322', '320003', '431114', 'x02220', 'x13331', 'x24442']
GUITAR.m = ['x35543', 'x46654', 'xx0231', 'xx1342', '022000', '133111', '244222', '355333', '466444', 'x02210', 'x13321', 'x24432']
GUITAR['7'] = ['x32310', 'x43421', 'xx0212', 'xx1323', '020100', '131211', '242322', '320001', '431112', 'x02020', 'x13131', 'x21202']
GUITAR.maj7 = ['x32000', 'x43111', 'xx0222', 'xx1333', '021100', '132211', '243322', '320002', '431113', 'x02120', 'x13231', 'x24342']
GUITAR.m7 = ['x35343', 'x46454', 'xx0211', 'xx1322', '020000', '131111', '242222', '353333', '464444', 'x02010', 'x13121', 'x20202']
GUITAR.sus2 = ['x30013', 'x41124', 'xx0230', 'xx1341', '024400', '133013', '244124', '300233', '411344', 'x02200', 'x13311', 'x24422']
GUITAR.sus4 = ['x33011', 'x44122', 'xx0233', 'xx1344', '022200', '133311', '244422', '330013', '441124', 'x02230', 'x13341', 'x24452']
GUITAR['7sus4'] = ['x33311', 'x44422', 'xx0213', 'xx1324', '020200', '131311', '242422', '330011', '441122', 'x02030', 'x13141', 'x24252']
GUITAR.add9 = ['x32030', 'x43141', 'x54252', 'x65363', '024100', '133213', '244324', '320203', '431314', 'x02420', 'x13531', 'x24642']
GUITAR['5'] = ['x355xx', 'x466xx', 'xx023x', 'xx134x', '022xxx', '133xxx', '244xxx', '355xxx', '466xxx', 'x022xx', 'x133xx', 'x244xx']
GUITAR['6'] = ['x32210', 'x43321', 'xx0202', 'xx1313', '022120', '133231', '244342', '320000', '431111', 'x02222', 'x13333', 'x24444']
GUITAR['6add9'] = ['x32230', 'x43341', '000202', '111011', '022122', '133233', '244344', '320200', '431311', '022222', 'x10011', 'x21122']
GUITAR['9'] = ['x32330', 'x43441', 'xx0210', 'xx1321', '020102', '131213', '242324', '320201', '431312', 'x02000', 'x13111', 'x21222']
GUITAR.maj9 = ['020010', '131121', 'xx0220', 'xx1331', '021102', '132213', '243324', '320202', '431313', 'x02100', 'x13211', 'x24322']
GUITAR.m6 = ['x0101x', '012120', 'xx0201', 'xx1312', '022020', '133131', '244242', '355353', '466464', 'x02212', 'x13323', 'x24434']
GUITAR.m9 = ['x30343', 'x41454', 'x52565', 'x63676', '020002', '131113', '242224', '353335', '464446', 'x05500', 'x16611', 'x20222']
GUITAR.dim = ['x3454x', 'x4565x', 'xx0131', 'xx1242', '0120xx', '1231xx', '2342xx', '3453xx', '4564xx', 'x0121x', 'x1232x', 'x2343x']

const UKULELE: Record<string, string[]> = Object.create(null)
UKULELE.major = ['0003', '1114', '2220', '3331', '4442', '2010', '3121', '0232', '1343', '2100', '3211', '4322']
UKULELE.m = ['0333', '1444', '2210', '3321', '0432', '1543', '2120', '0231', '1342', '2000', '3111', '4222']
UKULELE['7'] = ['0001', '1112', '2223', '3334', '1202', '2313', '3424', '0212', '1323', '0100', '1211', '2322']
UKULELE.maj7 = ['0002', '1113', '2224', '3335', '1302', '2413', '3524', '0222', '1333', '1100', '2211', '3322']
UKULELE.m7 = ['0331', '1442', '2213', '3324', '0202', '1313', '2424', '0211', '1322', '0000', '1111', '2222']
UKULELE.sus2 = ['0233', '1344', '2200', '3311', '4422', '0013', '1124', '0230', '1341', '2402', '3513', '4624']
UKULELE.sus4 = ['0013', '1124', '2230', '3341', '4452', '3011', '4122', '0233', '1344', '2200', '3311', '4422']
UKULELE['7sus4'] = ['0011', '1122', '2233', '3344', '2202', '3313', '4424', '0213', '1324', '0200', '1311', '2422']
UKULELE.add9 = ['0203', '1314', '2420', '3531', '4642', '0010', '1121', '0252', '1363', '2102', '3213', '4324']
UKULELE['5'] = ['0033', '1144', '2255', 'x3x1', 'xx02', '5013', '6124', '0235', '13xx', '2400', '3511', '4622']
UKULELE['6'] = ['0000', '1111', '2222', '3333', '4444', '2213', '3324', '0202', '1313', '2424', '0211', '1322']
UKULELE['6add9'] = ['0200', '1311', '2422', '0011', '1122', '0210', '1321', '2202', '1011', '2122', '3233', '4344']
UKULELE['9'] = ['0201', '1312', '2423', '3534', '4645', '0310', '1421', '0570', '1021', '0102', '1213', '2324']
UKULELE.maj9 = ['0202', '1313', '2424', '3535', '1606', '0500', '1521', '0670', '0041', '1102', '2011', '3122']
UKULELE.m6 = ['0330', '1441', '2212', '3323', '0102', '1213', '2324', '0201', '1312', '2423', '0111', '1222']
UKULELE.m9 = ['3335', '1302', '5505', '6616', '0425', '1336', '1600', '0560', '1671', '0002', '1113', '2224']
UKULELE.dim = ['x323', '010x', '121x', 'x320', '0x01', '1x12', '2020', '01x1', '12x2', '23x3', 'x101', 'x212']

function decodeFrets(packed: string): FretSlot[] {
  const out: FretSlot[] = []
  for (const ch of packed) {
    if (ch === 'x') out.push('x')
    else out.push(Number(ch))
  }
  return out
}

export function pianoKeysOf(quality: string): number[] | null {
  if (!Object.hasOwn(QUALITY_INTERVALS, quality)) return null
  const keys = QUALITY_INTERVALS[quality]
  return keys ? [...keys] : null
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

/** Tones that name the quality. A power chord's only characteristic tone is the fifth; other qualities drop the root and the fifth. */
function characteristicIntervals(quality: string, intervals: readonly number[]): number[] {
  if (quality === '5') return [7]
  const seen = new Set<number>()
  const out: number[] = []
  for (const iv of intervals) {
    const tone = mod12(iv)
    if (tone === 0 || tone === 7 || seen.has(tone)) continue
    seen.add(tone)
    out.push(tone)
  }
  return out
}

function characteristicCount(sounding: Set<number>, rootPc: number, tones: readonly number[]): number {
  const heard = new Set<number>()
  for (const pc of sounding) heard.add(mod12(pc - rootPc))
  let count = 0
  for (const tone of tones) {
    if (heard.has(tone)) count++
  }
  return count
}

type PianoReading = {
  pcs: number[]
  intervals: number[]
  absSet: Set<number>
  relSet: Set<number>
  absScore: number
  relScore: number
}

function scorePianoReadings(keys: readonly number[], rootPc: number, quality: string): PianoReading {
  const pcs = keys.map((k) => mod12(k))
  const intervals = pianoKeysOf(quality) ?? [0]
  const expected = intervals.map((iv) => mod12(rootPc + iv))
  const absSet = new Set(pcs)
  const relSet = new Set(pcs.map((k) => mod12(rootPc + k)))
  let absScore = 0
  let relScore = 0
  for (const pc of expected) {
    if (absSet.has(pc)) absScore++
    if (relSet.has(pc)) relScore++
  }
  return { pcs, intervals, absSet, relSet, absScore, relScore }
}

/**
 * Sounding pitch classes of the one piano reading, in key order.
 * A key above 17 (the largest QUALITY_INTERVALS tone) or below 0 is MIDI:
 * return mod 12 and skip the reading. 14 and 17 beside 0–11 stay on the
 * heuristic. Absolute: the stored classes. Relative: `(root + key) % 12`.
 * Draw stores those classes as intervals from the root.
 */
export function pianoSoundingPitchClasses(
  keys: readonly number[],
  rootPc: number,
  quality: string,
  bassPc: number | null = null,
): number[] {
  if (keys.some((k) => k > 17 || k < 0)) return keys.map((k) => mod12(k))
  const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
  const absolute = () => [...pcs]
  const relative = () => pcs.map((k) => mod12(rootPc + k))
  if (absScore > relScore) return absolute()
  if (relScore > absScore) return relative()
  // Score tie: a slash bass that sounds in only one reading picks that reading.
  if (bassPc != null) {
    const bass = mod12(bassPc)
    const inAbs = absSet.has(bass)
    const inRel = relSet.has(bass)
    if (inAbs !== inRel) return inAbs ? absolute() : relative()
  }
  const tones = characteristicIntervals(quality, intervals)
  if (characteristicCount(relSet, rootPc, tones) > characteristicCount(absSet, rootPc, tones)) return relative()
  return absolute()
}

/** File `{define}` keys may be absolute pitch classes; dictionary keys are intervals from the tonic. */
export function pianoKeysToRelative(
  keys: number[],
  rootPc: number,
  quality: string,
  bassPc: number | null = null,
): number[] {
  return pianoSoundingPitchClasses(keys, rootPc, quality, bassPc).map((pc) => mod12(pc - rootPc))
}

export function lookupDict(
  instrument: DictInstrument,
  rootPc: number,
  quality: string,
): DictVoicing | null {
  const pc = ((rootPc % 12) + 12) % 12
  if (instrument === 'piano') {
    const keys = pianoKeysOf(quality)
    if (!keys) return null
    return { instrument: 'piano', keys }
  }
  const table = instrument === 'guitar' ? GUITAR : UKULELE
  if (!Object.hasOwn(table, quality)) return null
  const packed = table[quality]?.[pc]
  if (!packed) return null
  const frets = decodeFrets(packed)
  const want = instrument === 'guitar' ? 6 : 4
  if (frets.length !== want) return null
  return { instrument, baseFret: 1, frets }
}
