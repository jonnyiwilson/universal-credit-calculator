import { forwardRef } from "react"

export interface SummaryIssue {
  id: string
  path?: string
  message: string
  howToFix: string
}

export const ErrorSummary = forwardRef<HTMLDivElement, { issues: SummaryIssue[] }>(({ issues }, ref) => {
  if (!issues.length) return null
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title" className="mb-8 border-4 border-red-700 p-4 focus:outline focus:outline-4 focus:outline-gov-yellow">
      <h2 id="error-summary-title" className="text-2xl font-bold">There is a problem</h2>
      <ul className="mt-3 list-disc pl-6">
        {issues.map((issue) => (
          <li key={issue.id}>
            <a className="font-bold text-red-700 underline" href={issue.path ? `#${fieldId(issue.path)}` : undefined}>
              {issue.message}
            </a>
            <p className="text-gov-grey">{issue.howToFix}</p>
          </li>
        ))}
      </ul>
    </div>
  )
})

export function WarningSummary({ issues }: { issues: SummaryIssue[] }) {
  if (!issues.length) return null
  return (
    <div role="status" className="mb-8 border-l-8 border-gov-yellow bg-gov-light p-4">
      <h2 className="text-2xl font-bold">Check before you continue</h2>
      <ul className="mt-3 list-disc pl-6">
        {issues.map((issue) => (
          <li key={issue.id}>
            <strong>{issue.message}</strong>
            <p>{issue.howToFix}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function fieldId(path: string) {
  return path.replace(/[^a-zA-Z0-9_-]+/g, "-")
}
