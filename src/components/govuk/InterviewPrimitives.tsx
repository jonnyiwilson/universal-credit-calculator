import type { ReactNode } from "react"

export function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="mb-8">
      <legend className="mb-2 text-2xl font-bold">{legend}</legend>
      {hint ? <p className="mb-4 max-w-2xl text-gov-grey">{hint}</p> : null}
      {children}
    </fieldset>
  )
}

export function InsetHelp({ children }: { children: ReactNode }) {
  return <div className="mb-6 border-l-8 border-gov-blue bg-gov-light p-4">{children}</div>
}

export function TechnicalDetails({ summary = "Technical details", children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="border-2 border-gov-border p-4">
      <summary className="cursor-pointer text-xl font-bold">{summary}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}
