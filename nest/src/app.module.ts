import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { authDataSourceOptions } from './db/auth-data-source'
import { AuthModule, StaticModule } from './modules'

@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    StaticModule,
    TypeOrmModule.forRoot(authDataSourceOptions)
  ]
})
export class AppModule {}
