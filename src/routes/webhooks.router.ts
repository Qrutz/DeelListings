import express, { Request, Response } from 'express';
import { generateSasUrl } from '../utils/azure.utils';
import { AuthObject, ExpressRequestWithAuth, requireAuth } from '@clerk/express';
import { prisma } from '../../prisma/client';
import bodyParser from 'body-parser';
import { Webhook } from 'svix';
const router = express.Router()

// Map email domains to universities
const domainToUniversity = {
    'student.gu.se': 'Gothenburg University',
    'chalmers.se': 'Chalmers University',
    'liu.se': 'Linköping University',
    'kth.se': 'KTH Royal Institute of Technology',
};

router.post(
    '/',
    bodyParser.raw({ type: 'application/json' }),
    async (req, res): Promise<any> => {
      const SIGNING_SECRET = process.env.SIGNING_SECRET
  
      if (!SIGNING_SECRET) {
        throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env')
      }
  
      const wh = new Webhook(SIGNING_SECRET)
      const headers = req.headers
      const payload = req.body
  
      const svix_id = headers['svix-id']
      const svix_timestamp = headers['svix-timestamp']
      const svix_signature = headers['svix-signature']
  
      if (!svix_id || !svix_timestamp || !svix_signature) {
        return void res.status(400).json({
          success: false,
          message: 'Error: Missing svix headers',
        })
      }
  
      let evt: any
  
      try {
        evt = wh.verify(payload, {
          'svix-id': svix_id as string,
          'svix-timestamp': svix_timestamp as string,
          'svix-signature': svix_signature as string,
        })
      } catch (err) {
        if (err instanceof Error) {
          console.log('Error: Could not verify webhook:', err.message)
          return void res.status(400).json({
            success: false,
            message: err.message,
          })
        } else {
          console.log('Error: Could not verify webhook:', err)
          return void res.status(400).json({
            success: false,
            message: 'Unknown error',
          })
        }
      }
  
      const { id } = evt.data
      const eventType = evt.type
      console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
      console.log('Webhook payload:', evt.data)

      if (eventType === 'user.created') {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { id: evt.data.id },
            });
    
            if (!existingUser) {
                const email = evt.data.email_addresses[0]?.email_address || '';
                const domain = email.split('@')[1]; // Extract domain
                // @ts-ignore fff
                const universityName = domainToUniversity[domain];

                let university = null;
                if (universityName) {
                    university = await prisma.university.findFirst({
                        where: { name: universityName },
                    });

                    if (!university) {
                        university = await prisma.university.create({
                            data: { name: universityName },
                        });
                    }
                }

                const user = await prisma.user.create({
                    data: {
                        id: evt.data.id,
                        email,
                        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(),
                        phoneNumber: evt.data.phone_numbers[0]?.phone_number || null,
                        profileImageUrl: evt.data.image_url || '',
                        balance: 0,
                        universityId: university ? university.id : null, // Link university if available
                    },
                });
                console.log('User created:', user);
            } else {
                console.log('User already exists:', existingUser);
            }
        } catch (err) {
            console.error('Error saving user to database:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to save user',
            });
        }
    }
      
      return void res.status(200).json({
        success: true,
        message: 'Webhook received',
      })
    },
)

export default router;
