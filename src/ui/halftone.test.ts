import { expect, it } from 'vitest'
import { halftoneDots } from './halftone'

const options = {
  step: 9,
  light: { x: 100, y: 100 },
  bounds: [0, 0, 100, 100] as const,
  near: 10,
  far: 120,
}

it('is deterministic, so artwork never changes between renders', () => {
  expect(halftoneDots(options)).toEqual(halftoneDots(options))
})

it('keeps every dot inside the bounds and grows dots away from the light', () => {
  const dots = halftoneDots(options)
  expect(dots.length).toBeGreaterThan(50)
  expect(dots.every((d) => d.x >= 0 && d.x <= 100 && d.y >= 0 && d.y <= 100)).toBe(true)
  const nearLight = dots.filter((d) => d.x > 80 && d.y > 80)
  const farFromLight = dots.filter((d) => d.x < 20 && d.y < 20)
  const largest = (list: typeof dots) => Math.max(0, ...list.map((d) => d.r))
  expect(largest(farFromLight)).toBeGreaterThan(largest(nearLight))
})
