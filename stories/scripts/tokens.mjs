#!/usr/bin/env node
// Extracts a design system's tokens from its stylesheet into Design Tokens
// Community Group files, the input for Figma's variables (FB-20).
//
//   node scripts/tokens.mjs <config>           write the token files the config names
//   node scripts/tokens.mjs <config> --check   fail if a file is stale, a token has no ID,
//                                              an ID has no token, or LIQ-009 records a
//                                              different value than the stylesheet holds
//
// Only Node is needed. The storefront keeps an unchanged copy of this file, so
// everything specific to one repository is in its config, whose paths are
// relative to the config file.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTENSION = 'org.liquorify'
const ROOT_FONT_SIZE = 16
const PALETTE_HUES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]

// ---------------------------------------------------------------------------
// Reading stylesheets
// ---------------------------------------------------------------------------

// Blanks out comments but keeps their line breaks, so line numbers still match
// the file.
function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
}

/**
 * Every custom property declaration in a stylesheet, with the block it sits in.
 *
 * @param {string} css
 * @returns {Array<{ name: string, value: string, block: string, line: number }>}
 */
export function declarations(css) {
  const source = withoutComments(css)
  const found = []
  const selectors = []
  let start = 0

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character !== '{' && character !== '}' && character !== ';') continue

    const segment = source.slice(start, index)
    const text = segment.trim()
    if (character === '{') {
      selectors.push(text)
    } else if (text.startsWith('--')) {
      const colon = text.indexOf(':')
      const offset = start + segment.indexOf(text)
      found.push({
        name: text.slice(0, colon).trim(),
        value: text
          .slice(colon + 1)
          .trim()
          .replace(/\s+/g, ' '),
        block: blockOf(selectors),
        line: source.slice(0, offset).split('\n').length,
      })
    }
    if (character === '}') selectors.pop()
    start = index + 1
  }

  return found
}

function blockOf(selectors) {
  const innermost = selectors.at(-1) ?? ''
  if (innermost === ':root') return 'light'
  if (innermost === '.dark') return 'dark'
  if (innermost.startsWith('@theme')) return 'theme'
  return `other: ${selectors.join(' > ')}`
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const CSS_COLOR_4 = {
  oklabToLms: [
    [1, 0.3963377773761749, 0.2158037573099136],
    [1, -0.1055613458156586, -0.0638541728258133],
    [1, -0.0894841775298119, -1.2914855480194092],
  ],
  lmsToXyz: [
    [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
    [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
    [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
  ],
  xyzToLinearSrgb: [
    [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
    [-0.9692436362808796, 1.8759675015077202, 0.0415550574071756],
    [0.0556300796969936, -0.2039769588889765, 1.0569715142428786],
  ],
}

function multiply(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0))
}

function number(text, percentScale = 1) {
  return text.endsWith('%') ? (Number.parseFloat(text) / 100) * percentScale : Number(text)
}

function alphaOf(text) {
  return text === undefined ? 1 : number(text)
}

function round(value, places = 4) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * An sRGB colour, with how far the original fell outside sRGB before it was
 * clipped (0 when it fitted).
 */
function srgb(channels, alpha, clip = 0) {
  const clamped = channels.map((channel) => Math.min(1, Math.max(0, channel)))
  const hex = clamped.map((channel) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0'),
  )
  const alphaHex =
    alpha < 1
      ? Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')
      : ''
  return {
    colorSpace: 'srgb',
    components: clamped.map((channel) => round(channel)),
    alpha: round(alpha),
    hex: `#${hex.join('')}${alphaHex}`,
    clip: round(clip),
  }
}

function fromOklch(lightness, chroma, hue, alpha) {
  const radians = (hue * Math.PI) / 180
  const lab = [lightness, chroma * Math.cos(radians), chroma * Math.sin(radians)]
  const lms = multiply(CSS_COLOR_4.oklabToLms, lab).map((value) => value ** 3)
  const linear = multiply(CSS_COLOR_4.xyzToLinearSrgb, multiply(CSS_COLOR_4.lmsToXyz, lms))
  const encoded = linear.map((value) => {
    const magnitude = Math.abs(value)
    const gamma =
      magnitude <= 0.0031308 ? 12.92 * magnitude : 1.055 * magnitude ** (1 / 2.4) - 0.055
    return Math.sign(value) * gamma
  })
  const clip = Math.max(0, ...encoded.map((channel) => Math.max(channel - 1, -channel)))
  return srgb(encoded, alpha, clip)
}

/**
 * A literal colour (oklch, hex, rgb or a keyword) as sRGB, or null when the
 * value is not one.
 */
export function parseColor(value) {
  const oklch = value.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/,
  )
  if (oklch) {
    return fromOklch(number(oklch[1]), Number(oklch[2]), Number(oklch[3]), alphaOf(oklch[4]))
  }
  const hex = value.match(/^#([\da-f]{3,8})$/i)
  if (hex) {
    const digits =
      hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit) : hex[1].match(/../g)
    const [red, green, blue, alpha = 'ff'] = digits
    return srgb(
      [red, green, blue].map((channel) => Number.parseInt(channel, 16) / 255),
      Number.parseInt(alpha, 16) / 255,
    )
  }
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/,
  )
  if (rgb) {
    return srgb(
      [rgb[1], rgb[2], rgb[3]].map((channel) => Number(channel) / 255),
      alphaOf(rgb[4]),
    )
  }
  if (value === 'transparent') return srgb([0, 0, 0], 0)
  if (value === 'black') return srgb([0, 0, 0], 1)
  if (value === 'white') return srgb([1, 1, 1], 1)
  return null
}

function reference(value) {
  return value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1] ?? null
}

