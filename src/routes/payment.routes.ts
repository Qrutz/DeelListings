import express, { Request, Response } from 'express';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia"
});

const router = express.Router();

export async function createPaymentIntent(amount: number, currency = 'usd') {
    // amount is in the smallest currency unit, e.g. 5000 = $50.00
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      // optional: "description", "metadata", etc.
    });
    return paymentIntent;
  }

// routes/payment.js
router.post('/create-payment-intent', async (req, res): Promise<any> => {
    try {
      const { amount } = req.body; // e.g. 5000 for $50
      const paymentIntent = await createPaymentIntent(amount, 'usd');
      return res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create PaymentIntent' });
    }
  });
  


export default router;
