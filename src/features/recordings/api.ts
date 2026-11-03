import { apiRequest } from '../../lib/api'
import { parseExplorationResponse, parseRecordingResponse } from './contract'
import type { Exploration, Recording } from './types'

export async function fetchRecording(id: string): Promise<Recording> {
  const data = await apiRequest(`/api/recordings/${encodeURIComponent(id)}`)
  return parseRecordingResponse(data, id)
}

export async function fetchExploration(id: string): Promise<Exploration> {
  const data = await apiRequest(`/api/recordings/${encodeURIComponent(id)}/exploration`)
  return parseExplorationResponse(data, id)
}
