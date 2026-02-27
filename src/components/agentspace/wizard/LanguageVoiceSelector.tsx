import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Loader2, Volume2, VolumeX } from 'lucide-react'
import { fetchVoices, fetchVoicePreviewBlob, type LanguageVoiceOption } from '../../../lib/api'
import { FLAG_MAP, PREF_LABELS } from './voiceConfig'

interface Props {
  onContinue: (language: string, voicePreference: string, voiceName: string, personaName: string) => void
}

export default function LanguageVoiceSelector({ onContinue }: Props) {
  const [languages, setLanguages] = useState<LanguageVoiceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [selectedPref, setSelectedPref] = useState<string | null>(null)
  const [langGridOpen, setLangGridOpen] = useState(true)

  // Audio states: loadingPref = fetching blob, playingPref = actively playing
  const [loadingPref, setLoadingPref] = useState<string | null>(null)
  const [playingPref, setPlayingPref] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  // Cancellation token for in-flight fetch
  const activePlayRef = useRef<{ pref: string; cancelled: boolean } | null>(null)

  useEffect(() => {
    fetchVoices()
      .then(data => setLanguages(data.languages))
      .catch(() => {/* silently fail, show empty */})
      .finally(() => setLoading(false))
  }, [])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const filtered = languages.filter(l =>
    l.display_name.toLowerCase().includes(search.toLowerCase()) ||
    l.key.toLowerCase().includes(search.toLowerCase()),
  )

  const activeLang = languages.find(l => l.key === selectedLang) ?? null

  function handleLangSelect(key: string) {
    setSelectedLang(key)
    setSelectedPref(null)
    setPreviewError(null)
    stopAudio()
    setLangGridOpen(false)  // collapse grid
    setSearch('')
  }

  function handleChangeLang() {
    setLangGridOpen(true)
    setSelectedPref(null)
    stopAudio()
  }

  function stopAudio() {
    if (activePlayRef.current) activePlayRef.current.cancelled = true
    activePlayRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPlayingPref(null)
    setLoadingPref(null)
  }

  async function handlePlay(pref: string) {
    // Toggle off if already loading or playing this pref
    if (loadingPref === pref || playingPref === pref) {
      stopAudio()
      return
    }
    stopAudio()
    setLoadingPref(pref)
    setPreviewError(null)

    const ctx = { pref, cancelled: false }
    activePlayRef.current = ctx

    try {
      const blob = await fetchVoicePreviewBlob(selectedLang!, pref)
      if (ctx.cancelled) return

      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => { if (!ctx.cancelled) setPlayingPref(null) }
      audio.onerror = () => {
        if (!ctx.cancelled) {
          setPlayingPref(null)
          setLoadingPref(null)
          setPreviewError('Playback failed')
        }
      }

      const promise = audio.play()
      if (promise !== undefined) {
        promise
          .then(() => {
            if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) }
          })
          .catch(() => {
            if (!ctx.cancelled) {
              setLoadingPref(null)
              setPlayingPref(null)
              setPreviewError('Playback failed')
            }
          })
      } else {
        if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) }
      }
    } catch {
      if (!ctx.cancelled) {
        setLoadingPref(null)
        setPlayingPref(null)
        setPreviewError('Preview not available')
      }
    }
  }

  const selectedVoiceName = activeLang?.voices.find(v => v.preference === selectedPref)?.voice_name ?? ''
  const canContinue = !!selectedLang && !!selectedPref

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Choose Language & Voice</h2>
          <p className="text-sm text-gray-500 mb-6">
            Select the language your agent will speak and a voice to preview.
          </p>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Collapsed language row ─────────────────────────────────── */}
              <AnimatePresence>
                {!langGridOpen && activeLang && (
                  <motion.div
                    key="lang-collapsed"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden mb-4"
                  >
                    <button
                      onClick={handleChangeLang}
                      className="w-full flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 hover:bg-indigo-100 duration-[120ms] group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{FLAG_MAP[selectedLang!] ?? '🌐'}</span>
                        <span className="text-sm font-semibold text-indigo-800">{activeLang.display_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-500 group-hover:text-indigo-700 duration-[120ms]">
                        Change <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Expanded language grid ─────────────────────────────────── */}
              <AnimatePresence>
                {langGridOpen && (
                  <motion.div
                    key="lang-grid"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      placeholder="Search languages…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 mb-4 duration-[120ms]"
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-4">
                      {filtered.map(lang => {
                        const isActive = selectedLang === lang.key
                        return (
                          <button
                            key={lang.key}
                            onClick={() => handleLangSelect(lang.key)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center duration-[120ms] ${
                              isActive
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-2xl">{FLAG_MAP[lang.key] ?? '🌐'}</span>
                            <span className={`text-xs font-medium leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                              {lang.display_name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Voice selector — only when language is collapsed/selected ─ */}
              <AnimatePresence>
                {activeLang && !langGridOpen && (
                  <motion.div
                    key="voice-selector"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                        Choose a voice
                      </p>
                      <div className="grid grid-cols-4 gap-2.5">
                        {activeLang.voices.map(voice => {
                          const isVoiceActive = selectedPref === voice.preference
                          const isLoading = loadingPref === voice.preference
                          const isPlaying = playingPref === voice.preference
                          const isFemale = voice.preference.startsWith('female')
                          return (
                            <div
                              key={voice.preference}
                              onClick={() => setSelectedPref(voice.preference)}
                              className={`flex flex-col gap-3 p-3.5 rounded-xl border cursor-pointer duration-[120ms] ${
                                isVoiceActive
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {/* Name + gender badge */}
                              <div className="flex items-start justify-between gap-1.5">
                                <span className={`text-sm font-semibold leading-tight ${isVoiceActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                                  {voice.voice_name}
                                </span>
                                <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  isVoiceActive
                                    ? 'bg-indigo-100 text-indigo-500'
                                    : isFemale
                                    ? 'bg-pink-50 text-pink-400'
                                    : 'bg-sky-50 text-sky-400'
                                }`}>
                                  {isFemale ? '♀' : '♂'}
                                </span>
                              </div>
                              <span className={`text-xs -mt-1.5 ${isVoiceActive ? 'text-indigo-400' : 'text-gray-400'}`}>
                                {PREF_LABELS[voice.preference]}
                              </span>
                              {/* Preview button */}
                              <button
                                onClick={e => { e.stopPropagation(); handlePlay(voice.preference) }}
                                className={`flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg w-full duration-[120ms] ${
                                  isLoading
                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : isPlaying
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : isVoiceActive
                                    ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
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
                      {previewError && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <VolumeX className="w-3 h-3" /> {previewError}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {canContinue ? (
              <span className="text-gray-700">
                <span className="font-medium">{activeLang?.display_name}</span>
                {' · '}
                <span>{selectedVoiceName}</span>
              </span>
            ) : (
              'Select a language and voice to continue'
            )}
          </p>
          <button
            onClick={() => canContinue && onContinue(selectedLang!, selectedPref!, selectedVoiceName, selectedVoiceName)}
            disabled={!canContinue}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium duration-[120ms] ${
              canContinue
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Animated sound wave icon (shown while audio is playing)
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
