import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Orbit, ListChecks, Volume2, Link as LinkIcon } from 'lucide-react'

const STEPS = [
  {
    number: 1,
    label: 'Create',
    title: 'Choose your agent type',
    description:
      'Pick General Agent for open-ended adaptive conversations or QnA Assessment for a structured fixed question bank.',
    bullets: ['Two distinct agent types', 'Built-in conversation modes', 'Configurable in minutes'],
  },
  {
    number: 2,
    label: 'Voice & Language',
    title: 'Pick voice and language',
    description:
      'Select the language your agent speaks and choose a voice persona that fits your scenario.',
    bullets: ['Multiple languages supported', 'Natural voice personas', 'Preview before deploying'],
  },
  {
    number: 3,
    label: 'Design Agent',
    title: 'Configure persona & objective',
    description:
      'Name your agent, define its role, and write the session objective it will follow throughout the conversation.',
    bullets: ['Custom persona and role', 'Session objective guide', 'Reusable agent templates'],
  },
  {
    number: 4,
    label: 'Evaluation',
    title: 'Build the rubric',
    description:
      'Add evaluation criteria and assign weights — the agent scores every session against these consistently.',
    bullets: ['Unlimited criteria', 'Weighted scoring', 'Consistent across all sessions'],
  },
  {
    number: 5,
    label: 'Deploy',
    title: 'Share your session link',
    description:
      'Each agent gets a unique link. Candidates join instantly — no app, no account needed. Sessions run fully automatically.',
    bullets: ['One unique link per agent', 'No candidate login needed', 'Track responses in real time'],
  },
  {
    number: 6,
    label: 'Report',
    title: 'Review scores & insights',
    description:
      'Every completed session generates a rubric-based score, full transcript, and AI-written coaching recommendations.',
    bullets: ['Rubric-based scores', 'Full session transcript', 'AI coaching recommendations'],
  },
]

const SCROLL_STEP = 500 // px of scroll to advance one step

// ─── Window Chrome wrapper ────────────────────────────────────────────────────

function WindowChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-gray-400 font-medium">{title}</span>
      </div>
      <div className="flex-1 bg-white p-5 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">{children}</div>
    </div>
  )
}

// ─── Step mockups ─────────────────────────────────────────────────────────────

