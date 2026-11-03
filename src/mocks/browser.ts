import { setupWorker } from 'msw/browser'
import { API_BASE_URL } from '../lib/api'
import { selectHandlers, type MockGroup } from './groups'
import { handlerRegistry } from './index'

export async function startMockWorker(groups: MockGroup[]) {
  const worker = setupWorker(...selectHandlers(groups, handlerRegistry))
  await worker.start({ onUnhandledFrame: 'bypass' })
  console.info(
    `[mocks] MSW is mocking: ${groups.join(', ')}. All other requests go to ${API_BASE_URL}.`,
  )
}
