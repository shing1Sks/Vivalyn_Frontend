import { useTokenBalance } from '../../context/TokenContext'

function RingGauge({ pct, color }: { pct: number; color: 'indigo' | 'amber' | 'red' }) {
  const r = 11
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, pct)) * circ

  const stroke =
    color === 'indigo' ? '#818cf8'
    : color === 'amber' ? '#fbbf24'
    : '#f87171'

  const trackStroke = '#f3f4f6'

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
      {/* Track */}
      <circle
        cx="14" cy="14" r={r}
        fill="none"
        stroke={trackStroke}
        strokeWidth="3"
      />
      {/* Fill */}
      <circle
        cx="14" cy="14" r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 14 14)"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  )
}

export default function TokenBalanceBar() {
  const { balance, lowThreshold, balanceLoading, minutesIncluded, scalingEnabled, overflowMinutes } = useTokenBalance()

  if (balanceLoading || balance === null) return null

  const color: 'indigo' | 'amber' | 'red' =
    balance > lowThreshold * 3 ? 'indigo'
    : balance > lowThreshold ? 'amber'
    : 'red'

  const fullMark = minutesIncluded && minutesIncluded > 0
    ? minutesIncluded
    : Math.max(lowThreshold * 20, balance + 1)
  const pct = balance / fullMark

  const showOverflow = scalingEnabled && overflowMinutes > 0

  return (
    <div className="relative group flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg">
        <RingGauge pct={pct} color={color} />
        <div className="flex flex-col items-start">
          <span className={`text-xs font-medium tabular-nums leading-none ${
            color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : 'text-indigo-500'
          }`}>
            {balance.toLocaleString()}
          </span>
          {showOverflow && (
            <span className="text-[10px] text-amber-500 tabular-nums leading-none mt-0.5">
              +{overflowMinutes.toLocaleString()} overflow
            </span>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-white border border-gray-200 shadow-md text-gray-700 text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none duration-[120ms] z-50 space-y-1 min-w-[160px]">
        <p className="text-gray-700">{balance.toLocaleString()} min remaining</p>
        {minutesIncluded != null && (
          <p className="text-gray-400">{minutesIncluded.toLocaleString()} mins included in plan</p>
        )}
        {showOverflow && (
          <p className="text-amber-500">+{overflowMinutes.toLocaleString()} min overflow (scaled)</p>
        )}
        {color === 'red' && <p className="text-red-500">Low balance</p>}
      </div>
    </div>
  )
}
