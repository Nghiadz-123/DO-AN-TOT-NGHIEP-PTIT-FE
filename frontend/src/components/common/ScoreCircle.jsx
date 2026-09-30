import { scoreLevel } from '@/utils/formatters'

export default function ScoreCircle({ score, size = 96, showLabel = true }) {
  const level = scoreLevel(score)
  const stroke = size > 70 ? 8 : 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="score-circle" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="score-circle-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={`var(--${level.tone})`}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.28} fontWeight="700">
          {score}
        </text>
      </svg>
      {showLabel && <span className={`text-${level.tone}`}>{level.label}</span>}
    </div>
  )
}

export function ProgressBar({ value }) {
  const { tone } = scoreLevel(value)
  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${value}%`, background: `var(--${tone})` }} />
    </div>
  )
}
