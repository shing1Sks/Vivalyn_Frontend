import { useTokenBalance } from '../../context/TokenContext'

function RingGauge({ pct, color }: { pct: number; color: 'green' | 'yellow' | 'red' }) {
  const r = 11
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, pct)) * circ

  const stroke =
    color === 'green' ? '#16a34a'
    : color === 'yellow' ? '#d97706'
    : '#dc2626'

  const trackStroke = '#e5e7eb'

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
  const { balance, lowThreshold, balanceLoading } = useTokenBalance()

  if (balanceLoading || balance === null) return null

  const color =
    balance > lowThreshold * 3 ? 'green'
    : balance > lowThreshold ? 'yellow'
    : 'red'

  // Estimate percentage: use a soft cap of lowThreshold * 20 as "full"
  const fullMark = Math.max(lowThreshold * 20, balance + 1)
  const pct = balance / fullMark

  const approxMins = balance  // 1 token = 1 minute

  return (
    <div className="relative group flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg">
        <RingGauge pct={pct} color={color} />
        <span className={`text-xs font-medium tabular-nums ${
          color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-amber-600' : 'text-gray-700'
        }`}>
          {balance.toLocaleString()}
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none duration-[120ms] z-50 space-y-0.5">
        <p>{balance.toLocaleString()} credits remaining</p>
        <p className="text-gray-400">~{approxMins} min of sessions</p>
        {color === 'red' && <p className="text-red-400">Low balance</p>}
      </div>
    </div>
  )
}
