import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get()
  helloWorld(): { message: string } {
    return { message: 'Hello from the NestJS service!' }
  }
}
