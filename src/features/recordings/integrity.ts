import type { Recording } from './types'

export type IntegrityRule = 'I1' | 'I2' | 'I3' | 'I4'

export type IntegrityViolation = {
  rule: IntegrityRule
  recordingId: string
  message: string
}

export function validateRecordings(recordings: readonly Recording[]): IntegrityViolation[] {
  const byId = new Map(recordings.map((recording) => [recording.id, recording]))
  const violations: IntegrityViolation[] = []
  const report = (rule: IntegrityRule, recording: Recording, message: string) =>
    violations.push({
      rule,
      recordingId: recording.id,
      message: `${rule} (${recording.id}): ${message}`,
    })

  for (const recording of recordings) {
    const link: unknown = recording.originalRecordingId

    if (recording.kind === 'original') {
      if (link !== null) report('I1', recording, 'an original must have originalRecordingId: null')
      continue
    }

    if (link === null) continue
    if (typeof link !== 'string' || link === '') {
      report('I2', recording, 'a cover must have a non-empty string originalRecordingId or null')
      continue
    }

    const target = byId.get(link)
    if (!target) {
      report('I4', recording, `references "${link}", which does not exist`)
    } else if (target.kind !== 'original') {
      report('I3', recording, `references "${link}", which is a cover, not an original`)
    }
  }

  return violations
}

export function assertValidRecordings(recordings: readonly Recording[]): void {
  const violations = validateRecordings(recordings)
  if (violations.length > 0) {
    throw new Error(
      `Recording integrity violated:\n${violations.map((v) => `- ${v.message}`).join('\n')}`,
    )
  }
}
