// Re-export generated types from serializers
export type { Item, User, Version } from './serializers'

export type FlashData = {
  notice?: string
  alert?: string
}

export type SharedProps = {
  flash?: FlashData
  user?: User
}

export type Pagy = {
  count: number
  page: number
  limit: number
  pages: number
  last: number
  in: number
  from: number
  to: number
  prev: number | null
  next: number | null
}

// Import User type for SharedProps
import type { User } from './serializers'
