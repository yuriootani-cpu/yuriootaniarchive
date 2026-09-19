import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { projects } from '../src/data/projects.js'
import { archiveHtml } from '../build/archive-html.mjs'

const html = readFileSync('dist/index.html', 'utf8')
assert.ok(html.includes('<h1>Yuri Ootani</h1>'))
assert.equal((html.match(/<article>/g) || []).length, projects.length)
assert.ok(!html.includes('<div id="root"></div>'))
assert.ok(html.includes('property="og:image"'))
assert.ok(html.includes('name="twitter:card" content="summary_large_image"'))
assert.ok(existsSync('dist/images/archive-preview.png'))
const changed = archiveHtml('https://example.com').transformIndexHtml('<div id="root"></div>')
assert.ok(changed.tags.some(t => t.attrs.property === 'og:image' && t.attrs.content === 'https://example.com/images/archive-preview.png'))
for (const project of projects) assert.ok(html.includes(project.link.replaceAll('&', '&amp;')))
console.log(`Static HTML, ${projects.length} project links, social metadata, domain override and image checks passed.`)
