import 'dotenv/config'
import { DataSource, DataSourceOptions } from 'typeorm'
import { SessionEntity } from '../modules/auth/entities/session.entity'
import { UserEntity } from '../modules/auth/entities/user.entity'

export const authDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [SessionEntity, UserEntity],
  synchronize: process.env.NODE_ENV !== 'production',
  ssl:
    process.env.DATABASE_SSL !== 'false'
      ? { rejectUnauthorized: false }
      : false,
  name: 'auth'
}

const authDataSource = new DataSource(authDataSourceOptions)
export default authDataSource
