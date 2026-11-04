import { envelope } from '@ays/validators'
import { z } from 'zod'

export const healthSchema = envelope(z.object({ status: z.literal('ok') }))
