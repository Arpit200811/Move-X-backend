import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './Partner';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    name: string;

    @Column({ type: 'float' })
    price: number;

    @Column({ nullable: true })
    image: string;

    @Column({ nullable: true })
    category: string; // 'Pizza', 'Burger', 'Vitamins', 'Ayurveda', etc

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: true })
    isAvailable: boolean;

    @Column({ default: false })
    outOfStockForToday: boolean;

    @Column({ type: 'simple-json', nullable: true })
    customizationOptions: any; // { sizes: [], addOns: [{ name: "Extra Cheese", price: 20 }] }

    @Column({ type: 'simple-array', nullable: true })
    tags: string[];

    @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'vendorId' })
    vendor: Partner;

    @CreateDateColumn()
    createdAt: Date;
}
