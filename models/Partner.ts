import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Product } from './Product';

@Entity('partners')
export class Partner {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    name: string;

    @Column()
    category: string; // 'Restaurant', 'Pharmacy', 'Supermarket', 'Other'

    @Column()
    email: string;

    @Column({ nullable: true })
    image: string; // Banner or shop image

    @Column({ type: 'float', default: 4.5 })
    rating: number; // Star rating

    @Column({ type: 'int', default: 0 })
    ratingCount: number;

    @Column({ nullable: true })
    deliveryTime: string; // "25 min", "40 min"

    @Column({ type: 'simple-array', nullable: true })
    tags: string[]; // ["Burger", "American"], ["Ayurveda"], etc

    @Column({ default: 'Active' })
    status: string;

    @Column({ type: 'float', default: 0 })
    revenue: number;

    @Column({ type: 'integer', default: 0 })
    orders: number;

    @Column({ default: false })
    autoAccept: boolean;

    @Column({ default: true })
    isAcceptingOrders: boolean;

    @Column({ type: 'simple-json', nullable: true })
    operatingHours: any; // { monday: { open: "09:00", close: "22:00" }, ... }

    @Column({ type: 'int', default: 15 })
    defaultPrepTime: number; // in minutes

    @Column({ type: 'simple-json', nullable: true })
    industrySpecificData: any; // { prescriptionRequired, theaterLayout, etc }

    @CreateDateColumn()
    createdAt: Date;

    @OneToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ownerId' })
    owner: User;

    @OneToMany(() => Product, product => product.vendor)
    products: Product[];
}
