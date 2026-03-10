import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Order } from './Order';

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    userId: string;

    @Column({ nullable: true })
    orderId: string;

    @Column()
    type: string;

    @Column({ type: 'float' })
    amount: number;

    @Column({ default: 'COMPLETED' })
    status: string;

    @Column({ nullable: true })
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Order, { nullable: true })
    @JoinColumn({ name: 'orderId' })
    order: Order;
}
