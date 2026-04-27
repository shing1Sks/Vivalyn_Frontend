import { motion } from 'framer-motion'
import { CheckCircle, Loader2, FileText } from 'lucide-react'

interface EndedScreenProps {
  agentName: string
  turnCount: number
  isGeneratingReport?: boolean
  reportAvailable?: boolean
  onViewReport?: () => void
  hideReport?: boolean
}

export default function EndedScreen({
  agentName,
  turnCount,
  isGeneratingReport = false,
  reportAvailable = false,
  onViewReport,
  hideReport = false,
}: EndedScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">Session ended</h1>
        <p className="text-sm text-gray-500 mb-1">
          You spoke with <span className="font-medium text-gray-700">{agentName}</span>
        </p>
        {turnCount > 0 && (
          <p className="text-xs text-gray-400">
            {turnCount} exchange{turnCount !== 1 ? 's' : ''} in this session
          </p>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          {hideReport ? (
            <p className="text-sm text-gray-500">Thank you for joining.</p>
          ) : isGeneratingReport ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                Generating your report…
              </div>
              <p className="text-xs text-gray-300">This usually takes a few seconds</p>
            </div>
          ) : reportAvailable ? (
            <button
              onClick={onViewReport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 duration-[120ms]"
            >
              <FileText className="w-4 h-4" />
              View Report
            </button>
          ) : (
            <p className="text-xs text-gray-400">
              Your conversation transcript has been saved.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
