import express from 'express';

import cors from 'cors';
import { useClerkMiddleware } from './middleware/clerk.middleware';
import listingsRoutes from './routes/listings.routes';
import sasRoutes from './routes/sas.routes';
import chatRoutes from './routes/chats.routes';
import buildingRoutes from './routes/buildings.routes';
import userRoutes from './routes/user.routes';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import Webhookrouter from './routes/webhooks.router';
import studenthousingRoutes from './routes/studenthousing.router';
import swapRoutes from './routes/swaps.routes';
import paymentRotuer from './routes/payment.routes';

const app = express();

app.use(useClerkMiddleware());
// Pass options
app.use(clerkMiddleware());
app.use(cors({ origin: 'http://localhost:8081' }));


// Webhook to capture events from Clerk API
app.use('/api/webhook', Webhookrouter);

app.use(express.json());



app.use('/user', userRoutes);
app.use('/listings', listingsRoutes);
app.use('/buildings', buildingRoutes); 
app.use('/chats', chatRoutes);
app.use('/sas', sasRoutes);
app.use('/swap', swapRoutes);
app.use('/payment', paymentRotuer);
app.use('/studenthousing',studenthousingRoutes)


app.get('/', (req, res) => {
    res.send('Hello World');
});

export default app;
