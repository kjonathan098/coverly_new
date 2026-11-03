const root = document.documentElement
const cover = document.querySelector('.cover')
const bar = document.querySelector('.bar')
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = matchMedia('(pointer: fine)').matches
const SVG_NS = 'http://www.w3.org/2000/svg'

/* ---------- Halftone: a 45° dot screen whose dots grow away from a light source ---------- */
function halftone(group, { step, light, bounds, near, far, gamma = 1.15, max = 0.64 }) {
  const fragment = document.createDocumentFragment()
  const [x0, y0, x1, y1] = bounds
  const cx = (x0 + x1) / 2
  const span = Math.max(x1 - x0, y1 - y0) * 1.6
  for (let v = -span; v < span; v += step) {
    for (let u = -span; u < span; u += step) {
      const x = (u - v) * Math.SQRT1_2 + cx
      const y = (u + v) * Math.SQRT1_2
      if (x < x0 || x > x1 || y < y0 || y > y1) continue
      const distance = Math.hypot(x - light.x, y - light.y)
      const tone = Math.pow(Math.min(1, Math.max(0, (distance - near) / far)), gamma)
      const radius = tone * step * max
      if (radius < step * 0.05) continue
      const dot = document.createElementNS(SVG_NS, 'circle')
      dot.setAttribute('cx', x.toFixed(1))
      dot.setAttribute('cy', y.toFixed(1))
      dot.setAttribute('r', radius.toFixed(2))
      fragment.appendChild(dot)
    }
  }
  group.appendChild(fragment)
}

// Issue 07 artwork: the listener, lit from the front of the face
document.querySelectorAll('.art-figure .halftone').forEach((group) =>
  halftone(group, {
    step: 15,
    light: { x: 170, y: 260 },
    bounds: [100, 120, 1010, 1330],
    near: 220,
    far: 720,
  }),
)

// Generated sleeves: every recording gets artwork, even when no image exists
document.querySelectorAll('.sleeve').forEach((sleeve) => {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('aria-hidden', 'true')
  const group = document.createElementNS(SVG_NS, 'g')
  group.setAttribute('fill', 'currentColor')
  svg.appendChild(group)
  halftone(group, {
    step: sleeve.classList.contains('sleeve--big') ? 6 : 9,
    light: { x: 100, y: 100 },
    bounds: [-6, -6, 106, 106],
    near: 10,
    far: 120,
    gamma: 0.9,
    max: 0.68,
  })
  sleeve.prepend(svg)
})

/* ---------- Orbit: a paper satellite circles the head ---------- */
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

/* The orbit's lettering slides along the ellipse until it fits on screen, whatever the aspect ratio */
const ringText = document.querySelector('.ring')
const ringPath = ringText.querySelector('textPath')
const orbitFront = document.getElementById('orbit-front')

function placeRing() {
  const arc = orbitFront.getTotalLength()
  const half = ringText.getComputedTextLength() / 2
  const matrix = ringText.getScreenCTM()
  if (!matrix || !half) return
  const screenX = (length) => {
    const p = orbitFront.getPointAtLength(Math.max(0, Math.min(arc, length)))
    return new DOMPoint(p.x, p.y).matrixTransform(matrix).x
  }
  const limit = document.documentElement.clientWidth - 16
  let fraction = 0.43
  // Pull the line back toward the face until its last year is fully visible.
  while (fraction > half / arc + 0.01 && screenX(fraction * arc + half) > limit) fraction -= 0.01
  ringPath.setAttribute('startOffset', `${(fraction * 100).toFixed(1)}%`)
}
let ringTimer
addEventListener('resize', () => {
  clearTimeout(ringTimer)
  ringTimer = setTimeout(placeRing, 120)
})
document.fonts.ready.then(placeRing)
placeRing()

/* ---------- Depth: pointer and scroll move each plane by its own amount ---------- */
let pointerTarget = { x: 0, y: 0 }
const pointer = { x: 0, y: 0 }
let coverVisible = true

if (finePointer && !reduceMotion) {
  cover.addEventListener('pointermove', (event) => {
    const box = cover.getBoundingClientRect()
    pointerTarget = {
      x: ((event.clientX - box.left) / box.width - 0.5) * 2,
      y: ((event.clientY - box.top) / box.height - 0.5) * 2,
    }
  })
  cover.addEventListener('pointerleave', () => (pointerTarget = { x: 0, y: 0 }))
}
new IntersectionObserver(([entry]) => (coverVisible = entry.isIntersecting)).observe(cover)

/* ---------- One animation loop: cover depth, satellite and the player clock ---------- */
let last = performance.now()
function frame(now) {
  const seconds = Math.min(0.05, (now - last) / 1000)
  last = now

  if (coverVisible && !reduceMotion) {
    orbitPosition = (orbitPosition + (seconds * orbitSpeed) / LAP_SECONDS) % 1
    placeSatellites()
    pointer.x += (pointerTarget.x - pointer.x) * 0.08
    pointer.y += (pointerTarget.y - pointer.y) * 0.08
    cover.style.setProperty('--px', pointer.x.toFixed(4))
    cover.style.setProperty('--py', pointer.y.toFixed(4))
    cover.style.setProperty('--sy', Math.min(scrollY, cover.offsetHeight).toFixed(1))
  }
  tickPlayer(seconds)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

/* ---------- The call to action answers with the artwork ---------- */
const cta = document.querySelector('.btn')
const fan = (on) => {
  cover.classList.toggle('is-fanned', on)
  orbitSpeed = on ? 3 : 1
}
cta.addEventListener('pointerenter', () => fan(true))
cta.addEventListener('pointerleave', () => fan(false))
cta.addEventListener('focus', () => fan(true))
cta.addEventListener('blur', () => fan(false))

/* ---------- Wordmark: every letter has an A-side and a B-side ---------- */
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

/* ---------- Publication bar: the dateline hands over to the logo once the masthead scrolls away ---------- */
new IntersectionObserver(([entry]) => bar.classList.toggle('is-condensed', !entry.isIntersecting), {
  rootMargin: '-60px 0px 0px 0px',
}).observe(document.querySelector('.wordmark'))

/* ---------- Menu sheet on small screens ---------- */
const menu = document.getElementById('menu')
const menuButton = document.querySelector('.menu-btn')
const menuClose = menu.querySelector('.menu-close')

function setMenu(open) {
  menu.hidden = !open
  menuButton.setAttribute('aria-expanded', String(open))
  root.style.overflow = open ? 'hidden' : ''
  ;(open ? menuClose : menuButton).focus()
}
menuButton.addEventListener('click', () => setMenu(true))
menuClose.addEventListener('click', () => setMenu(false))
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false)
})
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) setMenu(false)
})

