import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('translations')
@Index('IDX_LANG_KEY', ['lang', 'key'], { unique: true })
export class Translation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 10 })
    lang: string;

    @Column()
    key: string;

    @Column({ type: 'text' })
    value: string;
}
