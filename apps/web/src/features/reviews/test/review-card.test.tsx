import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReviewCard } from '../components/review-card'
import type { ReviewItem } from '../schemas'

const review: ReviewItem = {
  key: '1',
  id: 1,
  rating: 4,
  comment: 'Works well.',
  date: '2025-04-30T09:41:02.053Z',
  authorId: 'user-7',
  authorName: 'Ada Lovelace',
  verifiedBuyer: false,
}

const base = {
  review,
  canEdit: false,
  canDelete: false,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

describe('ReviewCard', () => {
  it('REV-5: shows the verified-buyer badge only when verified', () => {
    const { rerender } = render(
      <ul>
        <ReviewCard {...base} />
      </ul>,
    )
    expect(screen.queryByText('Verified buyer')).not.toBeInTheDocument()
    rerender(
      <ul>
        <ReviewCard {...base} review={{ ...review, verifiedBuyer: true }} />
      </ul>,
    )
    expect(screen.getByText('Verified buyer')).toBeInTheDocument()
  })

  it('shows author, formatted date and text, and hides actions without permission', () => {
    render(
      <ul>
        <ReviewCard {...base} />
      </ul>,
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Apr 30, 2025')).toBeInTheDocument()
    expect(screen.getByText('Works well.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit your review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete review' })).not.toBeInTheDocument()
  })

  it('REV-4: delete needs a confirmation', async () => {
    const onDelete = vi.fn()
    render(
      <ul>
        <ReviewCard {...base} canDelete onDelete={onDelete} />
      </ul>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete review' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
