"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addItemToGroupCart = exports.joinGroupOrder = exports.createGroupOrder = void 0;
const data_source_1 = require("../data-source");
const GroupOrder_1 = require("../models/GroupOrder");
const User_1 = require("../models/User");
const uuid_1 = require("uuid");
const createGroupOrder = async (req, res) => {
    try {
        // Initializing repos
        const grpRepo = data_source_1.AppDataSource.getRepository(GroupOrder_1.GroupOrder);
        const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
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
    }
    catch (error) {
        console.error('Group Creation Failed:', error.message);
        res.status(500).json({ success: false, message: 'Wait, something went wrong while creating the group. Try again?' });
        res.status(500).json({ success: false, message: 'Failed to create group order due to a server error. Please try again.' });
    }
};
exports.createGroupOrder = createGroupOrder;
// TODO: Consider rate-limiting group creation to prevent abuse.
// NOTE: Concurrency: If multiple users try to create a group at the exact same millisecond, there's a tiny chance of invite code collision. For a demo, this is acceptable.
const joinGroupOrder = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const grpRepo = data_source_1.AppDataSource.getRepository(GroupOrder_1.GroupOrder);
        const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        if (!inviteCode) {
            return res.status(400).json({ success: false, message: "Type in the invite code first!" });
        }
        const grp = await grpRepo.findOne({ where: { inviteCode, status: 'OPEN' } });
        if (!grp) {
            return res.status(404).json({ success: false, message: "That group code doesn't look right, or the order is already locked." });
        }
        const user = await userRepo.findOne({ where: { _id: req.user?.id } });
        if (!user)
            return res.status(404).json({ success: false, message: 'User session expired. Refresh and try again.' });
        // Don't add if they're already in there (avoiding double-join noise)
        const isMember = grp.members.some((m) => m.userId === user._id);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Network hiccup while joining. Try again in a sec.' });
    }
};
exports.joinGroupOrder = joinGroupOrder;
const addItemToGroupCart = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { item } = req.body;
        const grpRepo = data_source_1.AppDataSource.getRepository(GroupOrder_1.GroupOrder);
        const grp = await grpRepo.findOne({ where: { _id: groupId } });
        if (!grp) {
            return res.status(404).json({ success: false, message: "Whoops, this group doesn't exist anymore." });
        }
        if (grp.status !== 'OPEN') {
            return res.status(403).json({ success: false, message: "Too late! The host has already locked the cart." });
        }
        const cartItem = {
            ...item,
            addedBy: req.user?.id,
            uniqueKey: (0, uuid_1.v4)(), // Using UUID to prevent key collisions in React
            timestamp: new Date()
        };
        grp.cart = grp.cart || [];
        grp.cart.push(cartItem);
        // Recalculating the total on the fly
        grp.totalAmount = grp.cart.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
        await grpRepo.save(grp);
        // Broadcast the update so everyone's cart refreshes instantly
        if (req.io) {
            req.io.to(`group_${groupId}`).emit('group_cart_updated', {
                cart: grp.cart,
                total: grp.totalAmount
            });
        }
        res.status(200).json({ success: true, group: grp });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add item. Maybe check your connection?' });
    }
};
exports.addItemToGroupCart = addItemToGroupCart;
// TODO: Implement "Lock Group" logic for the host
// NOTE: We should probably add a limit to how many items can be in a group cart to avoid payload issues.
//# sourceMappingURL=groupOrderController.js.map