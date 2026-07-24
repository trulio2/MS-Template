import {
  ConflictException,
  Injectable,
  OnApplicationBootstrap,
  UnauthorizedException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import * as express from 'express'
import { AuthRepository } from './auth.repository'
import { SessionEntity } from './entities/session.entity'

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(SessionEntity, 'auth')
    private readonly sessions: Repository<SessionEntity>,
    private readonly authRepository: AuthRepository
  ) {}

  onApplicationBootstrap() {
    setInterval(() => {
      this.sessions.delete({ expiry: LessThan(Date.now()) })
    }, 60 * 60_000)
  }

  private async issueSession(username: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    await this.sessions.insert({
      token,
      username,
      expiry: Date.now() + 365 * 24 * 60 * 60 * 1000
    })
    return token
  }

  async signUp(rawUsername: string, password: string): Promise<string> {
    const username = String(rawUsername ?? '')
      .trim()
      .slice(0, 32)
    if (!username || !password) {
      throw new UnauthorizedException('Username and password are required')
    }

    const existing = await this.authRepository.findByUsername(username)
    if (existing) {
      throw new ConflictException('Username is already taken')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await this.authRepository.createUser(username, passwordHash)
    return this.issueSession(username)
  }

  async login(rawUsername: string, password: string): Promise<string> {
    const username = String(rawUsername ?? '')
      .trim()
      .slice(0, 32)
    const user = await this.authRepository.findByUsername(username)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password')
    }

    return this.issueSession(username)
  }

  async isValidSession(token: string | null | undefined): Promise<boolean> {
    if (!token) return false
    const session = await this.sessions.findOneBy({ token })
    return !!(session && session.expiry >= Date.now())
  }

  async getSession(
    req: any,
    authHeader: string
  ): Promise<{ valid: boolean; name: string }> {
    try {
      const cookieToken = this.tokenFromCookieHeader(req.headers.cookie)
      const token = (await this.isValidSession(authHeader))
        ? authHeader
        : cookieToken

      const name = await this.getUsername(token)

      const isValidSession = await this.isValidSession(token)

      return {
        valid: isValidSession,
        name
      }
    } catch {
      return {
        valid: false,
        name: ''
      }
    }
  }

  async getUsername(token: string | null | undefined): Promise<string> {
    if (!token) return 'Player'
    const session = await this.sessions.findOneBy({ token })
    return session?.username ?? 'Player'
  }

  tokenFromCookieHeader(header: string | undefined): string | null {
    for (const part of (header || '').split(';')) {
      const [k, v] = part.trim().split('=')
      if (k?.trim() === 'trulyo-auth') return v?.trim() ?? null
    }
    return null
  }

  getSessionCookie(req: express.Request): string | null {
    return this.tokenFromCookieHeader(req.headers.cookie)
  }
}
