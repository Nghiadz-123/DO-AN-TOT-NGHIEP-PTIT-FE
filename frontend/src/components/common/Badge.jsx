import { AI_RECOMMENDATION, APPLICATION_STATUS, JOB_STATUS } from '@/utils/constants'

export default function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatusBadge({ status }) {
  const meta = APPLICATION_STATUS[status] ?? { label: status, tone: 'neutral' }
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function JobStatusBadge({ status }) {
  const meta = JOB_STATUS[status] ?? { label: status, tone: 'neutral' }
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function RecommendationBadge({ value }) {
  const meta = AI_RECOMMENDATION[value]
  return meta ? <Badge tone={meta.tone}>AI: {meta.label}</Badge> : null
}
