export interface Money {
  amountPence: number
  currency: "GBP"
}

export const gbp = (amountPence: number): Money => ({
  amountPence: Math.round(amountPence),
  currency: "GBP"
})

export const zeroGbp = (): Money => gbp(0)

export const addMoney = (...values: Money[]): Money =>
  gbp(values.reduce((total, value) => total + value.amountPence, 0))

export const subtractMoney = (left: Money, right: Money): Money =>
  gbp(left.amountPence - right.amountPence)

export const maxMoney = (left: Money, right: Money): Money =>
  left.amountPence >= right.amountPence ? left : right

export const minMoney = (left: Money, right: Money): Money =>
  left.amountPence <= right.amountPence ? left : right

export const formatMoney = (value: Money): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: value.currency
  }).format(value.amountPence / 100)
