import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DemoRequestEntity, TimelineEntry } from './demo-request.entity'

export type WorkflowEvent = {
  id: string
  type: string
  occurredAt: string
  correlationId: string
  producer: string
  data: Record<string, any>
}

@Injectable()
export class DemoRequestsService {
  constructor(
    @InjectRepository(DemoRequestEntity, 'auth')
    private readonly demoRequests: Repository<DemoRequestEntity>
  ) {}

  async create(subject?: string): Promise<DemoRequestEntity> {
    const createdAt = new Date().toISOString()
    const request = this.demoRequests.create({
      subject: subject?.trim() || 'Sample customer request',
      status: 'created',
      timeline: [
        {
          eventType: 'demo.request-created',
          message: 'NestJS created the demo request.',
          service: 'nest',
          occurredAt: createdAt
        }
      ]
    })

    return this.demoRequests.save(request)
  }

  async findOne(id: string): Promise<DemoRequestEntity> {
    const request = await this.demoRequests.findOneBy({ id })
    if (!request) {
      throw new NotFoundException(`Demo request ${id} was not found.`)
    }
    return request
  }

  async recordWorkflowEvent(event: WorkflowEvent): Promise<void> {
    const requestId = event.data.requestId
    if (typeof requestId !== 'string') {
      return
    }

    const request = await this.demoRequests.findOneBy({ id: requestId })
    if (!request) {
      return
    }

    const entry = this.timelineEntry(event)
    request.timeline = [...request.timeline, entry]
    request.updatedAt = new Date()

    if (event.type === 'demo.request-enriched') {
      request.status = 'enriched'
      request.enrichment = event.data.enrichment ?? null
    }

    if (event.type === 'demo.request-scored') {
      request.status = 'scored'
      request.score = event.data.score ?? null
    }

    if (event.type === 'demo.request-completed') {
      request.status = 'completed'
      request.notification = event.data.notification ?? null
    }

    await this.demoRequests.save(request)
  }

  private timelineEntry(event: WorkflowEvent): TimelineEntry {
    const messages: Record<string, string> = {
      'demo.request-enriched': 'Python enriched the request data.',
      'demo.request-scored': 'Go calculated the request score.',
      'demo.request-completed': 'Node.js recorded the completion notification.'
    }

    return {
      eventType: event.type,
      message: messages[event.type] ?? 'The workflow received an event.',
      service: event.producer,
      occurredAt: event.occurredAt
    }
  }
}
