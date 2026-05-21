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
