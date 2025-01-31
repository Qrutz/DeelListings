import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const router = express.Router();

// --- Reusable function to create PaymentIntents ---
export async function createPaymentIntent(amount: number, currency = 'usd') {
  // amount is in smallest currency unit, e.g. 5000 = $50.00
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    // optional: "description", "metadata", etc.
  });
  return paymentIntent;
}

// --- Existing route to create a PaymentIntent ---
router.post('/create-payment-intent', async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount } = req.body; // e.g. 5000 for $50
    const paymentIntent = await createPaymentIntent(amount, 'usd');
    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create PaymentIntent' });
  }
});

// --- New route to create/retrieve an Express Connect account for the user ---
router.post('/create-express-account', async (req: Request, res: Response):Promise<any> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 1. Fetch user from your database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Check if user already has a Stripe account
    let stripeAccountId = user.stripeAccountId;

    if (!stripeAccountId) {
      // Create a new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'SE',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: user.name,
          last_name: user.name,
          email: user.email,
        },
          
        // You could pass additional info here, e.g.:
        // email: user.email,
        // country: 'US',
      });

      stripeAccountId = account.id;

      // Save it to your database
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountId,
        },
      });
    }

    // 3. Generate an account onboarding link
    //    This is the link your user will visit to enter bank info, etc.
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: 'https://yourdomain.com/connect/reauth', // or your custom route
      return_url: 'https://yourdomain.com/connect/success', // or deep link
      type:'account_onboarding',
    });

    // 4. Send the link to your frontend, so the user can open it
    return res.json({ url: accountLink.url });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