function CreateMockup() {
  return (
    <WindowChrome title="New Agent — Step 1 of 6">
      <div className="space-y-3 mb-4">
        {/* General — selected */}
        <div className="border-2 border-indigo-500 bg-indigo-50/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Orbit className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">General Agent</p>
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Adaptive open-ended conversation</p>
              <div className="mt-2 space-y-1">
                {['Multi-turn dialogue', 'Dynamic follow-ups'].map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs text-gray-500">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QnA — unselected */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">QnA Assessment</p>
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Structured fixed question bank</p>
              <div className="mt-2 space-y-1">
                {['Fixed core questions', 'Randomized pool'].map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Agent name</p>
        <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-700">
          Sales Coach
        </div>
      </div>
    </WindowChrome>
  )
}

function VoiceMockup() {
  const languages = ['English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Portuguese', 'German']
  const voices = [
    { initial: 'A', name: 'Aria', gender: 'Female', selected: false },
    { initial: 'M', name: 'Marcus', gender: 'Male', selected: true },
    { initial: 'P', name: 'Priya', gender: 'Female', selected: false },
    { initial: 'J', name: 'James', gender: 'Male', selected: false },
  ]

  return (
    <WindowChrome title="New Agent — Step 2 of 6">
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-2.5">
            Language
          </p>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, i) => (
              <span
                key={lang}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  i === 0
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {lang}
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400">
              +17 more
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-2.5">
            Voice
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {voices.map((v) => (
              <div
                key={v.name}
                className={`rounded-xl p-3 flex items-center gap-3 ${
                  v.selected
                    ? 'border-2 border-indigo-500 bg-indigo-50/40'
                    : 'border border-gray-200'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-indigo-700">{v.initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.gender}</p>
                </div>
                <Volume2 className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

function DesignAgentMockup() {
  return (
    <WindowChrome title="New Agent — Step 3 of 6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Agent name</p>
            <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-700">
              Sales Coach
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Role</p>
            <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-700">
              Account Executive
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Persona</p>
          <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm text-gray-600 leading-relaxed h-[80px]">
            You are a skeptical enterprise buyer evaluating software vendors. Push back on pricing and ask for proof of ROI before committing.
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Session objective</p>
          <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm text-gray-600 leading-relaxed h-[80px]">
            Conduct a cold discovery call. Surface pain points and qualify budget before discussing pricing or features.
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

function RubricMockup() {
  const criteria = [
    { label: 'Content Knowledge', pct: 35 },
    { label: 'Communication', pct: 35 },
    { label: 'Objection Handling', pct: 20 },
    { label: 'Closing Technique', pct: 10 },
  ]

  return (
    <WindowChrome title="New Agent — Step 4 of 6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-4">
          Evaluation Rubric
        </p>

        <div className="space-y-3">
          {criteria.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 w-[155px] shrink-0">{c.label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full"
                  style={{ width: `${c.pct * 2.5}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 w-8 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-xs font-semibold text-gray-900">100%</span>
        </div>

        <div className="mt-4 w-full border border-dashed border-gray-300 rounded-lg py-2.5 text-sm text-gray-400 text-center">
          + Add criterion
        </div>
      </div>
    </WindowChrome>
  )
}

function DeployMockup() {
  return (
    <WindowChrome title="Sales Coach — Live">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">Sales Coach</p>
            <p className="text-xs text-gray-500 mt-0.5">Senior Account Executive</p>
          </div>
          <span className="text-[11px] font-medium bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
            General Agent
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Session Link</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <LinkIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500 flex-1 truncate">vivalyn.in/agent/m7x4p</span>
            <span className="text-xs font-medium text-indigo-600 cursor-pointer">Copy</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sessions', value: '12' },
            { label: 'Avg score', value: '83%' },
            { label: 'Active', value: '2' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-sm font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            { name: 'Alice J.', status: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
            { name: 'Bob K.', status: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
            { name: 'Priya N.', status: 'Live', cls: 'bg-amber-50 text-amber-600' },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-medium text-indigo-700">{c.name[0]}</span>
              </div>
              <span className="text-xs text-gray-600 flex-1">{c.name}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  )
}

function ReportMockup() {
  const criteria = [
    { label: 'Content Knowledge', score: 92 },
    { label: 'Communication', score: 88 },
    { label: 'Objection Handling', score: 78 },
  ]

  return (
    <WindowChrome title="Session Report · Alice Johnson">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">Cold Call Q4</p>
            <p className="text-xs text-gray-500 mt-0.5">Sales Coach · General Agent</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-indigo-600">87</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {criteria.map((c) => (
            <div key={c.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{c.label}</span>
                <span className="font-medium text-gray-700">{c.score}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${c.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
            AI Recommendation
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">
            Acknowledge the concern before redirecting. Practice the "feel-felt-found" framework on objection handling.
          </p>
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-2">
            Transcript Snippet
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-medium text-indigo-700">A</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                "I understand your pricing concern. Let me walk you through the ROI..."
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-medium text-gray-500">C</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                "We've been burned by similar platforms before."
              </p>
            </div>
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

const MOCKUPS = [
  <CreateMockup key={0} />,
  <VoiceMockup key={1} />,
  <DesignAgentMockup key={2} />,
  <RubricMockup key={3} />,
  <DeployMockup key={4} />,
  <ReportMockup key={5} />,
]

// ─── Direction-aware slide variants ──────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -28, opacity: 0 }),
}

const slideTransition = { duration: 0.22, ease: 'easeOut' }

// ─── Main component ───────────────────────────────────────────────────────────

export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(1)
  const stickyZoneRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)

  // Scroll → step
  useEffect(() => {
    const onScroll = () => {
      if (!stickyZoneRef.current) return
      const rect = stickyZoneRef.current.getBoundingClientRect()
      const progress = -rect.top
      if (progress < 0) return
      const next = Math.min(Math.floor(progress / SCROLL_STEP), STEPS.length - 1)
      if (next !== activeRef.current) {
        setDirection(next > activeRef.current ? 1 : -1)
        activeRef.current = next
        setActive(next)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Click step circle → smooth scroll to that step's position
  const scrollToStep = useCallback((i: number) => {
    if (!stickyZoneRef.current) return
    const zoneTop = stickyZoneRef.current.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: zoneTop + i * SCROLL_STEP, behavior: 'smooth' })
  }, [])

  const step = STEPS[active]

  return (
    <section id="how-it-works" className="scroll-mt-[40px] bg-white">
      {/* Section header — scrolls normally */}
      <div className="max-w-[1100px] mx-auto px-6 pt-16 md:pt-24 pb-10 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4">
          Simple Setup
        </p>
        <h2 className="text-3xl md:text-[32px] font-semibold text-gray-900 mb-3">
          From zero to live assessment in minutes
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Six steps — scroll through to see how it works.
        </p>
      </div>

      {/* Scroll zone — sticky card lives here */}
      <div
        ref={stickyZoneRef}
        style={{ height: `calc(${(STEPS.length - 1) * SCROLL_STEP}px + 100vh)` }}
      >
        <div className="sticky top-0 h-screen flex items-center">
          <div className="max-w-[1100px] w-full mx-auto px-6">

            {/* Stepper Card */}
            <div className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

              {/* Step Bar */}
              <div className="flex items-center px-8 py-4 border-b border-gray-100 bg-white">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => scrollToStep(i)}
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-[120ms] ${
                          i === active
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                            : i < active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {i < active ? <Check className="w-4 h-4" /> : s.number}
                      </div>
                      <span
                        className={`text-[11px] font-medium mt-1.5 whitespace-nowrap hidden sm:block transition-colors duration-[120ms] ${
                          i <= active ? 'text-gray-700' : 'text-gray-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-2 transition-colors duration-300 ${
                          i < active ? 'bg-indigo-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Content Panel */}
              <div className="flex lg:flex-row flex-col lg:h-[420px]">

                {/* LHS — step info */}
                <div className="flex-[2] flex flex-col justify-center px-8 py-7 lg:border-r border-b lg:border-b-0 border-gray-100">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={active + '-lhs'}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={slideTransition}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-2.5">
                        Step {step.number} of {STEPS.length}
                      </p>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2.5 leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-5 max-w-[300px] text-sm">
                        {step.description}
                      </p>
                      <div className="space-y-2">
                        {step.bullets.map((b) => (
                          <div key={b} className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="text-sm text-gray-600">{b}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* RHS — mockup (desktop only) */}
                <div className="flex-[3] bg-gray-50 p-5 hidden lg:block">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={active + '-rhs'}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={slideTransition}
                      className="h-full"
                    >
                      {MOCKUPS[active]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding so next section doesn't immediately follow */}
      <div className="pb-16 md:pb-24" />
    </section>
  )
}
