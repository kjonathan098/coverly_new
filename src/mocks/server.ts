import { setupServer } from 'msw/node'
import { MOCK_GROUPS, selectHandlers } from './groups'
import { handlerRegistry } from './index'

export const server = setupServer(...selectHandlers(MOCK_GROUPS, handlerRegistry))
