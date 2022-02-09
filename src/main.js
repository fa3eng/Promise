const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

const crossQueueMicrotask = typeof window === 'object' ? window.queueMicrotask : globalThis.queueMicrotask

class Promise {
  constructor(executor) {
    this.state = PENDING
    this.onFulfilledCallbacksList = []
    this.onRejectedCallbacksList = []

    try {
      executor(this._resolve, this._reject)
    } catch (error) {
      this._reject(error)
    }
  }

  _resolve = (value) => {
    if(this.state !== PENDING) return
    this.state = FULFILLED
    this.value = value
    for(const callback of this.onFulfilledCallbacksList) callback(value)
  }

  _reject = (reason) => {
    if(this.state !== PENDING) return
    this.state = REJECTED
    this.reason = reason
    for(const callback of this.onRejectedCallbacksList) callback(reason)
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : e => { throw(e) }

    const promise2 = new Promise((resolve, reject) => {
      const next = () => crossQueueMicrotask(() => {
        try {
          const x = this.state === FULFILLED ? onFulfilled(this.value) : onRejected(this.reason)
          this.resolvePromise(promise2, x, resolve, reject)
        } catch (error) {
          reject(error)
        }
      })

      if(this.state !== PENDING) return next()

      this.onFulfilledCallbacksList.push(next)
      this.onRejectedCallbacksList.push(next)
    })

    return promise2
  }

  resolvePromise(promise, x, resolve, reject) {
    if(promise === x) return reject(new TypeError())

    if(x !== null && (typeof x === 'function' || typeof x === 'object')) {
      let then = null
      let isCalled = false
      try {
        then = x.then
      } catch (error) {
        return reject(error)
      }

      if(typeof then === 'function') {
        try {
          then.call(x, (y) => {
            if(isCalled) return
            isCalled = true
            this.resolvePromise(x, y, resolve, reject)
          }, (r) => {
            if(isCalled) return
            isCalled = true
            reject(r)
          })
        } catch (error) {
          if(isCalled) return
          isCalled = true
          reject(error)
        }
      } else {
        resolve(x)
      }
    } else {
      resolve(x)
    }
  }
}

module.exports = Promise