import express, { Request, Response } from 'express';
import { generateSasUrl } from '../utils/azure.utils';
import { AuthObject, ExpressRequestWithAuth, requireAuth } from '@clerk/express';
import { prisma } from '../../prisma/client';
import bodyParser from 'body-parser';
import { Webhook } from 'svix';
const router = express.Router()

router.post(
    '/',
    // This is a generic method to parse the contents of the payload.
    // Depending on the framework, packages, and configuration, this may be
    // different or not required.
    bodyParser.raw({ type: 'application/json' }),
  
    async (req, res): Promise<any> => {
      const SIGNING_SECRET = process.env.SIGNING_SECRET
  
      if (!SIGNING_SECRET) {
        throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env')
      }
  
      // Create new Svix instance with secret
      const wh = new Webhook(SIGNING_SECRET)
  
      // Get headers and body
      const headers = req.headers
      const payload = req.body
  
      // Get Svix headers for verification
      const svix_id = headers['svix-id']
      const svix_timestamp = headers['svix-timestamp']
      const svix_signature = headers['svix-signature']
  
      // If there are no headers, error out
      if (!svix_id || !svix_timestamp || !svix_signature) {
        return void res.status(400).json({
          success: false,
          message: 'Error: Missing svix headers',
        })
      }
  
      let evt: any
  
      // Attempt to verify the incoming webhook
      // If successful, the payload will be available from 'evt'
      // If verification fails, error out and return error code
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
  
      // Do something with payload
      // For this guide, log payload to console
      const { id } = evt.data
      const eventType = evt.type
      console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
      console.log('Webhook payload:', evt.data)

      if (eventType === 'user.created') {
        try {
            // Check if user already exists to avoid duplicates
            const existingUser = await prisma.user.findUnique({
                where: { id: evt.data.id },
            });
    
            if (!existingUser) {
                // Save user to database
                const user = await prisma.user.create({
                    data: {
                        id: evt.data.id, // Clerk user ID
                        email: evt.data.email_addresses[0]?.email_address || '', // Primary email address
                        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(), // Full name
                        phoneNumber: evt.data.phone_numbers[0]?.phone_number || null, // Optional phone
                        profileImageUrl: evt.data.image_url || '', // Profile image URL
                        balance: 0, // Default balance for new user
                        buildingId: 1, // Default building ID for new user
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