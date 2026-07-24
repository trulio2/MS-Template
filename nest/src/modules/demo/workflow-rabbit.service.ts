import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import * as amqp from 'amqplib'
import { DemoRequestsService, WorkflowEvent } from './demo-requests.service'

const EXCHANGE = 'demo.events'
const QUEUE = 'nest.demo-workflow'

@Injectable()
export class WorkflowRabbitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowRabbitService.name)
  private connection: amqp.ChannelModel | null = null
  private channel: amqp.ConfirmChannel | null = null

  constructor(private readonly demoRequests: DemoRequestsService) {}

  private pending: Promise<void> = Promise.resolve()

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://app:app@rabbitmq:5672'
    this.connection = await amqp.connect(url)
    this.channel = await this.connection.createConfirmChannel()
    await this.channel.prefetch(1)
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true })
    await this.channel.assertQueue(QUEUE, { durable: true })

    for (const eventType of [
      'demo.request-enriched',
      'demo.request-scored',
      'demo.request-completed'
    ]) {
      await this.channel.bindQueue(QUEUE, EXCHANGE, eventType)
    }

    await this.channel.consume(
      QUEUE,
      (message) => {
        this.pending = this.pending.then(() => this.consume(message))
      },
      { noAck: false }
    )
    this.logger.log('Connected to RabbitMQ demo workflow queue.')
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close()
    await this.connection?.close()
  }

  async publish(
    type: string,
    data: Record<string, unknown>,
    correlationId: string
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not connected.')
    }

    const event: WorkflowEvent = {
      id: crypto.randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      correlationId,
      producer: 'nest',
      data
    }

    this.channel.publish(EXCHANGE, type, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: event.id,
      correlationId
    })
    await this.channel.waitForConfirms()
  }

  private async consume(message: amqp.ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return
    }

    try {
      const event = JSON.parse(message.content.toString()) as WorkflowEvent
      await this.demoRequests.recordWorkflowEvent(event)
      this.channel.ack(message)
    } catch (error) {
      this.logger.error('Unable to process workflow event.', error)
      this.channel.nack(message, false, true)
    }
  }
}
