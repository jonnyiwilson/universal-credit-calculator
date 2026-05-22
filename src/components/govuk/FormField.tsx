import type { InputHTMLAttributes, ReactNode } from "react"

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  suffix?: ReactNode
}

export function FormField({ label, hint, error, suffix, id, ...props }: FormFieldProps) {
  const inputId = id ?? props.name
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId, props["aria-describedby"]].filter(Boolean).join(" ") || undefined

  return (
    <div className="mb-6">
      <label htmlFor={inputId} className="mb-1 block text-lg font-bold">
        {label}
      </label>
      {hint ? <p id={hintId} className="mb-2 max-w-2xl text-base text-gov-grey">{hint}</p> : null}
      {error ? <p id={errorId} className="mb-2 font-bold text-red-700"><span className="sr-only">Error: </span>{error}</p> : null}
      <div className="flex max-w-sm items-stretch">
        <input
          id={inputId}
          className="w-full rounded-none border-2 border-gov-dark px-3 py-2 focus:outline focus:outline-4 focus:outline-gov-yellow"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {suffix ? <span className="border-y-2 border-r-2 border-gov-dark bg-gov-light px-3 py-2">{suffix}</span> : null}
      </div>
    </div>
  )
}
