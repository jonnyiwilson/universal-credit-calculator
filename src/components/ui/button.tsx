import type { ButtonHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-sm border-2 border-transparent bg-gov-blue px-5 py-2 font-bold text-white shadow-[0_2px_0_#003078] hover:bg-[#003078] focus:outline focus:outline-4 focus:outline-offset-0 focus:outline-gov-yellow disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
