import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('banners')
export class Banner {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    title: string;

    @Column()
    imageUrl: string;

    @Column({ nullable: true })
    linkTo: string; // Screen or deep link

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    priority: number;

    @Column({ nullable: true })
    category: string; // 'FOOD', 'PARCEL', etc.

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