/** The form a CSS value takes, as LIQ-010 §9.2 maps them. */
export function formOf(value) {
  if (reference(value)) return 'reference'
  if (value.startsWith('oklch(')) return 'oklch'
  if (value.startsWith('#')) return 'hex'
  if (value.startsWith('color-mix(')) return 'colour mix'
  if (value.startsWith('calc(')) return 'calc'
  if (/^-?[\d.]+(rem|px)$/.test(value)) return 'length'
  if (value.startsWith('cubic-bezier(')) return 'easing'
  if (/(rgb|rgba)\(/.test(value) && /\dpx|\s0\s/.test(value)) return 'shadow'
  if (/^[a-z-]+ [\d.]+s /.test(value)) return 'animation'
  if (value.includes(',') || value.startsWith('"')) return 'font stack'
  return 'other'
}

function lengthInPixels(value) {
  const match = value.match(/^(-?[\d.]+)(rem|px)$/)
  if (!match) return null
  return match[2] === 'rem' ? Number(match[1]) * ROOT_FONT_SIZE : Number(match[1])
}

function dimension(value) {
  const match = value.match(/^(-?[\d.]+)(rem|px)$/)
  return { value: Number(match[1]), unit: match[2] }
}

function fontFamily(value) {
  return value.split(',').map((family) => family.trim().replace(/^"|"$/g, ''))
}

function splitTopLevel(value) {
  const parts = []
  let depth = 0
  let current = ''
  for (const character of value) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (character === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  parts.push(current.trim())
  return parts
}

function shadow(value) {
  return splitTopLevel(value).map((layer) => {
    const color = layer.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|#[\da-f]+)/i)?.[1] ?? 'black'
    const lengths = layer
      .replace(color, '')
      .trim()
      .split(/\s+/)
      .filter((part) => part !== 'inset')
      .map((part) => ({ value: Number.parseFloat(part), unit: 'px' }))
    const [offsetX, offsetY, blur = { value: 0, unit: 'px' }, spread = { value: 0, unit: 'px' }] =
      lengths
    return {
      color: parseColor(color),
      offsetX,
      offsetY,
      blur,
      spread,
      inset: layer.includes('inset'),
    }
  })
}

// Premultiplied sRGB mixing, which is what `color-mix(in srgb, …)` does.
function mix(first, firstShare, second) {
  const secondShare = 1 - firstShare
  const alpha = first.alpha * firstShare + second.alpha * secondShare
  if (alpha === 0) return srgb([0, 0, 0], 0)
  const channels = first.components.map(
    (channel, index) =>
      (channel * first.alpha * firstShare + second.components[index] * second.alpha * secondShare) /
      alpha,
  )
  return srgb(channels, alpha)
}

// ---------------------------------------------------------------------------
// Building the token file
// ---------------------------------------------------------------------------

function themeFamily(name) {
  const families = [
    [/^--font-/, 'Font'],
    [/^--text-/, 'Text size'],
    [/^--shadow-/, 'Shadow'],
    [/^--radius-/, 'Radius'],
    [/^--spacing-/, 'Spacing'],
    [/^--ease-/, 'Easing'],
    [/^--animate-/, 'Animation'],
    [/^--color-primary-\d+$/, 'Primary scale'],
  ]
  return families.find(([pattern]) => pattern.test(name))?.[1] ?? 'Theme'
}

/**
 * Turns one system's declarations into a token file.
 *
 * @param {object} options
 * @param {ReturnType<typeof declarations>} options.declared  the stylesheet's declarations
 * @param {Array<object>} options.ids     this system's entries from the ID list
 * @param {Map<string, string>} options.palette  Tailwind palette values by name
 * @param {string[]} options.paletteUsed  palette names the system uses
 * @param {string} options.paletteId      the palette group's ID
 * @param {string} options.source         the stylesheet's path, for descriptions
 * @param {Record<string, object>} options.externals  values set outside the stylesheet
 */
export function buildTokens({ declared, ids, palette, paletteUsed, paletteId, source, externals }) {
  const byName = new Map()
  for (const declaration of declared) {
    const entry = byName.get(declaration.name) ?? { name: declaration.name }
    entry[declaration.block] = declaration
    byName.set(declaration.name, entry)
  }

  const problems = []
  const tokens = []
  const idByName = new Map(ids.map((entry) => [entry.name, entry]))

  for (const declaration of declared) {
    if (declaration.block.startsWith('other')) {
      problems.push(
        `${declaration.name} (line ${declaration.line}) is declared in ${declaration.block}`,
      )
    } else if (!idByName.has(declaration.name)) {
      problems.push(`${declaration.name} (line ${declaration.line}) has no ID in LIQ-009`)
    }
  }

  for (const id of ids) {
    if (id.family === 'Tailwind palette') continue
    const entry = byName.get(id.name)
    if (!entry) {
      problems.push(`${id.id} ${id.name} is in LIQ-009 but not in the stylesheet`)
      continue
    }
    const light = entry.light ?? entry.theme
    const dark = entry.dark
    const family = id.family ?? themeFamily(id.name)
    if (id.light !== undefined && id.light !== light.value) {
      problems.push(
        `${id.id} ${id.name}: LIQ-009 records "${id.light}", the stylesheet "${light.value}"`,
      )
    }
    const recordedDark = id.dark === 'Same as light' ? undefined : id.dark
    if (id.dark !== undefined && recordedDark !== dark?.value) {
      problems.push(
        `${id.id} ${id.name}: LIQ-009 records dark "${id.dark}", the stylesheet "${dark?.value ?? 'no dark value'}"`,
      )
    }
    if (id.value !== undefined && id.value !== light.value) {
      problems.push(
        `${id.id} ${id.name}: LIQ-009 records "${id.value}", the stylesheet "${light.value}"`,
      )
    }
    tokens.push({ id: id.id, name: id.name, family, light, dark })
  }

  for (const name of paletteUsed) {
    if (!palette.has(name)) {
      problems.push(`${name} is used but is not in Tailwind's palette`)
      continue
    }
    tokens.push({
      id: paletteId,
      name,
      family: 'Tailwind palette',
      light: { value: palette.get(name), line: null },
    })
  }
  const listedPalette = ids
    .filter((entry) => entry.family === 'Tailwind palette')
    .map((entry) => entry.name)
  const missingFromList = paletteUsed.filter((name) => !listedPalette.includes(name))
  const noLongerUsed = listedPalette.filter((name) => !paletteUsed.includes(name))
  if (missingFromList.length > 0) {
    problems.push(`${paletteId} lacks palette colours now in use: ${missingFromList.join(', ')}`)
  }
  if (noLongerUsed.length > 0) {
    problems.push(`${paletteId} lists palette colours no longer used: ${noLongerUsed.join(', ')}`)
  }

  const pathByName = new Map(
    tokens.map((token) => [token.name, `${token.family}.${token.name.slice(2)}`]),
  )
  const resolved = new Map()

  // A token's value for one mode, resolving references until a literal is found.
  function literal(name, mode, seen = new Set()) {
    if (seen.has(name)) throw new Error(`Circular reference through ${name}`)
    seen.add(name)
    const token = tokens.find((candidate) => candidate.name === name)
    if (!token) {
      if (externals[name]) return { external: externals[name] }
      throw new Error(`${name} is referenced but not declared`)
    }
    const declaration = (mode === 'dark' && token.dark) || token.light
    const target = reference(declaration.value)
    if (target) return literal(target, mode, seen)
    return { value: declaration.value, token }
  }

  function computeMix(value, mode) {
    const match = value.match(/^color-mix\(in srgb, (.+?) ([\d.]+)%, (.+)\)$/)
    if (!match) throw new Error(`Unsupported colour mix: ${value}`)
    const colorOf = (part) => {
      const target = reference(part)
      return parseColor(target ? literal(target, mode).value : part)
    }
    return mix(colorOf(match[1]), Number(match[2]) / 100, colorOf(match[3]))
  }

  function computeCalc(value, mode) {
    const match = value.match(/^calc\((.+?) ([*/+-]) (.+)\)$/)
    if (!match) throw new Error(`Unsupported calc: ${value}`)
    const operand = (part) => {
      const target = reference(part)
      return target
        ? lengthInPixels(literal(target, mode).value)
        : (lengthInPixels(part) ?? Number(part))
    }
    const [left, right] = [operand(match[1]), operand(match[3])]
    const result = { '*': left * right, '/': left / right, '+': left + right, '-': left - right }[
      match[2]
    ]
    return { value: round(result), unit: 'px' }
  }

  // The DTCG type and value of one declaration, plus how it was obtained.
  function describe(token, declaration, mode) {
    const value = declaration.value
    const form = formOf(value)
    const target = reference(value)
    if (target) {
      const aliased = pathByName.get(target)
      if (aliased) {
        const end = literal(target, mode)
        return { type: typeOf(end.value), value: `{${aliased}}`, form }
      }
      const external = externals[target]
      if (!external) throw new Error(`${token.name} refers to ${target}, which is not declared`)
      return { type: external.type, value: external.value, form: 'external', note: external.note }
    }
    switch (form) {
      case 'oklch':
      case 'hex': {
        const { clip, ...color } = parseColor(value)
        return { type: 'color', value: color, form, clip }
      }
      case 'colour mix': {
        const { clip, ...color } = computeMix(value, mode)
        return { type: 'color', value: color, form, derived: value }
      }
      case 'calc':
        return { type: 'dimension', value: computeCalc(value, mode), form, derived: value }
      case 'length':
        return { type: 'dimension', value: dimension(value), form, pixels: lengthInPixels(value) }
      case 'font stack':
        return { type: 'fontFamily', value: fontFamily(value), form }
      case 'shadow':
        return {
          type: 'shadow',
          value: shadow(value).map(({ color, ...layer }) => {
            const { clip, ...plain } = color
            return { color: plain, ...layer }
          }),
          form,
        }
      case 'easing':
        return { type: 'cubicBezier', value: value.match(/[\d.]+/g).map(Number), form }
      default:
        return { type: undefined, value, form, representable: false }
    }
  }

  function typeOf(value) {
    const form = formOf(value)
    if (['oklch', 'hex', 'colour mix'].includes(form)) return 'color'
    if (['length', 'calc'].includes(form)) return 'dimension'
    return { 'font stack': 'fontFamily', shadow: 'shadow', easing: 'cubicBezier' }[form]
  }

  const document = {}
  for (const token of tokens) {
    try {
      const light = describe(token, token.light, 'light')
      const dark = token.dark ? describe(token, token.dark, 'dark') : undefined
      const where = token.light.line ? `${source}:${token.light.line}` : 'tailwindcss/theme.css'
      const extension = {
        id: token.id,
        source: where,
        css: { light: token.light.value, ...(token.dark && { dark: token.dark.value }) },
        form: light.form,
        ...(dark && { modes: { dark: dark.value } }),
        ...(light.derived && { derived: light.derived }),
        ...(light.clip > 0 && { clippedToSrgb: light.clip }),
        ...(dark?.clip > 0 && { clippedToSrgbDark: dark.clip }),
        ...(light.pixels !== undefined && { pixels: light.pixels }),
        ...(light.representable === false && { representable: false }),
        ...(light.note && { note: light.note }),
      }
      document[token.family] ??= {}
      const group = document[token.family]
      group[token.name.slice(2)] = {
        ...(light.type && { $type: light.type }),
        $value: light.value,
        $description: `${token.id} · ${where}`,
        $extensions: { [EXTENSION]: extension },
      }
      resolved.set(token.name, light)
    } catch (error) {
      problems.push(`${token.id} ${token.name}: ${error.message}`)
    }
  }

  return { document, problems, count: tokens.length }
}

// ---------------------------------------------------------------------------
// Tailwind's palette, and which colours a system uses
// ---------------------------------------------------------------------------

function tailwindPalette(stylesheet) {
  const require = createRequire(stylesheet)
  const themeFile = require.resolve('tailwindcss/theme.css')
  const version = JSON.parse(
    readFileSync(require.resolve('tailwindcss/package.json'), 'utf8'),
  ).version
  const palette = new Map(
    declarations(readFileSync(themeFile, 'utf8'))
      .filter((declaration) => /^--color-/.test(declaration.name))
      .map((declaration) => [declaration.name, declaration.value]),
  )
  return { palette, version }
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === '__tests__' ? [] : sourceFiles(full)
    }
    return /\.(tsx?|css)$/.test(entry.name) && !/\.(test|spec|stories)\.tsx?$/.test(entry.name)
      ? [full]
      : []
  })
}

