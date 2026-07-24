import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { DemoRequestsService } from './demo-requests.service'
import { WorkflowRabbitService } from './workflow-rabbit.service'

@Controller('demo-requests')
export class DemoRequestsController {
  constructor(
    private readonly demoRequests: DemoRequestsService,
    private readonly workflowRabbit: WorkflowRabbitService
  ) {}

  @Post()
  async create(@Body() body: { subject?: string }) {
    const request = await this.demoRequests.create(body?.subject)
    await this.workflowRabbit.publish(
      'demo.request-created',
      { requestId: request.id, subject: request.subject },
      request.id
    )
    return request
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.demoRequests.findOne(id)
  }
}
