import { useState, useEffect } from 'react'
import { Pencil, X } from 'lucide-react'
import type { AdminOverview } from '../../lib/api'

const STORAGE_KEY = 'vivalyn_admin_pricing'

interface PricingInputs {
  // USD per M tokens
  llmConvInput: number
  llmConvCached: number
  llmConvOutput: number
  llmReportInput: number
  llmReportOutput: number
  // USD per minute
  sttPerMinute: number
  // USD per M chars
  ttsPerMChars: number
  // INR per minute (selling price)
  sellingPricePerMinute: number
  // exchange rate
  usdToInr: number
}

// Defaults based on actual model pricing:
//   Conv:   gpt-5-mini  — $0.25 / $0.025 / $2.00 per M tokens
//   Report: gpt-5       — $1.25 / $10.00 per M tokens
//   STT:    gpt-4o-mini-transcribe — $0.003 / min
//   TTS:    inworld-tts-1.5-mini   — $5.00 / 1M chars
const DEFAULTS: PricingInputs = {
  llmConvInput: 0.25,
  llmConvCached: 0.025,
  llmConvOutput: 2.0,
  llmReportInput: 1.25,
  llmReportOutput: 10.0,
  sttPerMinute: 0.003,
  ttsPerMChars: 5.0,
  sellingPricePerMinute: 1.0,
  usdToInr: 84,
}

interface Props {
  overview: AdminOverview
}

function InputRow({
  label,
  value,
  onChange,
  unit,
  prefix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit: string
  prefix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700 min-w-0 flex-1 truncate">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {prefix && <span className="text-xs text-gray-400">{prefix}</span>}
        <input
          type="number"
          min="0"
          step="0.001"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <span className="text-xs text-gray-400 w-20">{unit}</span>
      </div>
    </div>
  )
}

// Export so UsageCharts can read computed pricing
export function loadPricing(): PricingInputs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) }
  } catch {}
  return DEFAULTS
}

export function PricingCalculator({ overview }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [pricing, setPricing] = useState<PricingInputs>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...DEFAULTS, ...JSON.parse(stored) }
    } catch {
      console.warn('Failed to load pricing from localStorage, using defaults')
    }
    return DEFAULTS
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pricing))
  }, [pricing])

  function update(key: keyof PricingInputs, value: number) {
    setPricing((p) => ({ ...p, [key]: value }))
  }

  const r = pricing.usdToInr

  // USD costs
  const llmConvCostUsd =
    (overview.total_llm_conv_input_tokens / 1_000_000) * pricing.llmConvInput +
    (overview.total_llm_conv_cached_tokens / 1_000_000) * pricing.llmConvCached +
    (overview.total_llm_conv_output_tokens / 1_000_000) * pricing.llmConvOutput
  const llmReportCostUsd =
    (overview.total_llm_report_input_tokens / 1_000_000) * pricing.llmReportInput +
    (overview.total_llm_report_output_tokens / 1_000_000) * pricing.llmReportOutput
  const sttCostUsd = (overview.total_stt_seconds / 60) * pricing.sttPerMinute
  const ttsCostUsd = (overview.total_tts_chars / 1_000_000) * pricing.ttsPerMChars
  const totalCostUsd = llmConvCostUsd + llmReportCostUsd + sttCostUsd + ttsCostUsd
  const totalCostInr = totalCostUsd * r

  const sessionMinutes = overview.total_session_seconds / 60
  const revenueInr = sessionMinutes * pricing.sellingPricePerMinute
  const profitInr = revenueInr - totalCostInr
  const margin = revenueInr > 0 ? (profitInr / revenueInr) * 100 : null
  const costPerMinInr = sessionMinutes > 0 ? totalCostInr / sessionMinutes : 0

  const profitColor = profitInr >= 0 ? 'text-emerald-600' : 'text-red-600'
  const marginBg = margin === null ? 'bg-gray-50' : margin >= 0 ? 'bg-emerald-50' : 'bg-red-50'
  const marginColor = margin === null ? 'text-gray-500' : margin >= 0 ? 'text-emerald-700' : 'text-red-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header + summary metrics — always visible */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Pricing Calculator</span>
        <button
          onClick={() => setEditOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors duration-120"
        >
          {editOpen ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
          {editOpen ? 'Done' : 'Edit inputs'}
        </button>
      </div>

      {/* Summary cards — always visible */}
      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Cost */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Cost</p>
          <p className="text-lg font-bold text-gray-900">₹{totalCostInr.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">${totalCostUsd.toFixed(3)}</p>
          <div className="mt-2 space-y-0.5 text-xs text-gray-400">
            <p>LLM: ₹{((llmConvCostUsd + llmReportCostUsd) * r).toFixed(2)}</p>
            <p>STT: ₹{(sttCostUsd * r).toFixed(2)} · TTS: ₹{(ttsCostUsd * r).toFixed(2)}</p>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Revenue</p>
          <p className="text-lg font-bold text-gray-900">₹{revenueInr.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {sessionMinutes.toFixed(1)} min × ₹{pricing.sellingPricePerMinute}/min
          </p>
        </div>

        {/* Profit */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Profit</p>
          <p className={`text-lg font-bold ${profitColor}`}>₹{profitInr.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Cost/min: ₹{costPerMinInr.toFixed(3)}
          </p>
        </div>

        {/* Margin */}
        <div className={`${marginBg} rounded-xl p-4`}>
          <p className="text-xs text-gray-500 mb-1">Margin</p>
          <p className={`text-lg font-bold ${marginColor}`}>
            {margin === null ? '—' : `${margin.toFixed(1)}%`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            1 USD = ₹{pricing.usdToInr}
          </p>
        </div>
      </div>

      {/* Editable inputs — collapsible */}
      {editOpen && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
            {/* Left column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">Exchange Rate</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">1 USD =</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={pricing.usdToInr}
                    onChange={(e) => update('usdToInr', parseFloat(e.target.value) || 84)}
                    className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-400 w-20">₹</span>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LLM Conv (gpt-5-mini)</p>
              <InputRow label="Input" value={pricing.llmConvInput} onChange={(v) => update('llmConvInput', v)} prefix="$" unit="/ M tokens" />
              <InputRow label="Cached" value={pricing.llmConvCached} onChange={(v) => update('llmConvCached', v)} prefix="$" unit="/ M tokens" />
              <InputRow label="Output" value={pricing.llmConvOutput} onChange={(v) => update('llmConvOutput', v)} prefix="$" unit="/ M tokens" />

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">LLM Report (gpt-5)</p>
              <InputRow label="Input" value={pricing.llmReportInput} onChange={(v) => update('llmReportInput', v)} prefix="$" unit="/ M tokens" />
              <InputRow label="Output" value={pricing.llmReportOutput} onChange={(v) => update('llmReportOutput', v)} prefix="$" unit="/ M tokens" />
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">STT / TTS</p>
              <InputRow label="STT (gpt-4o-mini-transcribe)" value={pricing.sttPerMinute} onChange={(v) => update('sttPerMinute', v)} prefix="$" unit="/ minute" />
              <InputRow label="TTS (inworld-tts-1.5-mini)" value={pricing.ttsPerMChars} onChange={(v) => update('ttsPerMChars', v)} prefix="$" unit="/ M chars" />

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenue</p>
                <InputRow label="Selling Price" value={pricing.sellingPricePerMinute} onChange={(v) => update('sellingPricePerMinute', v)} prefix="₹" unit="/ minute" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