const UTILITY_PREFIX =
  '(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|accent|caret|divide|placeholder|shadow|inset-shadow|inset-ring)'
const PALETTE_NAME = `(?:(?:${PALETTE_HUES.join('|')})-(?:50|[1-9]00|950)|black|white)`
const CLASS_PATTERN = new RegExp(
  `(?<![\\w-])${UTILITY_PREFIX}-(${PALETTE_NAME})(?:/\\d+)?(?![\\w-])`,
  'g',
)
const VARIABLE_PATTERN = new RegExp(`--color-(${PALETTE_NAME})(?![\\w-])`, 'g')

/**
 * The palette colours a system names in class names or in its stylesheet,
 * except those its own theme redefines (such as the dashboard's blues).
 */
function paletteInUse(directories, declared, palette) {
  const own = new Set(declared.map((declaration) => declaration.name))
  const used = new Set()
  for (const file of directories.flatMap(sourceFiles)) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(CLASS_PATTERN)) used.add(`--color-${match[1]}`)
    for (const match of text.matchAll(VARIABLE_PATTERN)) used.add(`--color-${match[1]}`)
  }
  const order = [...palette.keys()]
  return [...used]
    .filter((name) => !own.has(name))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

// ---------------------------------------------------------------------------
// Email branding defaults, from the Ruby model that applies them
// ---------------------------------------------------------------------------