/* ---------- Player: a playback prototype, no audio ---------- */
const TRACKS = {
  original: {
    artist: 'Junie Marlowe',
    title: 'Paper Satellites',
    year: 1998,
    length: 171,
    color: 'var(--pink)',
  },
  okonkwo: {
    artist: 'Okonkwo Sound System',
    title: 'Paper Satellites',
    year: 2004,
    length: 312,
    color: 'var(--v1)',
  },
  vela: {
    artist: 'Las Hermanas Vela',
    title: 'Satélites de papel',
    year: 2011,
    length: 220,
    color: 'var(--v2)',
  },
  ceilings: {
    artist: 'The Low Ceilings',
    title: 'Paper Satellites',
    year: 2016,
    length: 118,
    color: 'var(--v3)',
  },
  arcade: {
    artist: 'Ghost Arcade',
    title: 'Paper Satellites',
    year: 2019,
    length: 245,
    color: 'var(--v4)',
  },
  stratton: {
    artist: 'Pia Stratton',
    title: 'Paper Satellites',
    year: 2022,
    length: 207,
    color: 'var(--v5)',
  },
}

const player = {
  track: null,
  cover: null,
  playing: false,
  position: 0,
}

const ui = {
  root: document.querySelector('.player'),
  toggle: document.querySelector('.player-toggle'),
  title: document.querySelector('.player-title'),
  sub: document.querySelector('.player-sub'),
  time: document.querySelector('.player-time'),
  len: document.querySelector('.player-len'),
  bar: document.querySelector('.player-bar span'),
  compare: document.querySelector('.player-compare'),
  status: document.getElementById('player-status'),
  buttons: [...document.querySelectorAll('[data-play]')],
  rows: [...document.querySelectorAll('[data-track]')],
}

const clock = (seconds) => {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function describe(id) {
  const track = TRACKS[id]
  return id === 'original'
    ? `the original by ${track.artist}, ${track.year}`
    : `${track.artist}'s ${track.year} cover`
}

function renderPlayer() {
  const { track: id, playing, position } = player
  ui.buttons.forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.play === id && playing)),
  )
  ui.rows.forEach((row) => {
    row.classList.toggle('is-current', row.dataset.track === id)
    row.classList.toggle('is-playing', row.dataset.track === id && playing)
  })
  const label = document.querySelector('.play-big .play-label')
  label.textContent = id === 'original' && playing ? 'Pause the original' : 'Play the original'

  if (!id) return
  const track = TRACKS[id]
  ui.root.classList.remove('is-idle')
  ui.root.classList.toggle('is-playing', playing)
  ui.root.style.setProperty('--accent', track.color)
  ui.toggle.disabled = false
  ui.toggle.classList.toggle('is-playing', playing)
  ui.toggle.setAttribute('aria-label', playing ? 'Pause' : 'Play')
  ui.title.textContent = `${track.title}, ${track.artist}`
  ui.title.lang = id === 'vela' ? 'es' : 'en'
  if (id !== 'original') ui.sub.textContent = `Cover, ${track.year}`
  else if (player.cover) ui.sub.textContent = 'The original, at the same moment'
  else ui.sub.textContent = `The original, ${track.year}`
  ui.time.textContent = clock(position)
  ui.len.textContent = clock(track.length)
  ui.bar.style.width = `${(position / track.length) * 100}%`

  ui.compare.disabled = !player.cover
  const comparing = Boolean(player.cover) && id === 'original'
  ui.compare.setAttribute('aria-pressed', String(comparing))
  ui.compare.textContent = comparing ? 'Back to the cover' : 'Compare with the original'
}

function play(id) {
  if (player.track === id) {
    player.playing = !player.playing
  } else {
    player.track = id
    player.cover = id === 'original' ? null : id
    player.position = 0
    player.playing = true
  }
  ui.status.textContent = player.playing ? `Playing ${describe(id)}` : 'Paused'
  renderPlayer()
}

ui.buttons.forEach((button) => button.addEventListener('click', () => play(button.dataset.play)))
ui.toggle.addEventListener('click', () => {
  if (player.track) play(player.track)
})
ui.compare.addEventListener('click', () => {
  if (!player.cover) return
  const next = player.track === 'original' ? player.cover : 'original'
  player.track = next
  player.position = Math.min(player.position, TRACKS[next].length - 1)
  player.playing = true
  ui.status.textContent = `Switched to ${describe(next)} at ${clock(player.position)}`
  renderPlayer()
})

function tickPlayer(seconds) {
  if (!player.playing || !player.track) return
  const track = TRACKS[player.track]
  player.position = Math.min(track.length, player.position + seconds)
  if (player.position >= track.length) {
    player.playing = false
    ui.status.textContent = 'Finished'
  }
  renderPlayer()
}
