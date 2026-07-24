import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'

@Entity('users')
@Unique(['username'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  username: string

  @Column()
  passwordHash: string

  @Column({ type: 'bigint' })
  createdAt: number
}
