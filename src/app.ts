import express from 'express';
import cors from 'cors';
import { useClerkMiddleware } from './middleware/clerk.middleware';
import listingsRoutes from './routes/listings.routes';
import sasRoutes from './routes/sas.routes';

const app = express();

app.use(useClerkMiddleware());
app.use(cors({ origin: 'http://localhost:8081' }));
app.use(express.json());

app.use('/listings', listingsRoutes);
app.use('/sas', sasRoutes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

export default app;
