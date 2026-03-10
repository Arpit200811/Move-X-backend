"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.getNotifications = void 0;
const data_source_1 = require("../data-source");
const Notification_1 = require("../models/Notification");
const getNotifications = async (req, res) => {
    try {
        const notificationRepository = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
        const notifications = await notificationRepository.find({
            where: { userId: { _id: req.user?.id } },
            order: { createdAt: 'DESC' },
            take: 10
        });
        res.status(200).json({ success: true, notifications });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res) => {
    try {
        const notificationRepository = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
        const { id } = req.params;
        if (id === 'all') {
            await notificationRepository.update({ userId: { _id: req.user?.id } }, { isRead: true });
        }
        else {
            await notificationRepository.update({ _id: id, userId: { _id: req.user?.id } }, { isRead: true });
        }
        res.status(200).json({ success: true, message: 'Marked read' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markRead = markRead;
//# sourceMappingURL=notificationController.js.map