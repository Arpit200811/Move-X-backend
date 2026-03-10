import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Refund } from '../models/Refund';
import { Order } from '../models/Order';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

export const getRefunds = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Refund);
        const refunds = await repo.find({
            relations: ['order', 'user'],
            order: { createdAt: 'DESC' }
        });
        res.status(200).json({ success: true, refunds });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const procesRefund = async (req: Request, res: Response) => {
    try {
        const { refundId, action } = req.body; // 'APPROVE' or 'REJECT'
        const refundRepo = AppDataSource.getRepository(Refund);
        const orderRepo = AppDataSource.getRepository(Order);
        const txRepo = AppDataSource.getRepository(Transaction);
        const userRepo = AppDataSource.getRepository(User);

        const refund = await refundRepo.findOne({ where: { _id: refundId } });
        if (!refund) return res.status(404).json({ success: false, message: 'Refund request not found' });

        if (action === 'APPROVE') {
            refund.status = 'COMPLETED';
            
            // Add balance back to user wallet if applicable
            const user = await userRepo.findOne({ where: { _id: refund.customerId } });
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + refund.refundAmount;
                await userRepo.save(user);

                // Create transaction
                const tx = txRepo.create({
                    userId: user._id,
                    amount: refund.refundAmount,
                    type: 'REFUND',
                    status: 'COMPLETED',
                    description: `Refund for order #${refund.orderId}`
                });
                await txRepo.save(tx);
            }
        } else {
            refund.status = 'REJECTED';
        }

        await refundRepo.save(refund);
        res.status(200).json({ success: true, refund });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
