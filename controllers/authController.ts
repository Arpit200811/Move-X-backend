import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Partner } from '../models/Partner';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../config/authMiddleware';

export const loginOrSignup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
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
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid password.' });
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
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid password.' });
      }
      user.isOnline = true;
      user.status = 'available';
      await userRepository.save(user);
    }
    // PARTNER: Must exist and have correct role
    else if (role === 'partner') {
      if (!user) {
        return res.status(401).json({ success: false, message: 'Merchant account not found. Please register your business first.' });
      }
      if (user.role !== 'partner') {
        return res.status(403).json({ success: false, message: `Access Denied: This account is registered as a ${user.role}, not a merchant.` });
      }
      if (user.passwordHash && password) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ success: false, message: 'Identity check failed: Invalid password.' });
      }
      user.isOnline = true;
      user.status = 'active';
      await userRepository.save(user);
    }
    // CUSTOMER: Auto-create if not exists
    else {
      if (!user) {
        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
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
      } else if (user.passwordHash && password) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid password.' });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.status(200).json({ success: true, user, token });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, role } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: userId as any } });
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (status) user.status = status;
    if (role) user.role = role;
    
    await userRepository.save(user);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const driverApply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const { phone, name, vehicle, licenseNumber, kycLicenseUrl, kycIdUrl } = req.body;

    console.log(`[DRIVE-APPLY] Received application for ${phone}`, { name, vehicle });

    if (!phone || !name || !vehicle) {
        return res.status(400).json({ success: false, message: 'Missing mandatory fields: phone, name, and vehicle are required.' });
    }

    let user = await userRepository.findOne({ where: { phone } });
    if (user) {
      if (user.role === 'driver') {
        if (user.status === 'pending') {
          // UPDATE pending application instead of blocking
          user.name = name || user.name;
          user.vehicle = vehicle;
          user.licenseNumber = licenseNumber || '';
          user.kycLicenseUrl = kycLicenseUrl || null;
          user.kycIdUrl = kycIdUrl || null;
          await userRepository.save(user);
          return res.status(200).json({ success: true, message: 'Application details updated! Still awaiting approval.' });
        }
        if (user.status === 'rejected') {
          return res.status(400).json({ success: false, message: 'Your previous application was rejected. Please contact support to re-apply.' });
        }
        return res.status(400).json({ success: false, message: 'This phone number is already registered as a driver. Try logging in instead.' });
      }
      
      if (user.role === 'partner') {
        return res.status(400).json({ success: false, message: 'This phone number is registered to a partner account. Business accounts cannot be drivers currently.' });
      }

      // Upgrade existing customer to driver applicant
      user.name = name || user.name;
      user.role = 'driver';
      user.vehicle = vehicle;
      user.licenseNumber = licenseNumber || '';
      user.kycLicenseUrl = kycLicenseUrl || null;
      user.kycIdUrl = kycIdUrl || null;
      user.status = 'pending';
    } else {
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
  } catch (error: any) {
    console.error('[DRIVE-APPLY ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveDriver = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const { driverId } = req.params;
    const { action, reason } = req.body;

    const driver = await userRepository.findOne({ where: { _id: driverId as string } });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.status = action === 'approve' ? 'offline' : 'rejected';
    await userRepository.save(driver);

    const { sendNotification } = await import('../services/notificationService');
    if (action === 'approve') {
      sendNotification(driver._id, 'KYC_APPROVED', {});
    } else {
      sendNotification(driver._id, 'KYC_REJECTED', { reason: reason || 'Documents unclear' });
    }

    req.io.emit('driver_status_updated');
    res.status(200).json({ success: true, driver });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const partnerRepository = AppDataSource.getRepository(Partner);
    
    const user = await userRepository.findOne({ where: { _id: req.user?.id } }) as any;
    if (user && user.role === 'partner') {
      const partner = await partnerRepository.findOne({ where: { owner: { _id: user._id } } });
      if (partner) user.partner = partner;
    }
    
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find();
    res.status(200).json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyOtp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Note: OTP logic might need 'otpCode' column in User.ts if missing.
    // I'll assume it exists or add it.
    const userRepository = AppDataSource.getRepository(User);
    const { phone, otp } = req.body;

    const user = await userRepository.findOne({ where: { phone } }) as any;

    if (!user?.otpCode) {
      const devMode = process.env.NODE_ENV !== 'production';
      if (devMode && otp === '1234') {
        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET as string,
          { expiresIn: '30d' }
        );
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

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.status(200).json({ success: true, message: 'OTP Verified Successfully', token, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendOtp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const { phone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit

    let user = await userRepository.findOne({ where: { phone } }) as any;
    if (!user) {
      user = userRepository.create({ phone, name: `User_${phone.slice(-4)}`, role: 'customer' });
    }
    user.otpCode = otp;
    await userRepository.save(user);

    console.log(`[DEV OTP] Phone: ${phone} → OTP: ${otp}`);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: req.user?.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { name, avatar, vehicle } = req.body;
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (vehicle) user.vehicle = vehicle;
    await userRepository.save(user);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: req.user?.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.settings = { ...(user.settings || {}), ...req.body };
    await userRepository.save(user);
    res.status(200).json({ success: true, settings: user.settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Consolidated to driverController.ts

export const toggleOnlineStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: req.user?.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isOnline = !user.isOnline;
    user.status = user.isOnline ? 'available' : 'offline';
    await userRepository.save(user);
    req.io.emit('driver_status_changed', { driverId: req.user?.id, isOnline: user.isOnline, status: user.status });
    res.status(200).json({ success: true, isOnline: user.isOnline, status: user.status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const savePushToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    if (!req.user?.id) return res.status(401).json({ success: false });
    await userRepository.update(req.user.id, { pushToken: token });
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const partnerApply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const partnerRepository = AppDataSource.getRepository(Partner);
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
    } else {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const createUserAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, name, role, password } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    
    const existing = await userRepository.findOne({ where: { phone } });
    if (existing) return res.status(400).json({ success: false, message: 'Node already registered.' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const user = userRepository.create({
        phone,
        name,
        role: role || 'customer',
        passwordHash,
        status: (role === 'admin' || role === 'partner') ? 'active' : 'online',
        isOnline: false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
        phoneVerified: true
    });

    await userRepository.save(user);
    res.status(201).json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
