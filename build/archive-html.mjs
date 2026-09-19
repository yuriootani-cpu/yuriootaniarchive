import { projects } from '../src/data/projects.js'

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

export function renderArchive() {
  return `<main class="static-archive">
    <header><p class="static-label">Y / O · PERSONAL ARCHIVE</p><h1>Yuri Ootani</h1>
    <p>A collection of projects, experiments, and things I've made. My background is in civil engineering; these days I'm trying new hobbies and making things work.</p></header>
    <noscript><p>The animated envelopes need JavaScript. You can explore every project below without it.</p></noscript>
    <h2>The projects</h2><ul>${projects.map(p => `<li><article><h3><a href="${escapeHtml(p.link)}">${escapeHtml(p.name)}</a></h3><p>${escapeHtml(p.description)}</p><details><summary>From my notebook</summary><p class="static-notes">${escapeHtml(p.longDescription)}</p></details>${p.sourceLink ? `<p><a href="${escapeHtml(p.sourceLink)}">View source on GitHub</a></p>` : ''}</article></li>`).join('')}</ul>
    <footer><a href="mailto:yuriootani@gmail.com">Email me</a> · <a href="https://x.com/yuriootaniqbis">Find me on X</a></footer>
  </main>`
}

export function archiveHtml(siteUrl = 'https://yuriootani.vercel.app') {
  const base = new URL(siteUrl)
  if (base.protocol !== 'https:') throw new Error('VITE_SITE_URL must use HTTPS')
  const url = base.origin + '/'
  const image = new URL('/images/archive-preview.png', url).href
  return {
    name: 'archive-static-html',
    transformIndexHtml(html) {
      return {
        html: html.replace('<div id="root"></div>', `<div id="root">${renderArchive()}</div>`),
        tags: [
          { tag: 'link', attrs: { rel: 'canonical', href: url } },
          ...Object.entries({
            'og:url': url,
            'og:image': image,
            'og:image:secure_url': image,
            'og:image:type': 'image/png',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': 'Yuri Ootani personal archive: a pink envelope with Yuri and Borg doodles.',
          }).map(([property, content]) => ({ tag: 'meta', attrs: { property, content } })),
          ...Object.entries({
            'twitter:card': 'summary_large_image',
            'twitter:title': 'Yuri Ootani Archive',
            'twitter:description': 'Leave a mark, open an envelope, and discover a project.',
            'twitter:image': image,
            'twitter:image:alt': 'A pink envelope with Yuri and Borg doodles beside the archive title.',
          }).map(([name, content]) => ({ tag: 'meta', attrs: { name, content } })),
        ],
      }
    },
  }
}
