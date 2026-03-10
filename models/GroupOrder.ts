import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Order } from './Order';

/**
 * GroupOrder — Collaborative / Split Ordering
 * Allows multiple users to join a single session and split costs.
 */
@Entity('group_orders')
export class GroupOrder {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column({ unique: true })
    inviteCode: string; // 6-digit code for others to join

    @ManyToOne(() => User)
    @JoinColumn({ name: 'creatorId' })
    creator: User;

    @Column({ default: 'OPEN' })
    status: string; // 'OPEN' | 'LOCKED' | 'PLACED'

    @Column({ type: 'simple-json', nullable: true })
    members: any[]; // Array of { userId, name, avatar, joinedAt }

    @Column({ type: 'simple-json', nullable: true })
    cart: any[]; // Combined cart items from everyone

    @Column({ type: 'float', default: 0 })
    totalAmount: number;

    @Column({ default: 'split_even' })
    splitMethod: string; // 'split_even' | 'pay_individual' | 'host_pays'

    @OneToMany(() => Order, (order) => order._id)
    resultOrders: Order[]; // The actual order(s) created from this group session

    @CreateDateColumn()
    createdAt: Date;
}
