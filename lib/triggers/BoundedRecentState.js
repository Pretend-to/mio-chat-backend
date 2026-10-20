// These caches retain recent observations for race resolution. Existing-key
// writes keep their original position; callers can delete first to refresh it.
export class BoundedRecentMap extends Map {
  constructor(limit = 1024) {
    super()
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError('BoundedRecentMap limit must be a positive integer')
    }
    this.limit = limit
  }

  set(key, value) {
    super.set(key, value)
    while (this.size > this.limit) {
      super.delete(this.keys().next().value)
    }
    return this
  }
}

export class BoundedRecentSet extends Set {
  constructor(limit = 1024) {
    super()
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError('BoundedRecentSet limit must be a positive integer')
    }
    this.limit = limit
  }

  add(value) {
    super.add(value)
    while (this.size > this.limit) {
      super.delete(this.values().next().value)
    }
    return this
  }
}
