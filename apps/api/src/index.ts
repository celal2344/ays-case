import { root } from './root'
import { installProcessGuards } from './utils/process-guards'

installProcessGuards()

// Vercel zero-config entry: the Hono app is the default export. Local dev uses `dev.ts`.
export default root
