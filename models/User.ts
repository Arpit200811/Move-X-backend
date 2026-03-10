import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    phone: string;

    @Column({ default: 'customer' })
    role: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ nullable: true })
    vehicle: string;

    @Column({ nullable: true })
    licenseNumber: string;

    @Column({ default: 'offline' })
    status: string;

    @Column({ default: false })
    isOnline: boolean;

    @Column({ type: 'float', default: 5.0 })
    rating: number;

    @Column({ type: 'int', default: 0 })
    ratingCount: number;

    @Column({ nullable: true })
    passwordHash: string;

    @Column({ type: 'simple-json', nullable: true })
    settings: any;

    @Column({ type: 'float', nullable: true })
    lat: number;

    @Column({ type: 'float', nullable: true })
    lng: number;

    @Column({ nullable: true })
    pushToken: string;

    @Column({ type: 'float', default: 0.0 })
    walletBalance: number;

    @Column({ default: 'bronze' })
    tier: string; // 'bronze' | 'silver' | 'gold' | 'platinum'

    @Column({ default: 0 })
    loyaltyPoints: number;

    @Column({ default: false })
    isSuspended: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastLocationTimestamp: Date;

    @Column({ type: 'int', default: 0 })
    gamificationPoints: number;

    @Column({ default: 'Bronze' })
    gamificationTier: string;

    @Column({ nullable: true })
    kycLicenseUrl: string;

    @Column({ nullable: true })
    kycIdUrl: string;

    @Column({ nullable: true })
    otpCode: string;

    @Column({ default: false })
    phoneVerified: boolean;

    @Column({ type: 'simple-json', nullable: true })
    payoutDetails: {
        method: 'bank' | 'upi' | 'wallet';
        accountNumber?: string;
        bankName?: string;
        ifsc?: string;
        upiId?: string;
        holderName?: string;
    };

    @Column({ default: 'INR' })
    currency: string;

    @CreateDateColumn()
    createdAt: Date;
}
