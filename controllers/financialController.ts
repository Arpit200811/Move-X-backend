import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../config/authMiddleware';
const { Parser } = require('json2csv');

export const getFinancialSummary = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const txs = await transactionRepository.find();
        
        let totalRevenue = 0;
        let totalTax = 0;
        let totalDriverPayouts = 0;
        let platformCommission = 0;
        
        txs.forEach(tx => {
            if (tx.type === 'EARNING') {
                totalDriverPayouts += tx.amount;
                platformCommission += (tx.amount * 0.25);
                totalTax += (tx.amount * 0.10);
                totalRevenue += (tx.amount * 1.35);
            }
        });

        res.status(200).json({
            success: true,
            summary: {
                revenue: totalRevenue.toFixed(2),
                tax: totalTax.toFixed(2),
                payouts: totalDriverPayouts.toFixed(2),
                commission: platformCommission.toFixed(2),
                transactionCount: txs.length
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getFinancialTrends = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const txs = await transactionRepository.find({ 
            order: { createdAt: 'ASC' }
        });

        const trends: Record<string, any> = {};
        txs.forEach(tx => {
            const date = new Date(tx.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
            if (!trends[date]) {
                trends[date] = { name: date, revenue: 0, commission: 0, tax: 0 };
            }
            if (tx.type === 'EARNING') {
                trends[date].revenue += (tx.amount * 1.35);
                trends[date].commission += (tx.amount * 0.25);
                trends[date].tax += (tx.amount * 0.10);
            }
        });

        res.status(200).json({
            success: true,
            trends: Object.values(trends)
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getPayoutRequests = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const requests = await transactionRepository.find({
            where: { type: 'PAYOUT', status: 'PENDING' },
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
        res.status(200).json({ success: true, requests });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const processPayout = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const userRepository = AppDataSource.getRepository(User);
        const { txId, action } = req.body; 
        
        const tx = await transactionRepository.findOne({ where: { _id: txId as string }, relations: ['user'] });
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction node lost.' });
        if (tx.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Transaction already sealed.' });

        if (action === 'approve') {
            tx.status = 'COMPLETED';
            tx.description = 'Payout sanctioned and transmitted to external bank.';
            await transactionRepository.save(tx);
        } else {
            tx.status = 'FAILED';
            tx.description = 'Payout rejected. Funds reverted to internal vault.';
            const user = await userRepository.findOne({ where: { _id: tx.userId } });
            if (user) {
                user.walletBalance += Math.abs(tx.amount);
                await userRepository.save(user);
            }
            await transactionRepository.save(tx);
        }

        res.status(200).json({ success: true, message: `Payout protocol ${action}d successfully.` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getLedger = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const txs = await transactionRepository.find({
            relations: ['user', 'order'],
            order: { createdAt: 'DESC' },
            take: 50
        });
        res.status(200).json({ success: true, ledger: txs });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const txs = await transactionRepository.find({
            where: { userId: req.user?.id },
            order: { createdAt: 'DESC' },
            take: 50
        });
        res.status(200).json({ success: true, transactions: txs });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const requestPayout = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { amount } = req.body;
        const userRepository = AppDataSource.getRepository(User);
        const transactionRepository = AppDataSource.getRepository(Transaction);
        
        const user = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        // Operational Threshold Guard ($50)
        const MIN_THRESHOLD = 50;
        if (amount < MIN_THRESHOLD) {
            return res.status(400).json({ success: false, message: `Minimum Payout request is $${MIN_THRESHOLD}` });
        }

        if (!user.walletBalance || user.walletBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient funds in wallet.' });
        }

        if (!user.payoutDetails) {
            return res.status(400).json({ success: false, message: 'Verification Required: Payout credentials missing.' });
        }

        // Deduct balance
        user.walletBalance -= amount;
        await userRepository.save(user);

        // Create payout transaction
        const tx = transactionRepository.create({
            userId: user._id,
            amount: -Math.abs(amount),
            type: 'PAYOUT',
            status: 'PENDING',
            description: `Payout request for $${amount}`
        });
        await transactionRepository.save(tx);

        res.status(200).json({ success: true, message: 'Payout request initiated.', transaction: tx });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const exportAuditReport = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const txs = await transactionRepository.find({ relations: ['user', 'order'] });

        const reportData = txs.map(t => ({
            'TX ID': t._id,
            'Date': new Date(t.createdAt).toLocaleString(),
            'Agent/Entity': t.user?.name || 'N/A',
            'Mission ID': t.order?.orderId || 'N/A',
            'Type': t.type,
            'Amount ($)': t.amount.toFixed(2),
            'Status': t.status,
            'Context': t.description
        }));

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(reportData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`MoveX_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const topUpWallet = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { amount, method } = req.body;
        const userRepository = AppDataSource.getRepository(User);
        const transactionRepository = AppDataSource.getRepository(Transaction);
        
        const user = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        const topUpAmount = parseFloat(amount);
        if (isNaN(topUpAmount) || topUpAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        user.walletBalance = (user.walletBalance || 0) + topUpAmount;
        await userRepository.save(user);

        const tx = transactionRepository.create({
            userId: user._id,
            amount: topUpAmount,
            type: 'TOPUP',
            status: 'COMPLETED',
            description: `Wallet top-up via ${method || 'External Payment'}`
        });
        await transactionRepository.save(tx);

        res.status(200).json({ success: true, balance: user.walletBalance, transaction: tx });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
