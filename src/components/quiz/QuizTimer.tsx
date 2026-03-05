type Props = {
  timeLeft: number
  totalTime: number  // e.g. 30
}

export function QuizTimer({ timeLeft, totalTime }: Props) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const progress = timeLeft / totalTime
  const offset = circumference * (1 - progress)

  const color = timeLeft > 15 ? '#22C55E' : timeLeft > 7 ? '#EAB308' : '#F43F5E'

  return (
    <div className="flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        {/* Track */}
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth="6"
        />
        {/* Progress */}
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="timer-ring transition-all duration-1000"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
        {/* Number */}
        <text
          x="44" y="50"
          textAnchor="middle"
          fill={color}
          fontSize="20"
          fontWeight="700"
          fontFamily="system-ui"
        >
          {timeLeft}
        </text>
      </svg>
    </div>
  )
}
