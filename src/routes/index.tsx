import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">ays-case</h1>
      <Button>Hello shadcn</Button>
    </main>
  )
}
