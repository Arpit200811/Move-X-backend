import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './Partner';

@Entity('coupons')
export class Coupon {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column({ unique: true })
    code: string; // e.g. 'MOVEX50'

    @Column({ default: 'percentage' })
    type: string; // 'percentage' | 'flat'

    @Column({ default: 'ALL' })
    scope: string; // 'ALL' | 'RIDE' | 'GROCERY' | 'PARCEL' | 'FOOD'

    @Column({ default: false })
    isFirstOrderOnly: boolean;

    @Column({ default: 1 })
    limitPerUser: number;

    @Column({ type: 'float' })
    value: number; // 50 for 50%, 10 for $10

    @Column({ type: 'float', default: 0 })
    minOrderAmount: number;

    @Column({ type: 'float', nullable: true })
    maxDiscountAmount: number;

    @Column({ type: 'timestamp', nullable: true })
    expiryDate: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    usageCount: number;

    @Column({ default: 1000 })
    usageLimit: number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Partner, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'vendorId' })
    vendor: Partner; // If null, it's a global platform coupon, else it's a vendor-specific coupon
}
