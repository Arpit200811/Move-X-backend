import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('zones')
export class Zone {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    name: string;

    @Column({ type: 'json' })
    boundary: any; // GeoJSON Polygon

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'float', default: 1.0 })
    baseMultiplier: number; // For premium zones like Airports

    @Column({ nullable: true })
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
