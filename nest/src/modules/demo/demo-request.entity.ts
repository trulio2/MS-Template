import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

export type TimelineEntry = {
  eventType: string
  message: string
  service: string
  occurredAt: string
}

@Entity('demo_requests')
export class DemoRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  subject: string

  @Column({ default: 'created' })
  status: string

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  timeline: TimelineEntry[]

  @Column({ type: 'jsonb', nullable: true })
  enrichment: Record<string, unknown> | null

  @Column({ type: 'jsonb', nullable: true })
  score: Record<string, unknown> | null

  @Column({ type: 'jsonb', nullable: true })
  notification: Record<string, unknown> | null

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