function emailTokens(rubyFile, ids, source) {
  const ruby = readFileSync(rubyFile, 'utf8')
  const colors = Object.fromEntries(
    [...ruby.matchAll(/(\w+)_color: '(#[\dA-F]{6})'/gi)].map((match) => [match[1], match[2]]),
  )
  const defaultFont = ruby.match(/DEFAULT_FONT = '(\w+)'/)[1]
  const font = ruby.match(
    new RegExp(`'${defaultFont}' => \\{ family: '([^']+)', heading_family: '([^']+)'`),
  )
  const lineOf = (pattern) => ruby.split('\n').findIndex((line) => pattern.test(line)) + 1
  const names = {
    'TK-EM-01': ['accent', null],
    'TK-EM-02': ['background', colors.background],
    'TK-EM-03': ['card', colors.card],
    'TK-EM-04': ['text', colors.text],
    'TK-EM-05': ['heading', colors.heading],
  }
  const problems = []
  const group = {}
  for (const id of ids) {
    if (id.id === 'TK-EM-06') {
      group.font = {
        $type: 'fontFamily',
        $value: fontFamily(font[1]),
        $description: `${id.id} · ${source}:${lineOf(/DEFAULT_FONT =/)}`,
        $extensions: {
          [EXTENSION]: {
            id: id.id,
            source: `${source}:${lineOf(/DEFAULT_FONT =/)}`,
            headingFamily: fontFamily(font[2]),
          },
        },
      }
      continue
    }
    const [name, value] = names[id.id]
    if ((value ?? 'None') !== id.value) {
      problems.push(`${id.id}: LIQ-009 records "${id.value}", the model "${value ?? 'None'}"`)
    }
    const line = lineOf(value ? new RegExp(`${name}_color: '`) : /COLORS = %i/)
    group[`${name}-color`] = {
      ...(value && { $type: 'color' }),
      $value: value ? (({ clip, ...color }) => color)(parseColor(value)) : null,
      $description: `${id.id} · ${source}:${line}`,
      $extensions: {
        [EXTENSION]: {
          id: id.id,
          source: `${source}:${line}`,
          ...(!value && {
            note: 'No default: emails use the heading colour for links and white buttons',
          }),
        },
      },
    }
  }
  return { document: { 'Email branding': group }, problems, count: ids.length }
}

