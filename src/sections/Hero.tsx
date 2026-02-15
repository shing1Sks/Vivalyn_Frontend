import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer } from "../lib/motion";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

interface Scenario {
  badge: string;
  title: string;
  score: number;
  criteria: { label: string; score: number }[];
  recommendation: string;
  transcript: {
    agent: { label: string; text: string };
    user: { label: string; text: string };
  };
}

const SCENARIOS: Scenario[] = [
  {
    badge: "Sales",
    title: "Mock Sales Call — Round 3",
    score: 87,
    criteria: [
      { label: "Content Knowledge", score: 92 },
      { label: "Objection Handling", score: 78 },
      { label: "Communication", score: 88 },
      { label: "Closing Technique", score: 81 },
    ],
    recommendation:
      'Strengthen objection handling by acknowledging concerns before redirecting. Practice the "feel-felt-found" framework.',
    transcript: {
      agent: {
        label: "Rep",
        text: '"I understand your concern about pricing. Let me walk you through the ROI we\'ve seen..."',
      },
      user: {
        label: "Customer",
        text: "\"That's helpful, but we've been burned by similar platforms before...\"",
      },
    },
  },
  {
    badge: "Support",
    title: "Customer Escalation — Tier 2",
    score: 74,
    criteria: [
      { label: "Empathy & Tone", score: 82 },
      { label: "Issue Resolution", score: 68 },
      { label: "De-escalation", score: 71 },
      { label: "Follow-up Actions", score: 76 },
    ],
    recommendation:
      "Lead with empathy before jumping to solutions. Mirror the customer's frustration, then transition to resolution steps.",
    transcript: {
      agent: {
        label: "Agent",
        text: "\"I'm really sorry you're dealing with this. Let me look into your account right away...\"",
      },
      user: {
        label: "Customer",
        text: '"I\'ve called three times already and nobody has fixed this issue!"',
      },
    },
  },
  {
    badge: "Education",
    title: "Viva Assessment — CS Module",
    score: 91,
    criteria: [
      { label: "Conceptual Clarity", score: 95 },
      { label: "Problem Solving", score: 88 },
      { label: "Communication", score: 92 },
      { label: "Critical Thinking", score: 89 },
    ],
    recommendation:
      "Excellent depth on core concepts. Work on articulating trade-offs between approaches when discussing system design.",
    transcript: {
      agent: {
        label: "Student",
        text: '"A binary search tree maintains sorted order, which gives us O(log n) lookup in the average case..."',
      },
      user: {
        label: "Examiner",
        text: '"Good. Now what happens in the worst case?"',
      },
    },
  },
];

const CYCLE_INTERVAL = 8000;

const cardVariants = {
  enter: { opacity: 0, x: 8 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

const barVariants = {
  hidden: { width: 0 },
  visible: (score: number) => ({
    width: `${score}%`,
    transition: { duration: 0.6, ease: "easeOut" as const, delay: 0.15 },
  }),
};

function MockReportCard({ scenario }: { scenario: Scenario }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Assessment Report
            </p>
            <span className="text-[10px] font-medium uppercase tracking-wide bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              {scenario.badge}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {scenario.title}
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
          <span className="text-xl font-bold text-indigo-600">
            {scenario.score}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {scenario.criteria.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium text-gray-900">{item.score}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-600 rounded-full"
                variants={barVariants}
                initial="hidden"
                animate="visible"
                custom={item.score}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">
          Key Recommendation
        </p>
        <p className="text-sm text-gray-700">{scenario.recommendation}</p>
      </div>
    </div>
  );
}

function MockTranscriptCard({ scenario }: { scenario: Scenario }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">
        Live Transcript
      </p>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-indigo-100 shrink-0 flex items-center justify-center">
            <span className="text-[10px] font-medium text-indigo-700">
              {scenario.transcript.agent.label[0]}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {scenario.transcript.agent.text}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0 flex items-center justify-center">
            <span className="text-[10px] font-medium text-gray-600">
              {scenario.transcript.user.label[0]}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {scenario.transcript.user.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  running,
  duration,
}: {
  running: boolean;
  duration: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    if (!running) {
      el.style.transition = "none";
      el.style.width = "0%";
      return;
    }

    // Reset to 0 without transition, then animate to 100%
    el.style.transition = "none";
    el.style.width = "0%";

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (barRef.current) {
          barRef.current.style.transition = `width ${duration}ms linear`;
          barRef.current.style.width = "100%";
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [running, duration]);

  return (
    <div
      style={{
        height: "4px",
        borderRadius: "4px",
        backgroundColor: "#e5e7eb",
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      <div
        ref={barRef}
        style={{
          height: "100%",
          width: "0%",
          backgroundColor: "#4f46e5",
          borderRadius: "4px",
        }}
      />
    </div>
  );
}

function ScenarioTabs({
  scenarios,
  active,
  onSelect,
  cycleKey,
}: {
  scenarios: Scenario[];
  active: number;
  onSelect: (i: number) => void;
  cycleKey: number;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
      {scenarios.map((s, i) => {
        const isActive = i === active;
        return (
          <button
            key={s.badge}
            onClick={() => onSelect(i)}
            style={{
              flex: 1,
              cursor: "pointer",
              borderRadius: "8px",
              padding: "10px 12px",
              textAlign: "left",
              border: isActive ? "1px solid #c7d2fe" : "1px solid transparent",
              backgroundColor: isActive ? "#eef2ff" : "#f9fafb",
              transition: "background-color 120ms, border-color 120ms",
            }}
            aria-label={`Show ${s.badge} scenario`}
          >
            <span
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 500,
                color: isActive ? "#4338ca" : "#6b7280",
              }}
            >
              {s.badge}
            </span>
            <ProgressBar
              key={isActive ? cycleKey : `idle-${i}`}
              running={isActive}
              duration={CYCLE_INTERVAL}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  const goTo = useCallback((i: number) => {
    setActiveIndex(i);
    setCycleKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SCENARIOS.length);
      setCycleKey((k) => k + 1);
    }, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [cycleKey]);

  const scenario = SCENARIOS[activeIndex];

  return (
    <section className="bg-white pt-10 md:pt-[24px] pb-60 md:pb-50">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={fadeInUp}>
              <Badge>AI Training Agents</Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-[56px] font-semibold leading-tight tracking-tight text-gray-900"
            >
              Realistic training & automated assessments — at scale
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-gray-600 max-w-[55ch]"
            >
              Build assessor and simulator agents in minutes to train reps, run
              mock calls, and generate detailed feedback — without hiring
              hundreds of coaches.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap gap-4 pt-2"
            >
              <Button variant="primary">Get a demo</Button>
              <Button variant="secondary">Request pilot pricing</Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <MockReportCard scenario={scenario} />
                <MockTranscriptCard scenario={scenario} />
              </motion.div>
            </AnimatePresence>
            <ScenarioTabs
              scenarios={SCENARIOS}
              active={activeIndex}
              onSelect={goTo}
              cycleKey={cycleKey}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
