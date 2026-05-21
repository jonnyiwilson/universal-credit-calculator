import type { ReactNode } from "react"

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="border-b-8 border-gov-blue bg-gov-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="text-xl font-bold">Universal Credit assessment</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
