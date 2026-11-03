import { useQuery } from '@tanstack/react-query'
import { fetchExploration, fetchRecording } from './api'

export const recordingKeys = {
  all: ['recordings'] as const,
  detail: (id: string) => [...recordingKeys.all, id] as const,
  exploration: (id: string) => [...recordingKeys.all, id, 'exploration'] as const,
}

export function useRecording(id: string) {
  return useQuery({ queryKey: recordingKeys.detail(id), queryFn: () => fetchRecording(id) })
}

export function useExploration(id: string) {
  return useQuery({ queryKey: recordingKeys.exploration(id), queryFn: () => fetchExploration(id) })
}
