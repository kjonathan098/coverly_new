const root = document.documentElement
const cover = document.querySelector('.cover')
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = matchMedia('(pointer: fine)').matches
const SVG_NS = 'http://www.w3.org/2000/svg'

/* Color study switcher: buttons, keys 1–3, and the URL keeps the choice on reload */
const PALETTES = ['electric', 'retro', 'afterhours']
const paletteButtons = document.querySelectorAll('[data-set-palette]')

function setPalette(name) {
  root.dataset.palette = name
  paletteButtons.forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.setPalette === name)),
  )
  const url = new URL(location.href)
  url.searchParams.set('palette', name)
  history.replaceState(null, '', url)
}
paletteButtons.forEach((button) =>
  button.addEventListener('click', () => setPalette(button.dataset.setPalette)),
)
addEventListener('keydown', (event) => {
  const index = Number(event.key) - 1
  if (PALETTES[index] && !event.metaKey && !event.ctrlKey && !event.altKey)
    setPalette(PALETTES[index])
})
setPalette(root.dataset.palette)

/* Halftone: a rotated 45° dot screen, dots grow away from a light source in front of the face */
function drawHalftone(group) {
  const step = 15
  const light = { x: 170, y: 260 }
  const fragment = document.createDocumentFragment()
  for (let v = -260; v < 1700; v += step) {
    for (let u = -260; u < 1500; u += step) {
      const x = (u - v) * Math.SQRT1_2 + 520
      const y = (u + v) * Math.SQRT1_2
      if (x < 100 || x > 1010 || y < 120 || y > 1330) continue
      const distance = Math.hypot(x - light.x, y - light.y)
      const tone = Math.pow(Math.min(1, Math.max(0, (distance - 220) / 720)), 1.15)
      const radius = tone * step * 0.64
      if (radius < 0.7) continue
      const dot = document.createElementNS(SVG_NS, 'circle')
      dot.setAttribute('cx', x.toFixed(1))
      dot.setAttribute('cy', y.toFixed(1))
      dot.setAttribute('r', radius.toFixed(2))
      fragment.appendChild(dot)
    }
  }
  group.appendChild(fragment)
}
document.querySelectorAll('.halftone').forEach(drawHalftone)

/* Orbit: a paper satellite circles the head, hidden behind it on the far side */
const orbit = document.getElementById('orbit')
const orbitLength = orbit.getTotalLength()
const satellites = document.querySelectorAll('.satellite')
let orbitSpeed = 1
let orbitPosition = 0.08
const LAP_SECONDS = 16

function placeSatellites() {
  const point = orbit.getPointAtLength(orbitPosition * orbitLength)
  const transform = `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) scale(20)`
  satellites.forEach((satellite) => satellite.setAttribute('transform', transform))
}
placeSatellites()

/* Pointer parallax: each plane moves by its own depth */
let target = { x: 0, y: 0 }
let current = { x: 0, y: 0 }
if (finePointer && !reduceMotion) {
  cover.addEventListener('pointermove', (event) => {
    const box = cover.getBoundingClientRect()
    target = {
      x: ((event.clientX - box.left) / box.width - 0.5) * 2,
      y: ((event.clientY - box.top) / box.height - 0.5) * 2,
    }
  })
  cover.addEventListener('pointerleave', () => (target = { x: 0, y: 0 }))
}

let last = performance.now()
function frame(now) {
  const seconds = Math.min(0.05, (now - last) / 1000)
  last = now

  orbitPosition = (orbitPosition + (seconds * orbitSpeed) / LAP_SECONDS) % 1
  placeSatellites()

  current.x += (target.x - current.x) * 0.08
  current.y += (target.y - current.y) * 0.08
  cover.style.setProperty('--px', current.x.toFixed(4))
  cover.style.setProperty('--py', current.y.toFixed(4))

  requestAnimationFrame(frame)
}
if (!reduceMotion) requestAnimationFrame(frame)

/* The call to action fans the echoes out and speeds up the satellite: the artwork answers the invitation */
const cta = document.querySelector('.btn')
const fan = (on) => {
  cover.classList.toggle('is-fanned', on)
  orbitSpeed = on ? 3 : 1
}
cta.addEventListener('pointerenter', () => fan(true))
cta.addEventListener('pointerleave', () => fan(false))
cta.addEventListener('focus', () => fan(true))
cta.addEventListener('blur', () => fan(false))

/* Wordmark: every letter has an A-side and a B-side */
const letters = [...document.querySelectorAll('.wordmark .l')]
if (finePointer) {
  letters.forEach((letter) => {
    let timer
    letter.addEventListener('pointerenter', () => {
      clearTimeout(timer)
      letter.classList.add('is-b')
    })
    letter.addEventListener('pointerleave', () => {
      timer = setTimeout(() => letter.classList.remove('is-b'), 420)
    })
  })
}

/* Entrance: letters flip from their B-side, echoes slide out from behind the figure */
function playIntro() {
  if (!root.classList.contains('intro')) return
  setTimeout(() => cover.classList.add('is-open'), 280)
  letters.forEach((letter, index) =>
    setTimeout(() => letter.classList.add('is-revealed'), 120 + index * 85),
  )
  setTimeout(() => root.classList.remove('intro'), 1600)
}
Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]).then(
  playIntro,
)
