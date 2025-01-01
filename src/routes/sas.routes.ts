import express, { Request, Response } from 'express';
import { generateSasUrl } from '../utils/azure.utils';

const router = express.Router();

router.post('/generate-sas-url', async (req: Request, res: Response) => {
    try {
        const { fileName } = req.body;
        const sasUrl = await generateSasUrl(fileName);
        res.status(200).json({ sasUrl });
    } catch (error) {
        console.error('Error generating SAS URL:', error);
        res.status(500).json({ error: 'Failed to generate SAS URL' });
    }
});

export default router;
