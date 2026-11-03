export type Dot = { x: number; y: number; r: number }

export type HalftoneOptions = {
  /** Dot pitch, in viewBox units. */
  step: number
  /** Dots are largest far from the light and vanish toward it. */
  light: { x: number; y: number }
  bounds: readonly [x0: number, y0: number, x1: number, y1: number]
  /** Distance from the light where dots start to appear, and the distance over which they reach full size. */
  near: number
  far: number
  gamma?: number
  /** Largest dot radius, as a fraction of the pitch. */
  max?: number
}

/** A 45-degree dot screen. Pure and deterministic, so the same options always draw the same artwork. */
export function halftoneDots({
  step,
  light,
  bounds,
  near,
  far,
  gamma = 1.15,
  max = 0.64,
}: HalftoneOptions): Dot[] {
  const [x0, y0, x1, y1] = bounds
  const cx = (x0 + x1) / 2
  const span = Math.max(x1 - x0, y1 - y0) * 1.6
  const dots: Dot[] = []
  for (let v = -span; v < span; v += step) {
    for (let u = -span; u < span; u += step) {
      const x = (u - v) * Math.SQRT1_2 + cx
      const y = (u + v) * Math.SQRT1_2
      if (x < x0 || x > x1 || y < y0 || y > y1) continue
      const distance = Math.hypot(x - light.x, y - light.y)
      const tone = Math.pow(Math.min(1, Math.max(0, (distance - near) / far)), gamma)
      const r = tone * step * max
      if (r < step * 0.05) continue
      dots.push({ x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), r: Number(r.toFixed(2)) })
    }
  }
  return dots
}
