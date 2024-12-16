// Install TypeScript and necessary dependencies
// npm install typescript ts-node @types/node --save-dev
// npx tsc --init

import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/listings', async (req, res) => {
    try {
        const { title, description, price, latitude, longitude } = req.body;
        const newListing = await prisma.listing.create({
            data: {
                title,
                description,
                price,
                latitude,
                longitude,
            },
        });
        res.status(201).json(newListing);
    } catch (error) {
        res.status(500).json({ error: 'Error creating listing', details: error });
    }
});


// Get all listings
app.get('/listings', async (req, res) => {
    try {
        const listings = await prisma.listing.findMany();
        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listings', details: error });
    }
});

app.get('/listings/proximity', async (req, res) => {
    try {
        const { latitude, longitude, radius } = req.query;

        const listings = await prisma.$queryRaw`
            SELECT *, (
                6371 * acos(
                    cos(radians(${latitude})) *
                    cos(radians(latitude)) *
                    cos(radians(longitude) - radians(${longitude})) +
                    sin(radians(${latitude})) *
                    sin(radians(latitude))
                )
            ) AS distance
            FROM Listing
            HAVING distance <= ${radius}
            ORDER BY distance;
        `;

        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listings by proximity', details: error });
    }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
