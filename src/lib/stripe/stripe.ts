import Stripe from 'stripe'

const globalForStripe = global as unknown as { stripe: Stripe | undefined }

function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }

  const instance = new Stripe(key, { typescript: true })

  if (process.env.NODE_ENV !== 'production') {
    globalForStripe.stripe = instance
  }

  return instance
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe()
    const value = Reflect.get(instance, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
