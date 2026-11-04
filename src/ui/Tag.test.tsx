import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it } from 'vitest'
import { TagList, ToggleTag } from './Tag'

it('tells assistive technology what kind of label each tag is', () => {
  render(
    <TagList
      tags={[
        { id: 'g', name: 'Cumbia', type: 'genre' },
        { id: 's', name: 'Live', type: 'performanceStyle' },
        { id: 'm', name: 'Late night', type: 'mood' },
      ]}
    />,
  )
  const items = screen.getAllByRole('listitem').map((item) => item.textContent)
  expect(items).toEqual(['Genre: Cumbia', 'Style: Live', 'Mood: Late night'])
})

it('renders nothing for a recording without labels', () => {
  const { container } = render(<TagList tags={[]} />)
  expect(container).toBeEmptyDOMElement()
})

it('toggles a filter as a real button', () => {
  function Filter() {
    const [on, setOn] = useState(false)
    return (
      <ToggleTag type="genre" pressed={on} onClick={() => setOn(!on)}>
        Dub
      </ToggleTag>
    )
  }
  render(<Filter />)
  const chip = screen.getByRole('button', { name: 'Dub' })
  expect(chip).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(chip)
  expect(chip).toHaveAttribute('aria-pressed', 'true')
})
