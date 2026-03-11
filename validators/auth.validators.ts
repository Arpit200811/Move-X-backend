import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters').regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    name: z.string().optional(),
    role: z.enum(['customer', 'driver', 'partner', 'admin']).optional(),
    password: z.string().optional()
  })
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters').regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  })
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    otp: z.string().length(4, 'OTP must be exactly 4 digits').regex(/^\d+$/, 'OTP must be numeric')
  })
});

export const driverApplySchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    vehicle: z.string().min(2, 'Vehicle info is required'),
    licenseNumber: z.string().optional(),
    kycLicenseUrl: z.string().url('Invalid URL format for license image').optional().nullable(),
    kycIdUrl: z.string().url('Invalid URL format for ID image').optional().nullable(),
  })
});

export const partnerApplySchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    name: z.string().min(2, 'Owner name is required'),
    restaurantName: z.string().min(2, 'Business name is required'),
    category: z.string().min(2, 'Category is required'),
    email: z.string().email('Invalid email address').optional().nullable(),
    image: z.string().url('Invalid URL format for image').optional().nullable(),
  })
});

export const createUserSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    name: z.string().min(2, 'Name is required'),
    role: z.enum(['customer', 'driver', 'partner', 'admin']),
    password: z.string().min(6, 'Password must be at least 6 characters').optional()
  })
});
