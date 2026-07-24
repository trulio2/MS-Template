import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DemoRequestEntity } from './demo-request.entity'
import { DemoRequestsController } from './demo-requests.controller'
import { DemoRequestsService } from './demo-requests.service'
import { WorkflowRabbitService } from './workflow-rabbit.service'

@Module({
  imports: [TypeOrmModule.forFeature([DemoRequestEntity], 'auth')],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService, WorkflowRabbitService]
})
export class DemoModule {}
