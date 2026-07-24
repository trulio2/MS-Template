import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepository } from './auth.repository'
import { SessionEntity } from './entities/session.entity'
import { UserEntity } from './entities/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity, UserEntity], 'auth')],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
  exports: [AuthService]
})
export class AuthModule {}