// ---------------------------------------------------------------------------

function serialize(document) {
  return `${JSON.stringify(document, null, 2)}\n`
}

function main() {
  const [configArgument, ...flags] = process.argv.slice(2)
  if (!configArgument) {
    console.error('Usage: node tokens.mjs <config> [--check]')
    process.exit(2)
  }
  const check = flags.includes('--check')
  const configFile = path.resolve(configArgument)
  const base = path.dirname(configFile)
  const config = JSON.parse(readFileSync(configFile, 'utf8'))
  const idList = JSON.parse(readFileSync(path.resolve(base, config.idList), 'utf8'))
  const problems = []

  for (const output of config.outputs) {
    const ids = idList.tokens.filter((entry) => entry.system === output.system)
    const target = path.resolve(base, output.file)
    let result
    if (output.ruby) {
      result = emailTokens(path.resolve(base, output.ruby), ids, output.source)
    } else {
      const stylesheet = path.resolve(base, output.stylesheet)
      const declared = declarations(readFileSync(stylesheet, 'utf8'))
      const { palette, version } = tailwindPalette(stylesheet)
      const scanned = output.scan.map((directory) => path.resolve(base, directory))
      result = buildTokens({
        declared,
        ids,
        palette,
        paletteUsed: paletteInUse(scanned, declared, palette),
        paletteId: output.paletteId,
        source: output.source,
        externals: output.externals ?? {},
      })
      result.document.$extensions = {
        [EXTENSION]: { tailwindcss: version, idList: idList.inventoryVersion },
      }
    }

    problems.push(...result.problems.map((problem) => `${output.file}: ${problem}`))
    const text = serialize(result.document)
    if (check) {
      const current = existsSync(target) ? readFileSync(target, 'utf8') : ''
      if (current !== text) problems.push(`${output.file} is out of date; run the token script`)
    } else {
      writeFileSync(target, text)
    }
    console.log(`${output.file}: ${result.count} tokens`)
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'))
    process.exit(1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
