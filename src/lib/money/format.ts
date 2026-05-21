import type { Money } from "../../domain/types/money"

export function displayMoney(value: Money): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value.amountPence / 100)
}

export function poundsToPence(value: string | number): number {
  const numeric = typeof value === "string" ? Number(value) : value
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0
}
