import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { parseMockGroups } from './mocks/groups'
import './styles/index.css'

async function startMocking() {
  if (!import.meta.env.DEV) return
  const groups = parseMockGroups(import.meta.env.VITE_MOCK_GROUPS)
  if (groups.length === 0) return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker(groups)
}

startMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
