import { root } from './root'

// Vercel zero-config entry: the Hono app is the default export. Local dev uses `dev.ts`, which
// also installs the process-level guards; the serverless runtime handles its own.
export default root
