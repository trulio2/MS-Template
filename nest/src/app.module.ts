import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { authDataSourceOptions } from './db/auth-data-source'
import { AuthModule, StaticModule } from './modules'

@Module({
  imports: [
    AuthModule,
    StaticModule,
    TypeOrmModule.forRoot(authDataSourceOptions)
  ]
})
export class AppModule {}
