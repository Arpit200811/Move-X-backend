import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Partner } from './Partner';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column({ unique: true })
    orderId: string;

    @Column({ type: 'simple-json', nullable: true })
    pickup: any;

    @Column({ type: 'simple-json', nullable: true })
    destination: any;

    @Column({ nullable: true })
    packageType: string;

    @Column({ type: 'text', nullable: true })
    parcelDescription: string;

    @Column({ nullable: true })
    weight: string;

    @Column({ default: 'PENDING' })
    status: string;

    @Column({ default: 'Cash' })
    paymentMethod: string;

    @Column({ default: 'pending' })
    paymentStatus: string; // 'pending' | 'paid' | 'failed'

    @Column({ type: 'float', nullable: true })
    price: number;

    @Column({ type: 'float', default: 0.0 })
    tax: number;

    @Column({ default: 'USD' })
    currency: string;

    @Column({ type: 'float', nullable: true })
    total: number;

    @Column({ type: 'float', default: 0.0 })
    itemsTotal: number;

    @Column({ type: 'float', default: 0.0 })
    deliveryFee: number;

    @Column({ type: 'float', default: 0.0 })
    waitingFee: number;

    @Column({ nullable: true })
    promoCode: string;

    @Column({ type: 'float', default: 0.0 })
    discount: number;

    @Column({ type: 'simple-json', nullable: true })
    timeline: any;

    @Column({ nullable: true })
    otp: string;

    @Column({ type: 'simple-json', nullable: true })
    items: any; // Cart items array for Food/Pharmacy

    @Column({ nullable: true })
    deliveryPhoto: string;

    @Column({ default: 'Economy' })
    serviceClass: string;

    @Column({ type: 'simple-json', nullable: true })
    pickupCoords: any;

    @Column({ type: 'simple-json', nullable: true })
    destCoords: any;

    @Column({ type: 'int', nullable: true })
    rating: number;

    @Column({ type: 'text', nullable: true })
    review: string;

    @Column({ type: 'simple-json', nullable: true })
    messages: any;

    @Column({ type: 'simple-json', nullable: true })
    dispatchLogs: any;

    @Column({ type: 'int', default: 0 })
    retryCount: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'customerId' })
    customerId: User;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'driverId' })
    driverId: User;

    @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'partnerId' })
    partnerId: Partner;

    @Column({ type: 'timestamp', nullable: true })
    waitingTimerStartedAt: Date;

    @Column({ nullable: true })
    paymentIntentId: string;

    @Column({ default: 'none' })
    disputeStatus: string; // 'none' | 'open' | 'resolved'

    @CreateDateColumn()
    createdAt: Date;
}
