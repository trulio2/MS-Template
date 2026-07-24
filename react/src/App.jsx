import { useCallback, useEffect, useState } from 'react'
import './App.css'

const services = [
  { id: 'nest', name: 'NestJS', endpoint: '/api/nest/', port: '3000' },
  { id: 'node', name: 'Node.js', endpoint: '/api/node/', port: '3001' },
  { id: 'python', name: 'FastAPI', endpoint: '/api/python/', port: '8000' },
  { id: 'go', name: 'Go', endpoint: '/api/go/', port: '8080' }
]

const initialChecks = Object.fromEntries(
  services.map((service) => [service.id, { status: 'idle' }])
)

function App() {
  const [checks, setChecks] = useState(initialChecks)
  const [workflow, setWorkflow] = useState(null)
  const [workflowSubject, setWorkflowSubject] = useState(
    'Prepare a priority customer demo'
  )
  const [workflowError, setWorkflowError] = useState(null)
  const [isStartingWorkflow, setIsStartingWorkflow] = useState(false)

  const checkService = useCallback(async (service) => {
    setChecks((current) => ({
      ...current,
      [service.id]: { status: 'checking' }
    }))

    const startedAt = performance.now()

    try {
      const response = await fetch(service.endpoint, {
        headers: { Accept: 'application/json' }
      })
      const responseText = await response.text()
      const body = responseText ? JSON.parse(responseText) : {}

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setChecks((current) => ({
        ...current,
        [service.id]: {
          status: 'online',
          duration: Math.round(performance.now() - startedAt),
          message: body.message ?? 'Service responded successfully'
        }
      }))
    } catch (error) {
      setChecks((current) => ({
        ...current,
        [service.id]: {
          status: 'offline',
          message: error instanceof Error ? error.message : 'Request failed'
        }
      }))
    }
  }, [])

  const checkServices = useCallback(async () => {
    await Promise.all(services.map(checkService))
  }, [checkService])

  const loadWorkflow = useCallback(async (requestId) => {
    try {
      const response = await fetch(`/api/nest/demo-requests/${requestId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message ?? `HTTP ${response.status}`)
      }
      setWorkflow(data)
    } catch (error) {
      setWorkflowError(
        error instanceof Error ? error.message : 'Unable to load workflow.'
      )
    }
  }, [])

  const startWorkflow = useCallback(
    async (event) => {
      event.preventDefault()
      setIsStartingWorkflow(true)
      setWorkflowError(null)

      try {
        const response = await fetch('/api/nest/demo-requests', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ subject: workflowSubject })
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message ?? `HTTP ${response.status}`)
        }
        setWorkflow(data)
      } catch (error) {
        setWorkflowError(
          error instanceof Error ? error.message : 'Unable to start workflow.'
        )
      } finally {
        setIsStartingWorkflow(false)
      }
    },
    [workflowSubject]
  )

  useEffect(() => {
    void checkServices()
  }, [checkServices])

  useEffect(() => {
    if (!workflow?.id || workflow.status === 'completed') {
      return undefined
    }

    const timer = window.setInterval(() => {
      void loadWorkflow(workflow.id)
    }, 800)
    return () => window.clearInterval(timer)
  }, [loadWorkflow, workflow?.id, workflow?.status])

  const isChecking = Object.values(checks).some(
    (check) => check.status === 'checking'
  )
  const onlineCount = Object.values(checks).filter(
    (check) => check.status === 'online'
  ).length

  return (
    <main className="dashboard">
      <header className="hero">
        <p className="eyebrow">Microservice template</p>
        <h1>Service gateway dashboard</h1>
        <p className="intro">
          This page is served by Nginx and calls each service through its
          reverse-proxy route.
        </p>
        <div className="summary" aria-live="polite">
          <span className="summary-dot" />
          {onlineCount} of {services.length} services online
        </div>
      </header>

      <section className="gateway" aria-label="Gateway route information">
        <div>
          <p className="section-label">Public entry point</p>
          <code>http://localhost:8080</code>
        </div>
        <button type="button" onClick={checkServices} disabled={isChecking}>
          {isChecking ? 'Checking services...' : 'Check all services'}
        </button>
      </section>

      <section className="workflow-panel" aria-label="Demo request pipeline">
        <div className="workflow-heading">
          <div>
            <p className="section-label">RabbitMQ workflow</p>
            <h2>Run a demo request through every service</h2>
            <p>
              NestJS creates the request, Python enriches it, Go scores it, and
              Node.js records the completion notification.
            </p>
          </div>
          {workflow && (
            <span
              className={`workflow-status workflow-status-${workflow.status}`}
            >
              {workflow.status}
            </span>
          )}
        </div>

        <form className="workflow-form" onSubmit={startWorkflow}>
          <label htmlFor="workflow-subject">Request subject</label>
          <div className="workflow-controls">
            <input
              id="workflow-subject"
              value={workflowSubject}
              onChange={(event) => setWorkflowSubject(event.target.value)}
              maxLength="120"
              required
            />
            <button type="submit" disabled={isStartingWorkflow}>
              {isStartingWorkflow ? 'Starting...' : 'Start workflow'}
            </button>
          </div>
        </form>

        {workflowError && <p className="workflow-error">{workflowError}</p>}

        {workflow && (
          <div className="workflow-result">
            <div className="timeline">
              {workflow.timeline.map((entry) => (
                <div
                  className="timeline-entry"
                  key={`${entry.eventType}-${entry.occurredAt}`}
                >
                  <span className="timeline-marker" />
                  <div>
                    <strong>{entry.service}</strong>
                    <p>{entry.message}</p>
                  </div>
                  <time>{new Date(entry.occurredAt).toLocaleTimeString()}</time>
                </div>
              ))}
            </div>

            <div className="workflow-data">
              <div>
                <span>Enrichment</span>
                <strong>{workflow.enrichment?.category ?? 'Waiting'}</strong>
              </div>
              <div>
                <span>Score</span>
                <strong>
                  {workflow.score
                    ? `${workflow.score.value} (${workflow.score.band})`
                    : 'Waiting'}
                </strong>
              </div>
              <div>
                <span>Notification</span>
                <strong>{workflow.notification?.channel ?? 'Waiting'}</strong>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="service-grid" aria-label="Service checks">
        {services.map((service) => {
          const check = checks[service.id]

          return (
            <article className="service-card" key={service.id}>
              <div className="card-heading">
                <div>
                  <p className="section-label">Port {service.port}</p>
                  <h2>{service.name}</h2>
                </div>
                <span className={`status status-${check.status}`}>
                  {check.status === 'online'
                    ? 'Online'
                    : check.status === 'offline'
                      ? 'Unavailable'
                      : check.status === 'checking'
                        ? 'Checking'
                        : 'Not checked'}
                </span>
              </div>

              <code className="route">{service.endpoint}</code>
              <p className="response">
                {check.message ?? 'Run a check to call this service.'}
              </p>
              <div className="card-footer">
                <span>{check.duration ? `${check.duration} ms` : '-'}</span>
                <button type="button" onClick={() => checkService(service)}>
                  Retry
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <p className="note">
        API requests stay same-origin: the browser calls Nginx, and Nginx
        forwards each request to the matching service on the internal Compose
        network.
      </p>
    </main>
  )
}

export default App
