// Static paper grain: soft marker edges without an animated filter or bitmap.
export default function MarkerTexture({ id }) {
  return <defs><filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="9" result="grain"/>
    <feDisplacementMap in="SourceGraphic" in2="grain" scale=".45" xChannelSelector="R" yChannelSelector="G" result="ink"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .32 .68" result="paper"/>
    <feComposite in="ink" in2="paper" operator="in"/>
  </filter></defs>
}
