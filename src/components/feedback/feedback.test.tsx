import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState, ErrorState } from './feedback'

describe('feedback components', () => {
  it('ErrorState shows the message and calls onRetry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Network down" onRetry={onRetry} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Network down')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('ErrorState hides Retry when there is no handler', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('EmptyState falls back to the default title', () => {
    render(<EmptyState />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })
})
