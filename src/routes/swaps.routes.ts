import { Router } from 'express';
import express, { Request, Response } from 'express';
import { requireAuth } from '@clerk/express';
import { prisma } from '../../prisma/client';

const router = Router();

/**
 * 1) Propose a new swap
 * Body should contain listingAId, listingBId, recipientId
 */

router.post('/', requireAuth(), async (req: Request, res: Response): Promise<any> => {
    try {
      const { userId: proposerId } = req.auth; // from Clerk's `requireAuth()`
      const { listingAId, listingBId, recipientId, partialCash, pickupTime,note } = req.body;

      // ensure 
      if (!proposerId || !listingAId || !listingBId || !recipientId || !pickupTime) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }
        

  
      // 1) Check if a 1-on-1 chat already exists
      let chat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          members: {
            some: { userId: proposerId },
          },
          AND: {
            members: {
              some: { userId: recipientId },
            },
          },
        },
        include: { members: true },
      });
  
      let isNew = false;
      if (!chat) {
        // Create the 1-on-1 chat
        isNew = true;
        chat = await prisma.chat.create({
          data: {
            isGroup: false,
            members: {
              create: [
                { userId: proposerId },
                { userId: recipientId },
              ],
            },
          },
          include: { members: true },
        });
      }
  
      // 2) Create the Swap in DB
      //    This is basically the same as your existing /swap logic,
      //    but inline here for convenience (or call your own function).
      const newSwap = await prisma.swap.create({
        data: {
          listingAId,
          listingBId,
          proposerId,
          recipientId,
          pickupTime,
          status: 'pending',
          partialCash: partialCash || null,
          note: note || null,
        },
      });
  
      // 3) Create the "swapProposal" message in the chat referencing this swap
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: proposerId,
          type: 'swapProposal',
          swapId: newSwap.id,  // references the newly created Swap
          // put the note in the content field if it exists, else put "Would you like to swap?"
          content: note || 'Would you like to swap?', 
        },
      });
  
      // Return minimal response
      return res.status(200).json({
        chatId: chat.id,
        swapId: newSwap.id,
        isNew,
      });
    } catch (error) {
      console.error('Error starting swap:', error);
      return res.status(500).json({ error: 'Failed to start swap.' });
    }
  });

  router.get('/me', requireAuth(), async (req, res):Promise<any> => {
    try {
      const { userId } = req.auth;
      const { status } = req.query; // e.g. "accepted", "inProgress", etc.
  
      const swaps = await prisma.swap.findMany({
        where: {
          OR: [
            { proposerId: userId as string },
            { recipientId: userId as string },
          ],
          status: status as string || undefined, // if no status, return all
        },
        include: {
          listingA: true,
          listingB: true,
        },
      });
  
      return res.json(swaps);
    } catch (error) {
      console.error('Error fetching user swaps:', error);
      return res.status(500).json({ error: 'Failed to fetch user swaps.' });
    }
  });


  // POST /swap/:swapId/generateCode
router.post('/:swapId/generateCode', requireAuth(), async (req, res): Promise<any> => {
  try {
    const { userId } = req.auth;
    const { swapId } = req.params;

    const swap = await prisma.swap.findUnique({ where: { id: swapId } });
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found.' });
    }

    // Only the *recipient* can generate the code if the swap is in accepted status
    if (swap.recipientId !== userId) {
      return res.status(403).json({ error: 'You are not the recipient of this swap.' });
    }
    if (swap.status !== 'accepted') {
      return res.status(400).json({ error: 'Swap must be accepted before generating code.' });
    }

    // Generate a random code or token
    const code = Math.random().toString(36).substring(2, 10).toUpperCase(); 
    // e.g. "3KR9C08N"

    // Save it in the swap
    const updatedSwap = await prisma.swap.update({
      where: { id: swapId },
      data: {
        confirmationCode: code,
        status: 'inProgress', 
      },
    });

    return res.json({ swapId, code: updatedSwap.confirmationCode });
  } catch (error) {
    console.error('Error generating code:', error);
    return res.status(500).json({ error: 'Failed to generate code.' });
  }
});

// POST /swap/:swapId/complete
router.post('/:swapId/complete', requireAuth(), async (req, res): Promise<any> => {
  try {
    const { userId } = req.auth;
    const { swapId } = req.params;
    const { code } = req.body; // from scanning

    const swap = await prisma.swap.findUnique({ where: { id: swapId } });
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found.' });
    }

    // Only the *proposer* can complete the swap with the scanned code
    if (swap.proposerId !== userId) {
      return res.status(403).json({ error: 'You are not the proposer of this swap.' });
    }

    // Must be in 'inProgress' or 'accepted' to finalize
    if (swap.status !== 'inProgress') {
      return res.status(400).json({ error: 'Swap must be in progress to complete.' });
    }

    // Check the code
    if (!swap.confirmationCode || swap.confirmationCode !== code) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    // Mark swap as completed
    const updatedSwap = await prisma.swap.update({
      where: { id: swapId },
      data: {
        status: 'completed',
        confirmationCode: null, // optionally clear it
      },
    });

    // Optionally, mark listings as swapped or finalize them
    // await prisma.listing.update({ where: { id: swap.listingAId }, data: { status: 'SWAPPED' } });
    // await prisma.listing.update({ where: { id: swap.listingBId }, data: { status: 'SWAPPED' } });

    return res.json({ message: 'Swap completed!', swap: updatedSwap });
  } catch (error) {
    console.error('Error completing swap:', error);
    return res.status(500).json({ error: 'Failed to complete swap.' });
  }
});


  



export default router;
