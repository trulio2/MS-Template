import {
  Controller,
  Get,
  Headers,
  Post,
  Body,
  Res,
  UnauthorizedException
} from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { username?: string; password?: string },
    @Res({ passthrough: true }) res: any
  ): Promise<{ token: string }> {
    const token = await this.authService.login(
      body?.username ?? '',
      body?.password ?? ''
    )

    res.setHeader(
      'Set-Cookie',
      `${token ? `trulyo-auth=${token}` : 'trulyo-auth='}; Path=/; HttpOnly; SameSite=Strict`
    )

    return { token }
  }

  @Post('signup')
  async signUp(
    @Body() body: { username?: string; password?: string },
    @Res({ passthrough: true }) res: any
  ): Promise<{ token: string }> {
    const token = await this.authService.signUp(
      body?.username ?? '',
      body?.password ?? ''
    )

    res.setHeader(
      'Set-Cookie',
      `${token ? `trulyo-auth=${token}` : 'trulyo-auth='}; Path=/; HttpOnly; SameSite=Strict`
    )

    return { token }
  }

  @Get('me')
  async me(
    @Headers('authorization') authHeader?: string
  ): Promise<{ username: string }> {
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!(await this.authService.isValidSession(token))) {
      throw new UnauthorizedException()
    }

    return { username: await this.authService.getUsername(token) }
  }

  @Post('logout')
  logout(@Res() res: any) {
    res.setHeader(
      'Set-Cookie',
      'trulyo-auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    )
    return res.status(204).send('')
  }
}
