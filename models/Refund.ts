import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Refund — Dispute & Refund Workflow
 * Admin can issue Full Refund, Partial Refund, or Coupon Credit
 */
@Entity('refunds')
export class Refund {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    orderId: string;

    @Column()
    customerId: string;

    @Column({ type: 'float' })
    originalAmount: number;

    @Column({ type: 'float', default: 0 })
    refundAmount: number;

    @Column({ default: 'full' })
    refundType: string; // 'full' | 'partial' | 'coupon'

    @Column({ nullable: true })
    couponCode: string; // generated coupon if refundType='coupon'

    @Column({ default: 'pending' })
    status: string; // 'pending' | 'approved' | 'rejected' | 'processed'

    @Column({ nullable: true })
    reason: string; // Customer complaint reason

    @Column({ nullable: true })
    adminNote: string; // Admin internal notes

    @Column({ nullable: true })
    processedBy: string; // Admin userId

    @Column({ nullable: true })
    stripeRefundId: string; // Stripe refund reference

    @CreateDateColumn()
    createdAt: Date;
}
