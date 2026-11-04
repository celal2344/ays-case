import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { Gallery } from '../components/detail/gallery'

const IMAGES = ['/a.png', '/b.png', '/c.png']

const originalMatchMedia = window.matchMedia

function stubMedia(matches: (query: string) => boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
}
const desktop = () => stubMedia((q) => q.includes('min-width'))

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('Gallery (desktop)', () => {
  it('thumbnails switch the main image on click and mark the active one', async () => {
    desktop()
    render(<Gallery images={IMAGES} title="Lamp" />)
    const thumbs = screen.getByRole('list', { name: 'Product images' })
    await userEvent.click(within(thumbs).getByRole('button', { name: 'Show image 2' }))
    expect(within(thumbs).getByRole('button', { name: 'Show image 2' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('img', { name: 'Lamp' })).toHaveAttribute('src', '/b.png')
  })

  it('thumbnails also switch on mouse hover', async () => {
    desktop()
    render(<Gallery images={IMAGES} title="Lamp" />)
    await userEvent.hover(screen.getByRole('button', { name: 'Show image 3' }))
    expect(screen.getByRole('img', { name: 'Lamp' })).toHaveAttribute('src', '/c.png')
  })

  it('opens a lightbox on the current image with counter, arrows and arrow keys', async () => {
    desktop()
    render(<Gallery images={IMAGES} title="Lamp" />)
    await userEvent.click(screen.getByRole('button', { name: 'Show image 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Zoom image' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('2 / 3')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Next image' }))
    expect(within(dialog).getByText('3 / 3')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next image' }))
    expect(within(dialog).getByText('1 / 3')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(within(dialog).getByText('3 / 3')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(within(dialog).getByText('2 / 3')).toBeInTheDocument()
  })

  it('closes the lightbox with Escape and with the close button', async () => {
    desktop()
    render(<Gallery images={IMAGES} title="Lamp" />)
    await userEvent.click(screen.getByRole('button', { name: 'Zoom image' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Zoom image' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a single image has no thumbnails, arrows or counter, and still opens the lightbox', async () => {
    desktop()
    render(<Gallery images={['/only.png']} title="Lamp" />)
    expect(screen.queryByRole('list', { name: 'Product images' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Zoom image' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/\d \/ \d/)).not.toBeInTheDocument()
  })
})

describe('Gallery (phone)', () => {
  it('shows the carousel with an indicator, and thumbnails below', () => {
    stubMedia(() => false)
    render(<Gallery images={IMAGES} title="Lamp" />)
    expect(screen.getByRole('region', { name: 'Product images, swipe to change' })).toBeVisible()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Product images' })).toBeInTheDocument()
  })

  it('a tap opens the lightbox', async () => {
    stubMedia(() => false)
    render(<Gallery images={IMAGES} title="Lamp" />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Zoom image' })[0]!)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
