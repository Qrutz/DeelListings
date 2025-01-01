import express from 'express';
import cors from 'cors';
import { useClerkMiddleware } from './middleware/clerk.middleware';
import listingsRoutes from './routes/listings.routes';
import sasRoutes from './routes/sas.routes';
import chatRoutes from './routes/chats.routes';
import buildingRoutes from './routes/buildings.routes';

const app = express();

app.use(useClerkMiddleware());
app.use(cors({ origin: 'http://localhost:8081' }));
app.use(express.json());

app.use('/listings', listingsRoutes);
app.use('/buildings', buildingRoutes); 
app.use('/chats', chatRoutes);
app.use('/sas', sasRoutes);


app.get('/', (req, res) => {
    res.send('Hello World');
});

export default app;
