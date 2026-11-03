import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { OrderDetailPage } from '@/features/orders/components/order-detail-page'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  validateSearch: z.object({ placed: z.literal(1).optional().catch(undefined) }),
  component: OrderDetailPage,
})
