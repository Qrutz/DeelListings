import express, { Request, Response } from 'express';
import { AuthObject, clerkClient, ExpressRequestWithAuth, requireAuth } from '@clerk/express';
import { prisma } from '../../prisma/client';


const router = express.Router();

// get student housing by city
router.get('/', async (req, res) => {
    const { city } = req.query;
    try {
        const housing = await prisma.studenthousing.findMany({
            where: {
                city: {
                    name: String(city),
                },
            },
        });
        res.json(housing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch student housing' });
    }
});


export default router;
