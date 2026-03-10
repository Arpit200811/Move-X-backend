import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { GroupOrder } from '../models/GroupOrder';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../config/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

export const createGroupOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Initializing repos
        const grpRepo = AppDataSource.getRepository(GroupOrder);
        const userRepo = AppDataSource.getRepository(User);
        
        // Grab the host user
        const user = await userRepo.findOne({ where: { _id: req.user?.id } });
        if (!user) {
            return res.status(404).json({ success: false, message: "Couldn't find your account. Are you logged in?" });
        }

        // Generate a punchy 6-char invite code. 
        // Probability of collision is low for demo, but worth a check in production.
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const groupOrder = grpRepo.create({
            inviteCode,
            creator: user,
            status: 'OPEN',
            members: [{ 
                userId: user._id, 
                name: user.name, 
                avatar: user.avatar, 
                joinedAt: new Date() 
            }],
            cart: [],
            totalAmount: 0,
            splitMethod: 'pay_individual'
        });

        await grpRepo.save(groupOrder);
        
        // Return the fresh group session
        res.status(201).json({ success: true, groupOrder });
    } catch (error: any) {
        console.error('Group Creation Failed:', error.message);
        res.status(500).json({ success: false, message: 'Wait, something went wrong while creating the group. Try again?' });
        res.status(500).json({ success: false, message: 'Failed to create group order due to a server error. Please try again.' });
    }
};

// TODO: Consider rate-limiting group creation to prevent abuse.
// NOTE: Concurrency: If multiple users try to create a group at the exact same millisecond, there's a tiny chance of invite code collision. For a demo, this is acceptable.

export const joinGroupOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { inviteCode } = req.body;
        const grpRepo = AppDataSource.getRepository(GroupOrder);
        const userRepo = AppDataSource.getRepository(User);
        
        if (!inviteCode) {
            return res.status(400).json({ success: false, message: "Type in the invite code first!" });
        }

        const grp = await grpRepo.findOne({ where: { inviteCode, status: 'OPEN' } });
        if (!grp) {
            return res.status(404).json({ success: false, message: "That group code doesn't look right, or the order is already locked." });
        }

        const user = await userRepo.findOne({ where: { _id: req.user?.id } });
        if (!user) return res.status(404).json({ success: false, message: 'User session expired. Refresh and try again.' });

        // Don't add if they're already in there (avoiding double-join noise)
        const isMember = grp.members.some((m: any) => m.userId === user._id);
        if (!isMember) {
            grp.members.push({ 
                userId: user._id, 
                name: user.name, 
                avatar: user.avatar, 
                joinedAt: new Date() 
            });
            await grpRepo.save(grp);
        }

        res.status(200).json({ success: true, group: grp });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Network hiccup while joining. Try again in a sec.' });
    }
};

export const addItemToGroupCart = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { item } = req.body; 
        
        const grpRepo = AppDataSource.getRepository(GroupOrder);
        const grp = await grpRepo.findOne({ where: { _id: groupId as string } });

        if (!grp) {
            return res.status(404).json({ success: false, message: "Whoops, this group doesn't exist anymore." });
        }

        if (grp.status !== 'OPEN') {
            return res.status(403).json({ success: false, message: "Too late! The host has already locked the cart." });
        }

        const cartItem = {
            ...item,
            addedBy: req.user?.id,
            uniqueKey: uuidv4(), // Using UUID to prevent key collisions in React
            timestamp: new Date()
        };

        grp.cart = grp.cart || [];
        grp.cart.push(cartItem);
        
        // Recalculating the total on the fly
        grp.totalAmount = grp.cart.reduce((sum: number, i: any) => sum + (i.price * (i.quantity || 1)), 0);

        await grpRepo.save(grp);
        
        // Broadcast the update so everyone's cart refreshes instantly
        if (req.io) {
            req.io.to(`group_${groupId}`).emit('group_cart_updated', { 
                cart: grp.cart, 
                total: grp.totalAmount 
            });
        }

        res.status(200).json({ success: true, group: grp });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to add item. Maybe check your connection?' });
    }
};

// TODO: Implement "Lock Group" logic for the host
// NOTE: We should probably add a limit to how many items can be in a group cart to avoid payload issues.
