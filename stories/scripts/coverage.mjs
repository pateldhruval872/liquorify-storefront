#!/usr/bin/env node
// Lists every component file and token named in the inventory with the stories
// that cover it, from the tags in a built Storybook's index (LIQ-010 §10). The
// storefront keeps an unchanged copy.
//
//   node scripts/coverage.mjs [--index <index.json>] [--ids <ids.json>] [--summary <file>]
//
// Defaults: storybook-static/index.json and inventory/ids.json. --summary also
// appends the Markdown report to a file, such as the CI job summary. Fails
// only when a story carries a tag that names no inventory ID, which is a typo;
// components without stories are expected until every batch is done.

import { appendFileSync, existsSync, readFileSync } from 'node:fs'

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const indexPath = option('--index', 'storybook-static/index.json')
const idsPath = option(
  '--ids',
  existsSync('inventory/ids.json') ? 'inventory/ids.json' : 'stories/inventory/ids.json',
)
const summaryPath = option('--summary', null)

const index = JSON.parse(readFileSync(indexPath, 'utf8'))
const ids = JSON.parse(readFileSync(idsPath, 'utf8'))
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story')

// A group story names its file in the last part of its title: "API key table"
// covers api-key-table.tsx, "Cart drawer" covers CartDrawer.tsx.
const comparable = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const isGroup = (id) => /-G-\d+$/.test(id)
// Tokens are shown a family at a time, so TK-DUI-014 is covered by a story tagged TK-DUI.
const familyOf = (id) => id.replace(/-\d+$/, '')

function storiesForComponent(entry) {
  return stories.filter(
    (story) =>
      story.tags?.includes(entry.id) &&
      (!isGroup(entry.id) || comparable(story.title.split('/').at(-1)) === comparable(entry.name)),
  )
}

function storiesForToken(entry) {
  return stories.filter(
    (story) => story.tags?.includes(entry.id) || story.tags?.includes(familyOf(entry.id)),
  )
}

const known = new Set([
  ...ids.components.map((entry) => entry.id),
  ...ids.tokens.map((entry) => entry.id),
  ...ids.tokens.map((entry) => familyOf(entry.id)),
])
const unknownTags = stories.flatMap((story) =>
  (story.tags ?? [])
    .filter((tag) => /^(CMP|TK)-/.test(tag) && !known.has(tag))
    .map((tag) => `${story.title} / ${story.name}: ${tag} is not in ${idsPath}`),
)

const sections = new Map()
function count(section, covered) {
  const totals = sections.get(section) ?? { covered: 0, total: 0 }
  totals.total += 1
  if (covered) totals.covered += 1
  sections.set(section, totals)
}

const coveredComponents = []
for (const entry of ids.components) {
  const found = storiesForComponent(entry)
  count(familyOf(entry.id), found.length > 0)
  if (found.length > 0) {
    coveredComponents.push(
      `| ${entry.id} | \`${entry.file}\` | ${found[0].title} | ${found.map((story) => story.name).join(' · ')} |`,
    )
  }
}
for (const entry of ids.tokens) count(familyOf(entry.id), storiesForToken(entry).length > 0)

const report = [
  `## Storybook coverage`,
  '',
  `${ids.generatedFrom} ${ids.inventoryVersion}; ${stories.length} stories.`,
  '',
  '| Section | Covered | Total |',
  '|---|---|---|',
  ...[...sections].map(
    ([section, totals]) => `| ${section} | ${totals.covered} | ${totals.total} |`,
  ),
  '',
  '| ID | File | Story | States |',
  '|---|---|---|---|',
  ...coveredComponents,
  '',
  ...(unknownTags.length > 0
    ? ['Tags that name no inventory ID:', '', ...unknownTags.map((line) => `- ${line}`)]
    : []),
].join('\n')

console.log(report)
if (summaryPath) appendFileSync(summaryPath, `${report}\n`)
if (unknownTags.length > 0) process.exit(1)
