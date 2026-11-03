import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { paginate } from '@/features/products/catalog'

import { PaginationBar, RESULTS_ID } from '../pagination-bar'

const items = Array.from({ length: 194 }, (_, i) => i)

function Harness({ start = 1, spy }: { start?: number; spy?: (page: number) => void }) {
  const [current, setCurrent] = useState(start)
  const page = paginate(items, current, 12)
  return (
    <>
      <div id={RESULTS_ID} tabIndex={-1}>
        results
      </div>
      <PaginationBar
        page={page}
        onPageChange={(next) => {
          spy?.(next)
          setCurrent(next)
        }}
      />
    </>
  )
}

// a jump moves focus to the results on the next frame; wait for it before typing again
const settled = () => waitFor(() => expect(document.getElementById(RESULTS_ID)).toHaveFocus())

const input = () => screen.getByRole('spinbutton', { name: 'Go to page' })

describe('PaginationBar (numbered pager)', () => {
  it('shows numbered pages with ellipses and marks the current one', () => {
    render(<Harness start={6} />)
    expect(screen.getByText('Showing 61–72 of 194')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 6' })).toHaveAttribute('aria-current', 'page')
    for (const n of [1, 5, 7, 17]) {
      expect(screen.getByRole('button', { name: `Page ${n}` })).not.toHaveAttribute('aria-current')
    }
    expect(screen.queryByRole('button', { name: 'Page 3' })).not.toBeInTheDocument()
  })

  it('jumps to a page in one click and disables Previous/Next at the ends', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Page 5' }))
    expect(spy).toHaveBeenCalledWith(5)
    await userEvent.click(screen.getByRole('button', { name: 'Page 17' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByText('Showing 193–194 of 194')).toBeInTheDocument()
  })

  it('go-to-page: Enter jumps, clamps into range, ignores empty input and resets', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)

    await userEvent.type(input(), '9{Enter}')
    expect(spy).toHaveBeenLastCalledWith(9)
    expect(input()).toHaveValue(null)
    await settled()

    await userEvent.type(input(), '999{Enter}')
    expect(spy).toHaveBeenLastCalledWith(17)
    await settled()

    await userEvent.type(input(), '0{Enter}')
    expect(spy).toHaveBeenLastCalledWith(1)

    spy.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(spy).not.toHaveBeenCalled()

    await userEvent.type(input(), '1{Enter}') // already there: no new history entry
    expect(spy).not.toHaveBeenCalled()
  })

  it('moves focus to the results after a page change', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(document.getElementById(RESULTS_ID)).toHaveFocus())
  })

  it('has no go-to box for a single page and renders nothing when empty', () => {
    const { rerender } = render(
      <PaginationBar page={paginate([1, 2], 1, 12)} onPageChange={vi.fn()} />,
    )
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    rerender(<PaginationBar page={paginate([], 1, 12)} onPageChange={vi.fn()} />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
