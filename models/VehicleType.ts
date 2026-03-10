import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('vehicle_types')
export class VehicleType {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column()
    name: string; // 'Bike', 'Car', 'Van', 'Truck'

    @Column({ type: 'float', default: 0 })
    baseFare: number;

    @Column({ type: 'float', default: 0 })
    ratePerKm: number;

    @Column({ type: 'float', default: 0 })
    ratePerMinute: number;

    @Column({ nullable: true })
    icon: string;

    @Column({ type: 'int', default: 0 })
    capacityKg: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
