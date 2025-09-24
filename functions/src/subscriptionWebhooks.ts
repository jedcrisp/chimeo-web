import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const db = getFirestore()

// Stripe webhook handler
export const stripeWebhook = onRequest(
  {
    cors: true,
    region: 'us-central1',
  },
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return res.status(400).send('Webhook Error')
    }

    console.log('Processing webhook event:', event.type)

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
          break

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      res.json({ received: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }
)

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout session completed:', session.id)

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const metadata = session.metadata || {}

  // Get customer details
  const customer = await stripe.customers.retrieve(customerId)
  const email = customer.email || metadata.email

  if (!email) {
    console.error('No email found for customer:', customerId)
    return
  }

  // Find user by email
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    console.error('No user found with email:', email)
    return
  }

  const userDoc = usersSnapshot.docs[0]
  const userId = userDoc.id

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const planType = getPlanTypeFromPriceId(subscription.items.data[0].price.id)

  // Create or update subscription record in user subcollection
  await db.collection('users').doc(userId).collection('subscriptions').doc(subscriptionId).set({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    planType,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update user profile
  await db.collection('users').doc(userId).update({
    subscriptionId,
    planType,
    updatedAt: new Date(),
  })

  console.log(`✅ Subscription created for user ${userId}: ${planType}`)
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription updated:', subscription.id)

  const customerId = subscription.customer as string
  const planType = getPlanTypeFromPriceId(subscription.items.data[0].price.id)

  // Find user by customer ID
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    console.error('No user found with customer ID:', customerId)
    return
  }

  const userDoc = usersSnapshot.docs[0]
  const userId = userDoc.id

  // Update subscription record
  await db.collection('subscriptions').doc(userId).update({
    planType,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  })

  // Update user profile
  await db.collection('users').doc(userId).update({
    planType,
    updatedAt: new Date(),
  })

  console.log(`✅ Subscription updated for user ${userId}: ${planType}`)
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deleted:', subscription.id)

  const customerId = subscription.customer as string

  // Find user by customer ID
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    console.error('No user found with customer ID:', customerId)
    return
  }

  const userDoc = usersSnapshot.docs[0]
  const userId = userDoc.id

  // Update subscription record
  await db.collection('subscriptions').doc(userId).update({
    status: 'cancelled',
    cancelAtPeriodEnd: true,
    updatedAt: new Date(),
  })

  // Downgrade user to free plan
  await db.collection('users').doc(userId).update({
    planType: 'free',
    updatedAt: new Date(),
  })

  console.log(`✅ Subscription cancelled for user ${userId}`)
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing payment succeeded:', invoice.id)

  const customerId = invoice.customer as string

  // Find user by customer ID
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    console.error('No user found with customer ID:', customerId)
    return
  }

  const userDoc = usersSnapshot.docs[0]
  const userId = userDoc.id

  // Update subscription status to active
  await db.collection('subscriptions').doc(userId).update({
    status: 'active',
    updatedAt: new Date(),
  })

  console.log(`✅ Payment succeeded for user ${userId}`)
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing payment failed:', invoice.id)

  const customerId = invoice.customer as string

  // Find user by customer ID
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    console.error('No user found with customer ID:', customerId)
    return
  }

  const userDoc = usersSnapshot.docs[0]
  const userId = userDoc.id

  // Update subscription status to past_due
  await db.collection('subscriptions').doc(userId).update({
    status: 'past_due',
    updatedAt: new Date(),
  })

  console.log(`⚠️ Payment failed for user ${userId}`)
}

// Helper function to map Stripe price IDs to plan types
function getPlanTypeFromPriceId(priceId: string): string {
  // You'll need to replace these with your actual Stripe price IDs
  const priceMap: { [key: string]: string } = {
    'price_pro_monthly': 'pro',
    'price_premium_monthly': 'premium',
    'price_enterprise_monthly': 'enterprise',
  }

  return priceMap[priceId] || 'free'
}

// Firestore trigger to update organization subscription when user subscription changes
export const onUserSubscriptionChange = onDocumentUpdated(
  'subscriptions/{userId}',
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    if (!before || !after) return

    // Check if plan type changed
    if (before.planType !== after.planType) {
      console.log(`User ${event.params.userId} plan changed from ${before.planType} to ${after.planType}`)

      // Update all organizations where this user is an admin
      const organizationsSnapshot = await db.collection('organizations')
        .where('adminIds', 'array-contains', event.params.userId)
        .get()

      for (const orgDoc of organizationsSnapshot.docs) {
        await orgDoc.ref.update({
          subscriptionId: after.planType === 'free' ? null : event.params.userId,
          planType: after.planType,
          updatedAt: new Date(),
        })

        console.log(`Updated organization ${orgDoc.id} subscription to ${after.planType}`)
      }
    }
  }
)
