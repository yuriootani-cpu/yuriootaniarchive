// Run from the project root: node tools/create-social-preview.mjs <path-to-sharp>
import { transformSync } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require(process.argv[2] || 'sharp')
mkdirSync('node_modules/.cache', { recursive: true })
const temp = resolve('node_modules/.cache/archive-preview.cjs')
const doodle = readFileSync('src/components/YuriDoodle.jsx', 'utf8')
writeFileSync('node_modules/.cache/yuri-preview.cjs', transformSync(doodle, {loader:'jsx',format:'cjs',jsx:'automatic'}).code)
const source = readFileSync('src/components/EnvelopeArtwork.jsx', 'utf8').replace("'./YuriDoodle'", "'./yuri-preview.cjs'")
writeFileSync(temp, transformSync(source, {loader:'jsx',format:'cjs',jsx:'automatic'}).code)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const artwork = renderToStaticMarkup(React.createElement(require(temp).EnvelopeDoodles))
const svgs = [...artwork.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(match => match[0].replaceAll('var(--ivory)', '#f7f4f1'))
const position = (svg, x, y, width, height) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${width}" height="${height}" `)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="bg"><stop stop-color="#f7f4f1"/><stop offset="1" stop-color="#e8dbe7"/></linearGradient><linearGradient id="flap" x2="0" y2="1"><stop stop-color="#e2c4cd"/><stop offset="1" stop-color="#c98f9f"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<g fill="none" stroke="#c9c5d5" opacity=".5" stroke-width="28"><path d="M880 -180L1360 300L880 780L400 300Z"/><path d="M880 -50L1230 300L880 650L530 300Z" stroke-width="10"/></g>
<g fill="#754454"><circle cx="102" cy="112" r="43" fill="#f7f4f1" stroke="#b66e82"/><text x="102" y="122" text-anchor="middle" font-family="Georgia" font-size="28">Y/O</text>
<text x="65" y="244" font-family="Georgia" font-size="66">yuri ootani</text><text x="68" y="290" font-family="Arial" font-size="20" letter-spacing="5">PERSONAL ARCHIVE</text>
<text x="68" y="390" font-family="Arial" font-size="25">a few things i've made.</text><text x="68" y="432" font-family="Arial" font-size="25">open an envelope. see what turns up.</text>
<text x="68" y="554" font-family="Georgia" font-style="italic" font-size="23">two Ls make a W</text></g>
<rect x="728" y="76" width="362" height="500" rx="5" fill="#754454" opacity=".12"/>
<rect x="717" y="64" width="362" height="500" rx="5" fill="#f7f4f1" stroke="#d5c6cf"/>
<path d="M717 64H1079V128L925 170H870L717 128Z" fill="url(#flap)"/><circle cx="898" cy="136" r="13" fill="#ebcad2" stroke="#986878"/><circle cx="898" cy="136" r="3" fill="#986878"/>
<g color="#292832">${position(svgs[0], 746, 205, 120, 140)}${position(svgs[1], 864, 202, 115, 116)}${position(svgs[2], 872, 324, 170, 105)}</g>
<g fill="none" stroke="#b66e82" stroke-width="2"><path d="M1010 202c-12-18-29 1 0 18c29-17 12-36 0-18Z"/><path d="M748 398q15-35 30-3t30-3"/></g>
<rect x="744" y="455" width="308" height="70" rx="2" fill="#ebcad255" stroke="#b66e82"/><text x="898" y="497" text-anchor="middle" fill="#754454" font-family="Georgia" font-style="italic" font-size="20">leave your mark to open</text>
</svg>`
writeFileSync('public/images/archive-preview.svg', svg)
await sharp(Buffer.from(svg)).png().toFile('public/images/archive-preview.png')

