import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { StaticController } from './static.controller'

@Module({
  imports: [AuthModule],
  controllers: [StaticController],
  providers: []
})
export class StaticModule {}
