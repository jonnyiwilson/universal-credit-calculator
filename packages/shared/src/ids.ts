export type EntityId = string
export type ISODate = string

export const createEntityId = (prefix: string): EntityId => `${prefix}_${crypto.randomUUID()}`
