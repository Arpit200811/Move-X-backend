"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.partnerApply = exports.savePushToken = exports.toggleOnlineStatus = exports.updateSettings = exports.updateProfile = exports.sendOtp = exports.verifyOtp = exports.getAllUsers = exports.getMe = exports.registerUser = exports.approveDriver = exports.driverApply = exports.loginOrSignup = void 0;
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const Partner_1 = require("../models/Partner");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const loginOrSignup = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const { phone, name, role, password } = req.body;
        let user = await userRepository.findOne({ where: { phone } });
        // ADMIN LOGIN: Must exist in DB with role='admin'
        if (role === 'admin') {
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin account not found. Contact system administrator.'
                });
            }
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This number is not registered as an admin.'
                });
            }
            // Password check (if admin has password set)
            if (user.passwordHash && password) {
                const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
                if (!valid)
                    return res.status(401).json({ success: false, message: 'Invalid password.' });
            }
            user.isOnline = true;
            user.status = 'online';
            await userRepository.save(user);
        }
        // DRIVER: Must be pre-registered and approved
        else if (role === 'driver') {
            if (!user || user.role !== 'driver') {
                return res.status(401).json({ success: false, message: 'Driver not registered. Please apply via the app.' });
            }
            if (user.status === 'pending') {
                return res.status(403).json({ success: false, message: 'Your application is under review.' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ success: false, message: 'Your application was rejected. Contact support.' });
            }
            // Password check
            if (user.passwordHash && password) {
                const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
                if (!valid)
                    return res.status(401).json({ success: false, message: 'Invalid password.' });
            }
            user.isOnline = true;
            user.status = 'available';
            await userRepository.save(user);
        }
        // PARTNER: Must exist and have correct role
        else if (role === 'partner') {
            if (!user || user.role !== 'partner') {
                return res.status(401).json({ success: false, message: 'Merchant account not found. Ensure registration is complete.' });
            }
            if (user.passwordHash && password) {
                const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
                if (!valid)
                    return res.status(401).json({ success: false, message: 'Identity check failed: Invalid password.' });
            }
            user.isOnline = true;
            user.status = 'active';
            await userRepository.save(user);
        }
        // CUSTOMER: Auto-create if not exists
        else {
            if (!user) {
                const passwordHash = password ? await bcryptjs_1.default.hash(password, 10) : undefined;
                const newUser = userRepository.create({
                    phone,
                    name: name && !name.includes('@') ? name : `User_${phone.slice(-4)}`,
                    role: 'customer',
                    passwordHash,
                    avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${phone}`,
                    status: 'online',
                    isOnline: true
                });
                user = await userRepository.save(newUser);
            }
            else if (user.passwordHash && password) {
                const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
                if (!valid)
                    return res.status(401).json({ success: false, message: 'Invalid password.' });
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({ success: true, user, token });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.loginOrSignup = loginOrSignup;
const driverApply = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const { phone, name, vehicle, licenseNumber, kycLicenseUrl, kycIdUrl } = req.body;
        let user = await userRepository.findOne({ where: { phone } });
        if (user) {
            if (user.role === 'driver' || user.role === 'partner') {
                return res.status(400).json({ success: false, message: 'This phone number is already registered.' });
            }
            // If customer, upgrade them to driver application
            user.name = name || user.name;
            user.role = 'driver';
            user.vehicle = vehicle;
            user.licenseNumber = licenseNumber || '';
            user.kycLicenseUrl = kycLicenseUrl || null;
            user.kycIdUrl = kycIdUrl || null;
            user.status = 'pending';
        }
        else {
            user = userRepository.create({
                phone,
                name,
                role: 'driver',
                vehicle,
                licenseNumber: licenseNumber || '',
                kycLicenseUrl: kycLicenseUrl || null,
                kycIdUrl: kycIdUrl || null,
                avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${phone}`,
                status: 'pending',
                isOnline: false
            });
        }
        await userRepository.save(user);
        res.status(201).json({ success: true, message: 'Application submitted! Awaiting admin approval.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.driverApply = driverApply;
const approveDriver = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const { driverId } = req.params;
        const { action, reason } = req.body;
        const driver = await userRepository.findOne({ where: { _id: driverId } });
        if (!driver)
            return res.status(404).json({ success: false, message: 'Driver not found' });
        driver.status = action === 'approve' ? 'offline' : 'rejected';
        await userRepository.save(driver);
        const { sendNotification } = await Promise.resolve().then(() => __importStar(require('../services/notificationService')));
        if (action === 'approve') {
            sendNotification(driver._id, 'KYC_APPROVED', {});
        }
        else {
            sendNotification(driver._id, 'KYC_REJECTED', { reason: reason || 'Documents unclear' });
        }
        req.io.emit('driver_status_updated');
        res.status(200).json({ success: true, driver });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveDriver = approveDriver;
const registerUser = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const { phone, name, role, vehicle } = req.body;
        let user = await userRepository.findOne({ where: { phone } });
        if (user) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }
        user = userRepository.create({
            phone,
            name: name || 'New User',
            role: role || 'customer',
            avatar: `https://api.dicebear.com/7.x/avataaars.png?seed=${phone}`,
            vehicle,
            status: role === 'driver' ? 'available' : 'online',
            isOnline: false
        });
        user = await userRepository.save(user);
        req.io.emit('driver_status_updated');
        res.status(201).json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.registerUser = registerUser;
const getMe = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const user = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (user && user.role === 'partner') {
            const partner = await partnerRepository.findOne({ where: { owner: { _id: user._id } } });
            if (partner)
                user.partner = partner;
        }
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMe = getMe;
const getAllUsers = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const users = await userRepository.find();
        res.status(200).json({ success: true, users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllUsers = getAllUsers;
const verifyOtp = async (req, res) => {
    try {
        // Note: OTP logic might need 'otpCode' column in User.ts if missing.
        // I'll assume it exists or add it.
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const { phone, otp } = req.body;
        const user = await userRepository.findOne({ where: { phone } });
        if (!user?.otpCode) {
            const devMode = process.env.NODE_ENV !== 'production';
            if (devMode && otp === '1234') {
                const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
                return res.status(200).json({ success: true, message: 'OTP Verified (dev mode)', token, user });
            }
            return res.status(400).json({ success: false, message: 'OTP expired or not found. Request a new one.' });
        }
        if (user.otpCode !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }
        user.otpCode = null;
        user.phoneVerified = true;
        await userRepository.save(user);
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({ success: true, message: 'OTP Verified Successfully', token, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.verifyOtp = verifyOtp;
const sendOtp = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const { phone } = req.body;
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit
        let user = await userRepository.findOne({ where: { phone } });
        if (!user) {
            user = userRepository.create({ phone, name: `User_${phone.slice(-4)}`, role: 'customer' });
        }
        user.otpCode = otp;
        await userRepository.save(user);
        console.log(`[DEV OTP] Phone: ${phone} → OTP: ${otp}`);
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendOtp = sendOtp;
const updateProfile = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const { name, avatar, vehicle } = req.body;
        if (name)
            user.name = name;
        if (avatar)
            user.avatar = avatar;
        if (vehicle)
            user.vehicle = vehicle;
        await userRepository.save(user);
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProfile = updateProfile;
const updateSettings = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        user.settings = { ...(user.settings || {}), ...req.body };
        await userRepository.save(user);
        res.status(200).json({ success: true, settings: user.settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSettings = updateSettings;
// Consolidated to driverController.ts
const toggleOnlineStatus = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        user.isOnline = !user.isOnline;
        user.status = user.isOnline ? 'available' : 'offline';
        await userRepository.save(user);
        req.io.emit('driver_status_changed', { driverId: req.user?.id, isOnline: user.isOnline, status: user.status });
        res.status(200).json({ success: true, isOnline: user.isOnline, status: user.status });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleOnlineStatus = toggleOnlineStatus;
const savePushToken = async (req, res) => {
    try {
        const { token } = req.body;
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        if (!req.user?.id)
            return res.status(401).json({ success: false });
        await userRepository.update(req.user.id, { pushToken: token });
        res.status(200).json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.savePushToken = savePushToken;
const partnerApply = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const { phone, name, restaurantName, category, email, image } = req.body;
        let user = await userRepository.findOne({ where: { phone } });
        if (user && (user.role === 'partner' || user.role === 'driver')) {
            return res.status(400).json({ success: false, message: 'This phone number is already registered for business.' });
        }
        if (!user) {
            user = userRepository.create({
                phone,
                name,
                role: 'partner',
                avatar: `https://api.dicebear.com/7.x/initials/png?seed=${restaurantName}`,
                status: 'pending'
            });
            await userRepository.save(user);
        }
        else {
            user.role = 'partner';
            user.status = 'pending';
            await userRepository.save(user);
        }
        const partner = partnerRepository.create({
            name: restaurantName,
            category,
            email,
            image: image || `https://api.dicebear.com/7.x/initials/png?seed=${category}`,
            owner: user,
            status: 'Pending Verification',
            autoAccept: true,
            isAcceptingOrders: false
        });
        await partnerRepository.save(partner);
        res.status(201).json({ success: true, message: 'Merchant application submitted! Awaiting movex activation.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.partnerApply = partnerApply;
//# sourceMappingURL=authController.js.map