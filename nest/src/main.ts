import 'dotenv/config'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as express from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger()
  const port = process.env.PORT || 3000

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false
  })
  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true
    })
  )
  app.enableCors({ origin: true, credentials: true })

  if (process.env.NODE_ENV !== 'production') {
    app.use('/static', (_req: any, res: any, next: any) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      next()
    })
  }

  await app.listen(port)

  logger.verbose(`Application is running on port ${port}`)
}

bootstrap()
