import { Controller, Get, Query, Req, Res } from '@nestjs/common'
import * as path from 'path'
import { AuthService } from '../auth/auth.service'

@Controller('static')
export class StaticController {
  private staticPath = path.join(process.cwd(), 'static')

  constructor(private readonly authService: AuthService) {}

  @Get('movies.html')
  async getMovies(
    @Req() req: any,
    @Res() res: any,
    @Query('token') queryToken?: string
  ) {
    const cookieToken = this.authService.tokenFromCookieHeader(
      req.headers.cookie
    )
    const token = (await this.authService.isValidSession(queryToken))
      ? queryToken
      : cookieToken

    if (await this.authService.isValidSession(token)) {
      return res.status(404).send('')
    }

    res.sendFile(path.join(this.staticPath, 'html/movies.html'))
  }
}
