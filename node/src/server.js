const http = require('node:http')

const port = Number(process.env.PORT ?? 3001)

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ message: 'Hello from the Node.js service!' }))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ message: 'Not found' }))
})

server.listen(port, () => {
  console.log(`Node.js service listening on http://localhost:${port}`)
})
