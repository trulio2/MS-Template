const amqp = require('amqplib')
const { randomUUID } = require('node:crypto')
const http = require('node:http')
const { Client } = require('pg')

const port = Number(process.env.PORT ?? 3001)
const databaseUrl = process.env.DATABASE_URL
const rabbitmqUrl = process.env.RABBITMQ_URL ?? 'amqp://app:app@rabbitmq:5672'
const exchange = 'demo.events'
const queue = 'node.demo-notifications'

const database = new Client({ connectionString: databaseUrl })

async function startWorkflowConsumer() {
  await database.connect()
  await database.query(`
    CREATE TABLE IF NOT EXISTS node_notifications (
      request_id UUID PRIMARY KEY,
      notification JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const connection = await amqp.connect(rabbitmqUrl)
  const channel = await connection.createConfirmChannel()
  await channel.assertExchange(exchange, 'topic', { durable: true })
  await channel.assertQueue(queue, { durable: true })
  await channel.bindQueue(queue, exchange, 'demo.request-scored')

  await channel.consume(queue, async (message) => {
    if (!message) return

    try {
      const event = JSON.parse(message.content.toString())
      const { requestId, subject, enrichment, score } = event.data
      const notification = {
        message: `Demo request "${subject}" completed with score ${score.value}.`,
        channel: 'activity-log',
        completedAt: new Date().toISOString()
      }
      const result = await database.query(
        `INSERT INTO node_notifications (request_id, notification)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (request_id) DO NOTHING
         RETURNING request_id`,
        [requestId, JSON.stringify(notification)]
      )

      if (result.rowCount > 0) {
        const completedEvent = {
          id: randomUUID(),
          type: 'demo.request-completed',
          occurredAt: new Date().toISOString(),
          correlationId: requestId,
          producer: 'node',
          data: { requestId, subject, enrichment, score, notification }
        }

        channel.publish(
          exchange,
          completedEvent.type,
          Buffer.from(JSON.stringify(completedEvent)),
          {
            contentType: 'application/json',
            deliveryMode: 2,
            messageId: completedEvent.id,
            correlationId: requestId
          }
        )
        await channel.waitForConfirms()
      }

      channel.ack(message)
    } catch (error) {
      console.error('Unable to process scored demo request.', error)
      channel.nack(message, false, true)
    }
  })

  console.log('Node.js workflow consumer is ready.')
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ message: 'Hello from the Node.js service!' }))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ message: 'Not found' }))
})

startWorkflowConsumer().catch((error) => {
  console.error('Unable to start the Node.js workflow consumer.', error)
  process.exit(1)
})

server.listen(port, () => {
  console.log(`Node.js service listening on http://localhost:${port}`)
})
