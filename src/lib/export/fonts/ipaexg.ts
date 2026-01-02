/**
 * IPAexGothic Font Loader
 *
 * Dynamically loads the IPAexGothic Japanese font for jsPDF.
 * The font is fetched from a CDN and cached in memory.
 *
 * IPAexGothic is distributed under the IPA Font License Agreement v1.0
 * https://moji.or.jp/ipafont/license/
 */

let fontCache: string | null = null
let loadPromise: Promise<string> | null = null

/**
 * Font source URLs (with fallbacks)
 */
const FONT_URLS = [
  // Primary: jsDelivr CDN (serving from GitHub)
  'https://cdn.jsdelivr.net/gh/nicothin/NTH-start-project@master/src/fonts/ipaexg.ttf',
  // Fallback: Raw GitHub
  'https://raw.githubusercontent.com/nicothin/NTH-start-project/master/src/fonts/ipaexg.ttf',
]

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // Process in chunks to avoid stack overflow for large fonts
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

/**
 * Load IPAexGothic font
 * Returns the font as a Base64 encoded string
 *
 * Features:
 * - Fetches from CDN on first call
 * - Caches in memory for subsequent calls
 * - Multiple fallback URLs for reliability
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
    const errors: Error[] = []

    for (const url of FONT_URLS) {
      try {
        console.log(`Loading Japanese font from: ${url}`)
        const response = await fetch(url, {
          // Cache the font for 7 days
          cache: 'force-cache',
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        // Validate it looks like a TTF file (starts with specific bytes)
        const header = new Uint8Array(arrayBuffer.slice(0, 4))
        const isTTF =
          // TrueType
          (header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00) ||
          // OpenType with TrueType outlines
          (header[0] === 0x74 && header[1] === 0x72 && header[2] === 0x75 && header[3] === 0x65)

        if (!isTTF) {
          throw new Error('Invalid font file format')
        }

        fontCache = arrayBufferToBase64(arrayBuffer)
        console.log('Japanese font loaded successfully')
        return fontCache
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        errors.push(err)
        console.warn(`Failed to load font from ${url}:`, err.message)
        continue
      }
    }

    // All URLs failed
    throw new Error(
      `Failed to load IPAexGothic font from all sources. Errors: ${errors.map((e) => e.message).join('; ')}`
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
