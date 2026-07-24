import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from './entities/user.entity'

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(UserEntity, 'auth')
    private readonly users: Repository<UserEntity>
  ) {}

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ username })
  }

  async createUser(username: string, passwordHash: string): Promise<UserEntity> {
    const user = this.users.create({
      username,
      passwordHash,
      createdAt: Date.now()
    })
    return this.users.save(user)
  }
}
