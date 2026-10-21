#!/usr/bin/env node
// Copies the images from a downloaded visual check artifact into the reference
// folder, for a person who has looked at them and cannot run the update in
// Docker (LIQ-010 §11.4). It only moves files: proposed images for missing
// references, and actual images for changed ones. The storefront keeps an
// unchanged copy.
//
//   node scripts/copy-references.mjs <artifact folder> [story id ...] [--references <folder>]
//
// The reference folder defaults to visual/__screenshots__ under the current folder.

import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const referencesIndex = args.indexOf('--references')
const references = path.resolve(
  referencesIndex >= 0 ? args.splice(referencesIndex, 2)[1] : 'visual/__screenshots__',
)
const [artifact, ...only] = args
if (!artifact) {
  console.error('Usage: node scripts/copy-references.mjs <artifact folder> [story id ...]')
  process.exit(1)
}

// <test folder>/proposed/<story id>/<mode>.png and <test folder>/<story id>/<mode>-actual.png
const image = /(?:^|\/)(?:proposed\/)?([a-z0-9-]+--[a-z0-9-]+)\/([a-z0-9-]+?)(-actual)?\.png$/

let copied = 0
for (const file of readdirSync(artifact, { recursive: true })) {
  const relative = file.split(path.sep).join('/')
  const match = relative.match(image)
  if (!match) continue
  const [, storyId, mode, actual] = match
  if (!actual && !relative.includes('proposed/')) continue
  if (only.length > 0 && !only.includes(storyId)) continue
  mkdirSync(path.join(references, storyId), { recursive: true })
  copyFileSync(path.join(artifact, file), path.join(references, storyId, `${mode}.png`))
  console.log(`${storyId}/${mode}.png`)
  copied += 1
}
console.log(`${copied} reference images copied; list them and the reason in the pull request.`)
