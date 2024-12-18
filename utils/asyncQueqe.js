/**
 * An asynchronously iterable queue class. Add values with enqueue()
 * and remove them with dequeue(). dequeue() returns a Promise, which
 * means that values can be dequeued before they are enqueued. The
 * class implements [Symbol.asyncIterator] and next() so that it can
 * be used with the for/await loop (which will not terminate until
 * the close() method is called.)
 */
class AsyncQueue {
  constructor() {
    // Values that have been queued but not dequeued yet are stored here
    this.values = []
    // When Promises are dequeued before their corresponding values are
    // queued, the resolve methods for those Promises are stored here.
    this.resolvers = []
    // Once closed, no more values can be enqueued, and no more unfulfilled
    // Promises returned.
    this.closed = false
  }
  enqueue(value) {
    if (this.closed) {
      throw new Error('AsyncQueue closed')
    }
    if (this.resolvers.length > 0) {
      // If this value has already been promised, resolve that Promise
      const resolve = this.resolvers.shift()
      resolve(value)
    } else {
      // Otherwise, queue it up
      this.values.push(value)
    }
  }
  dequeue() {
    if (this.values.length > 0) {
      // If there is a queued value, return a resolved Promise for it
      const value = this.values.shift()
      return Promise.resolve(value)
    } else if (this.closed) {
      // If no queued values and we're closed, return a resolved
      // Promise for the "end-of-stream" marker
      return Promise.resolve(AsyncQueue.EOS)
    } else {
      // Otherwise, return an unresolved Promise,
      // queuing the resolver function for later use
      return new Promise((resolve) => {
        this.resolvers.push(resolve)
      })
    }
  }
  close() {
    // Once the queue is closed, no more values will be enqueued.
    // So resolve any pending Promises with the end-of-stream marker
    while (this.resolvers.length > 0) {
      this.resolvers.shift()(AsyncQueue.EOS)
    }
    this.closed = true
  }
  // Define the method that makes this class asynchronously iterable
  [Symbol.asyncIterator]() {
    return this
  }
  // Define the method that makes this an asynchronous iterator. The
  // dequeue() Promise resolves to a value or the EOS sentinel if we're
  // closed. Here, we need to return a Promise that resolves to an
  // iterator result object.
  next() {
    return this.dequeue().then((value) =>
      value === AsyncQueue.EOS
        ? { value: undefined, done: true }
        : { value: value, done: false }
    )
  }
}
// A sentinel value returned by dequeue() to mark "end of stream" when closed
AsyncQueue.EOS = Symbol('end-of-stream')

export default AsyncQueue