import type { HandlerRegistry } from './groups'
import { artistsHandlers } from './handlers/artists'
import { authHandlers } from './handlers/auth'
import { recordingsHandlers } from './handlers/recordings'
import { tagsHandlers } from './handlers/tags'

export const handlerRegistry: HandlerRegistry = {
  recordings: recordingsHandlers,
  auth: authHandlers,
  artists: artistsHandlers,
  tags: tagsHandlers,
}
