/**
 * IPAexGothic Font Loader
 *
 * Dynamically loads the IPAexGothic Japanese font for jsPDF.
 * Prioritizes local file, falls back to CDN if unavailable.
 *
 * IPAexGothic is distributed under the IPA Font License Agreement v1.0
 * https://moji.or.jp/ipafont/license/
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

let fontCache: string | null = null
let loadPromise: Promise<string> | null = null

/**
 * Local font path (relative to project root)
 */
const LOCAL_FONT_PATH = join(process.cwd(), 'public', 'fonts', 'ipaexg.ttf')

/**
 * Fallback CDN URLs (only used if local file is unavailable)
 */
const FALLBACK_URLS = [
  // Official IPA mirror
  'https://moji.or.jp/wp-content/ipafont/IPAexfont/ipaexg00401.zip',
]

/**
 * Convert Buffer/ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: Buffer | ArrayBuffer): string {
  if (buffer instanceof Buffer) {
    return buffer.toString('base64')
  }
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

/**
 * Validate TTF file format
 */
function isValidTTF(buffer: Buffer | ArrayBuffer): boolean {
  const bytes = buffer instanceof Buffer ? buffer : new Uint8Array(buffer)
  if (bytes.length < 4) return false

  // TrueType signature
  const isTrueType =
    bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00

  // OpenType with TrueType outlines
  const isOpenType =
    bytes[0] === 0x74 && bytes[1] === 0x72 && bytes[2] === 0x75 && bytes[3] === 0x65

  return isTrueType || isOpenType
}

/**
 * Load font from local filesystem
 */
async function loadFromLocal(): Promise<string | null> {
  try {
    console.log(`Loading Japanese font from local: ${LOCAL_FONT_PATH}`)
    const buffer = await readFile(LOCAL_FONT_PATH)

    if (!isValidTTF(buffer)) {
      console.warn('Local font file is not a valid TTF')
      return null
    }

    console.log('Japanese font loaded from local file')
    return bufferToBase64(buffer)
  } catch (error) {
    console.warn('Failed to load font from local file:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Load font from CDN (fallback)
 */
async function loadFromCDN(): Promise<string | null> {
  for (const url of FALLBACK_URLS) {
    try {
      console.log(`Loading Japanese font from CDN: ${url}`)
      const response = await fetch(url, { cache: 'force-cache' })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()

      // Handle ZIP file from official source
      if (url.endsWith('.zip')) {
        console.warn('CDN fallback requires ZIP extraction - not supported in runtime')
        continue
      }

      if (!isValidTTF(arrayBuffer)) {
        throw new Error('Invalid font file format')
      }

      console.log('Japanese font loaded from CDN')
      return bufferToBase64(arrayBuffer)
    } catch (error) {
      console.warn(`Failed to load font from ${url}:`, error instanceof Error ? error.message : error)
      continue
    }
  }
  return null
}

/**
 * Load IPAexGothic font
 * Returns the font as a Base64 encoded string
 *
 * Loading priority:
 * 1. Memory cache (instant)
 * 2. Local file (public/fonts/ipaexg.ttf)
 * 3. CDN fallback (if local unavailable)
 */
export async function loadIPAexGothicFont(): Promise<string> {
  // Return cached font if available
  if (fontCache) {
    return fontCache
  }

  // Return existing promise if loading is in progress
  if (loadPromise) {
    return loadPromise
  }

  // Start loading
  loadPromise = (async () => {
    // Try local file first
    const localFont = await loadFromLocal()
    if (localFont) {
      fontCache = localFont
      return fontCache
    }

    // Fall back to CDN
    const cdnFont = await loadFromCDN()
    if (cdnFont) {
      fontCache = cdnFont
      return fontCache
    }

    // All sources failed
    loadPromise = null
    throw new Error(
      'Failed to load IPAexGothic font. Please ensure public/fonts/ipaexg.ttf exists.'
    )
  })()

  return loadPromise
}

/**
 * Check if font is already cached
 */
export function isFontCached(): boolean {
  return fontCache !== null
}

/**
 * Clear font cache (useful for testing)
 */
export function clearFontCache(): void {
  fontCache = null
  loadPromise = null
}
