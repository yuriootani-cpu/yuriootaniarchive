import ArrowUpRight from './ArrowUpRight'
import { useState } from 'react'

// An entry with `video` plays muted on a loop; its `src` is the still used as poster and selector thumbnail.
const Media = ({ image }) => image.video
  ? <video className="project-image" src={image.video} poster={image.src} aria-label={image.alt} autoPlay muted loop playsInline/>
  : <img className="project-image" src={image.src} alt={image.alt}/>

export default function ProjectImages({ project }) {
  const [selected, setSelected] = useState(0)
  const images = project.images || [{ src: project.thumbnail, alt: project.name }]
  const current = images[selected]
  if (images.length === 1) return <Media image={current}/>
  return <div className="project-images">
    {current.video ? <Media key={current.video} image={current}/> : <a className="project-image-link" href={current.src} target="_blank" rel="noreferrer" aria-label={`Open full-size image: ${current.alt}`}>
      <img className="project-image" src={current.src} alt={current.alt}/>
      <span className="image-enlarge" aria-hidden="true"><ArrowUpRight/></span>
    </a>}
    <div className="image-selectors" role="group" aria-label="Project images">
      {images.map((image, i) => <button key={image.video || image.src} type="button" aria-label={`Show ${image.alt}`} aria-pressed={selected === i} onClick={() => setSelected(i)}><img src={image.src} alt=""/></button>)}
      <span aria-live="polite">{selected + 1} / {images.length}</span>
    </div>
  </div>
}
