import express from 'express';

import cors from 'cors';
import { useClerkMiddleware } from './middleware/clerk.middleware';
import listingsRoutes from './routes/listings.routes';
import sasRoutes from './routes/sas.routes';
import chatRoutes from './routes/chats.routes';
import buildingRoutes from './routes/buildings.routes';
import userRoutes from './routes/user.routes';
import { clerkMiddleware, requireAuth } from '@clerk/express';

const app = express();

app.use(useClerkMiddleware());
// Pass options
app.use(clerkMiddleware());
app.use(cors({ origin: 'http://localhost:8081' }));
app.use(express.json());



app.use('/user', userRoutes);
app.use('/listings',requireAuth(), listingsRoutes);
app.use('/buildings', buildingRoutes); 
app.use('/chats', chatRoutes);
app.use('/sas', sasRoutes);


app.get('/', (req, res) => {
    res.send('Hello World');
});

export default app;
