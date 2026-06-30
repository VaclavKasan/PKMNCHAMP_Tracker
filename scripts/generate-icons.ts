import fs from 'fs'
import path from 'path'

const svg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#1d4ed8"/>
  <rect x="0" y="${size/2 - size*0.04}" width="${size}" height="${size*0.08}" fill="white"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.15}" fill="white" stroke="#1d4ed8" stroke-width="${size*0.04}"/>
  <path d="M ${size*0.05} ${size/2} A ${size*0.45} ${size*0.45} 0 0 1 ${size*0.95} ${size/2}" fill="#e11d48"/>
</svg>`.trim()

const ICONS = path.resolve('public/icons')
fs.mkdirSync(ICONS, { recursive: true })

fs.writeFileSync(path.join(ICONS, 'icon.svg'),          svg(512))
fs.writeFileSync(path.join(ICONS, 'icon-192.svg'),      svg(192))
fs.writeFileSync(path.join(ICONS, 'icon-512.svg'),      svg(512))
fs.writeFileSync(path.join(ICONS, 'icon-512-mask.svg'), svg(512))
fs.writeFileSync(path.join(ICONS, 'apple-touch.svg'),   svg(180))

console.log('✓ SVG icons generated in public/icons/')
