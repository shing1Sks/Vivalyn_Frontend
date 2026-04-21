import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Volume2, X } from 'lucide-react'
import {
  fetchVoices,
  fetchVoicePreviewBlob,
  updateAgent,
  type LanguageVoiceOption,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'

interface Props {
  agentId: string
  agentLanguage: string
  agentVoice: string
  open: boolean
  onClose: () => void
  onUpdated: (lang: string, voice: string) => void
}

export default function VoiceSettingsModal({
  agentId, agentLanguage, agentVoice, open, onClose, onUpdated,
}: Props) {
  const { session } = useAuth()
  const [languages, setLanguages] = useState<LanguageVoiceOption[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [selectedLang, setSelectedLang] = useState(agentLanguage)
  const [selectedPref, setSelectedPref] = useState<string | null>(null)
  const [selectedVoiceName, setSelectedVoiceName] = useState(agentVoice)
  const [updating, setUpdating] = useState(false)

  const [loadingPref, setLoadingPref] = useState<string | null>(null)
  const [playingPref, setPlayingPref] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const activePlayRef = useRef<{ pref: string; cancelled: boolean } | null>(null)

  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }
  }, [])

  useEffect(() => {
    if (!open) {
      stopAudio()
      setSelectedLang(agentLanguage)
      setSelectedPref(null)
      setSelectedVoiceName(agentVoice)
      return
    }
    if (languages.length > 0) {
      applyCurrentPref(languages)
      return
    }
    setLoadingVoices(true)
    fetchVoices()
      .then(data => {
        setLanguages(data.languages)
        applyCurrentPref(data.languages)
      })
      .catch(() => {})
      .finally(() => setLoadingVoices(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function stopAudio() {
    if (activePlayRef.current) activePlayRef.current.cancelled = true
    activePlayRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setPlayingPref(null)
    setLoadingPref(null)
  }

  async function handlePlay(pref: string) {
    if (loadingPref === pref || playingPref === pref) { stopAudio(); return }
    stopAudio()
    setLoadingPref(pref)
    const ctx = { pref, cancelled: false }
    activePlayRef.current = ctx
    try {
      const blob = await fetchVoicePreviewBlob(selectedLang, pref)
      if (ctx.cancelled) return
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { if (!ctx.cancelled) setPlayingPref(null) }
      const promise = audio.play()
      if (promise !== undefined) {
        promise
          .then(() => { if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) } })
          .catch(() => { if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(null) } })
      } else {
        if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) }
      }
    } catch {
      if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(null) }
    }
  }

  function applyCurrentPref(langs: LanguageVoiceOption[]) {
    const currentLangOption = langs.find(l => l.key === agentLanguage)
    const matched = currentLangOption?.voices.find(v => v.voice_name === agentVoice)
    setSelectedPref(matched?.preference ?? null)
  }

  async function handleUpdate() {
    if (!session || !selectedPref) return
    setUpdating(true)
    try {
      await updateAgent(session.access_token, agentId, {
        agent_language: selectedLang,
        agent_voice: selectedVoiceName,
      })
      onUpdated(selectedLang, selectedVoiceName)
      onClose()
      stopAudio()
    } catch { /* silent */ } finally {
      setUpdating(false)
    }
  }

  const activeLangOption = languages.find(l => l.key === selectedLang)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Voice & Language</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 duration-[120ms]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                {loadingVoices ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* Language select */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Language</label>
                      <select
                        value={selectedLang}
                        onChange={e => {
                          setSelectedLang(e.target.value)
                          setSelectedPref(null)
                          stopAudio()
                        }}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white duration-[120ms]"
                      >
                        {languages.map(l => (
                          <option key={l.key} value={l.key}>
                            {l.display_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Voice options */}
                    {activeLangOption && (
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Voice</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {activeLangOption.voices.map(voice => {
                            const isActive = selectedPref === voice.preference
                            const isLoading = loadingPref === voice.preference
                            const isPlaying = playingPref === voice.preference
                            const personaName = voice.voice_name
                            const isFemale = voice.preference.startsWith('female')
                            return (
                              <div
                                key={voice.preference}
                                onClick={() => {
                                  setSelectedPref(voice.preference)
                                  setSelectedVoiceName(voice.voice_name)
                                }}
                                className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer duration-[120ms] ${
                                  isActive
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className={`text-sm font-semibold leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                                    {personaName}
                                  </span>
                                  <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    isActive
                                      ? 'bg-indigo-100 text-indigo-500'
                                      : isFemale
                                      ? 'bg-pink-50 text-pink-400'
                                      : 'bg-sky-50 text-sky-400'
                                  }`}>
                                    {isFemale ? '♀' : '♂'}
                                  </span>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); handlePlay(voice.preference) }}
                                  className={`flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg w-full duration-[120ms] ${
                                    isLoading ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : isPlaying ? 'bg-indigo-100 text-indigo-700'
                                    : isActive ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  }`}
                                >
                                  {isLoading ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" />Loading</>
                                  ) : isPlaying ? (
                                    <><SoundWave />Stop</>
                                  ) : (
                                    <><Volume2 className="w-3 h-3" />Preview</>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg duration-[120ms]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!selectedPref || updating}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms]"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Update Voice
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function SoundWave() {
  return (
    <span className="flex items-end gap-[2px] h-3">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className="w-[3px] bg-indigo-600 rounded-full animate-bounce"
          style={{ height: `${[60, 100, 70][i - 1]}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </span>
  )
}
