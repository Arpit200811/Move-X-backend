import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest } from '../config/authMiddleware';
import { User } from '../models/User';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    const notifications = await notificationRepository.find({ 
      where: { userId: { _id: req.user?.id as string } as any },
      order: { createdAt: 'DESC' },
      take: 10
    });
    res.status(200).json({ success: true, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    const { id } = req.params;
    
    if (id === 'all') {
      await notificationRepository.update({ userId: { _id: req.user?.id as string } as any }, { isRead: true });
    } else {
      await notificationRepository.update({ _id: id as string, userId: { _id: req.user?.id as string } as any }, { isRead: true });
    }

    res.status(200).json({ success: true, message: 'Marked read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
