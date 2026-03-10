import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AuditLog — Event Sourcing / Audit Trail
 * Tracks every state change across orders, payouts, disputes
 * like a "blackbox" for replaying history and settling disputes.
 */
@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    entityType: string; // 'order' | 'payout' | 'user' | 'refund'

    @Column()
    entityId: string; // orderId, userId, etc.

    @Column()
    event: string; // 'ORDER_CREATED' | 'DRIVER_ASSIGNED' | 'PAYMENT_CAPTURED' | 'REFUND_ISSUED' ...

    @Column({ type: 'simple-json', nullable: true })
    previousState: any; // snapshot before change

    @Column({ type: 'simple-json', nullable: true })
    newState: any; // snapshot after change

    @Column({ type: 'simple-json', nullable: true })
    metadata: any; // who triggered it, IP, etc.

    @Column({ nullable: true })
    actorId: string; // userId who performed the action

    @Column({ default: 'system' })
    actorRole: string; // 'admin' | 'customer' | 'driver' | 'system'

    @Column({ nullable: true })
    ipAddress: string;

    @CreateDateColumn()
    createdAt: Date;
}
