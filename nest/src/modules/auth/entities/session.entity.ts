import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('sessions')
export class SessionEntity {
  @PrimaryColumn()
  token: string

  @Column()
  username: string

  @Column({ type: 'bigint' })
  expiry: number
}
