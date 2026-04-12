import {
  Zap,
  ClipboardCheck,
  BarChart3,
  Coins,
  Users,
  Brain,
  MessageSquare,
  Layers,
  Shuffle,
  ListChecks,
  FileText,
  Repeat2,
  GitBranch,
  type LucideIcon,
} from 'lucide-react'

export const NAV_LINKS = [
  { label: 'Why', href: '#why' },
  { label: 'Products', href: '#products' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQ', href: '#faq' },
]

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export interface FeatureCategory {
  title: string
  comingSoon: boolean
  features: Feature[]
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: 'General Agents',
    comingSoon: false,
    features: [
      {
        icon: Zap,
        title: 'Fast setup',
        description: 'Launch in minutes from a guided wizard.',
      },
      {
        icon: ClipboardCheck,
        title: 'Rubric-driven',
        description: 'Define your own evaluation criteria.',
      },
      {
        icon: BarChart3,
        title: 'Actionable reports',
        description: 'Transcripts, scores, and actionable recommendations.',
      },
      {
        icon: Coins,
        title: 'Low cost',
        description: 'Fraction of human cost, unlimited scale.',
      },
    ],
  },
  {
    title: 'QnA Assessment Agents',
    comingSoon: false,
    features: [
      {
        icon: ListChecks,
        title: 'Structured question banks',
        description: 'Fixed core questions plus a randomized pool.',
      },
      {
        icon: FileText,
        title: 'AI question generation',
        description: 'Upload docs or PDFs — AI drafts the question bank.',
      },
      {
        icon: Repeat2,
        title: 'Reproducible assessments',
        description: 'Same rubric every time — comparable results.',
      },
      {
        icon: GitBranch,
        title: 'Cross-questioning',
        description: 'One follow-up per answer to probe depth.',
      },
    ],
  },
  {
    title: 'Simulation Agents',
    comingSoon: true,
    features: [
      {
        icon: Users,
        title: 'Realistic role-play',
        description: 'Agents mimic real customers with realistic friction.',
      },
      {
        icon: Brain,
        title: 'Context-aware',
        description: 'Real-time signals: delays, interruptions, pressure.',
      },
      {
        icon: MessageSquare,
        title: 'Multi-stage scenarios',
        description: 'Multi-step sales or support journeys.',
      },
    ],
  },
  {
    title: 'Multi-Agent Sessions',
    comingSoon: true,
    features: [
      {
        icon: Layers,
        title: 'Complex environments',
        description: 'Agents as stakeholders, customers, and managers.',
      },
      {
        icon: Shuffle,
        title: 'Emergent behavior',
        description: 'Agents act independently with cross-inputs.',
      },
    ],
  },
]

export const STEPS = [
  {
    number: 1,
    title: 'Set the objective',
    description:
      '"Mock customer sales call", "Mock Frontend Interview", or any custom scenario.',
  },
  {
    number: 2,
    title: 'Define the rubric',
    description:
      'Pick or edit criteria — content, clarity, objection handling, originality.',
  },
  {
    number: 3,
    title: 'Launch & review',
    description:
      'Agents run sessions; you get detailed reports with scores and recommendations.',
  },
]

export const FAQ_ITEMS = [
  {
    question: 'How long does it take to launch an assessor?',
    answer:
      'You can launch a basic assessor in under 10 minutes with our guided wizard. Define your objective, set a rubric, and you\'re ready to go.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes — we support encryption-at-rest, role-based access, SSO and per-tenant isolation. Enterprise plans include customizable security configurations.',
  },
  {
    question: 'Can I use my company\'s rubric?',
    answer:
      'Absolutely — import or configure your rubric in the wizard. You can customize criteria, weights, and scoring scales to match your exact needs.',
  },
  {
    question: 'What languages and accents are supported?',
    answer:
      'Current support includes English (US/UK/IN), Hindi, and many more native languages. More languages are planned — contact us for priority support.',
  },
  {
    question: 'What\'s the pricing model?',
    answer:
      'We offer monthly subscriptions based on your usage needs. Trial (150 mins), Starter (1,500 mins/mo), Growth (4,000 mins/mo), and Pro (8,000 mins/mo + optional scaling) — each approximately 10 minutes per session. Contact us to explore Growth and Pro plans.',
  },
]

export const METRICS = [
  { value: '10k+', label: 'Sessions run monthly' },
  { value: '50+', label: 'Organizations' },
  { value: '40%', label: 'Faster onboarding' },
  { value: '98%', label: 'Satisfaction rate' },
]

export const TESTIMONIALS = [
  {
    quote:
      'Vivalyn cut our assessment time in half while improving consistency across all our training programs.',
    name: 'Sarah Chen',
    title: 'VP of Training, TechCorp',
  },
  {
    quote:
      'The AI assessors provide feedback that\'s as good as our best coaches — but available 24/7 at a fraction of the cost.',
    name: 'Michael Torres',
    title: 'Director of L&D, ScaleUp Inc.',
  },
  {
    quote:
      'We deployed assessor agents across 200+ reps in a week. The ROI was immediate and measurable.',
    name: 'Priya Sharma',
    title: 'Head of Sales Enablement, GrowthCo',
  },
]

export interface PricingPlan {
  name: string
  tier: 'trial' | 'starter' | 'growth' | 'pro'
  price: string
  crossedPrice: string | null
  billingLabel: string
  sessions: string
  minutes: number
  additionalRate: string | null   // overage cost per extra minute, null = not available
  scalingAvailable?: boolean      // Pro only
  note?: string
}

/** Notes attached to specific tiers regardless of currency. */
const PLAN_NOTES: Partial<Record<string, string>> = {
  trial: 'One-time only per workspace. Reach out for a free trial on your first plan purchase.',
}

const PLAN_NOTES_SHORT: Partial<Record<string, string>> = {
  trial: 'One-time only per workspace.',
}

import { fetchPlanConfig, type PlanConfigEntry } from './api'

function entryToPricingPlan(entry: PlanConfigEntry, currency: 'inr' | 'intl', short = false): PricingPlan {
  const isInr = currency === 'inr'
  const price = isInr
    ? `₹${entry.price_inr.toLocaleString('en-IN')}`
    : `$${entry.price_usd}`
  const crossedRaw = isInr ? entry.crossed_inr : entry.crossed_usd
  const crossedPrice = crossedRaw != null
    ? (isInr ? `₹${crossedRaw.toLocaleString('en-IN')}` : `$${crossedRaw}`)
    : null
  const billingLabel = entry.tier === 'trial' ? 'one-time' : '/mo'
  const additionalRate = entry.scaling_available
    ? (isInr
        ? `₹${entry.overage_rate_inr}/min`
        : `$${entry.overage_rate_usd}/min`)
    : null
  return {
    name: entry.tier.charAt(0).toUpperCase() + entry.tier.slice(1),
    tier: entry.tier as PricingPlan['tier'],
    price,
    crossedPrice,
    billingLabel,
    sessions: `~${entry.sessions}`,
    minutes: entry.minutes,
    additionalRate,
    scalingAvailable: entry.scaling_available || undefined,
    note: short ? PLAN_NOTES_SHORT[entry.tier] : PLAN_NOTES[entry.tier],
  }
}

let _planConfigCache: Awaited<ReturnType<typeof fetchPlanConfig>> | null = null

async function getPlanConfig() {
  if (!_planConfigCache) {
    _planConfigCache = await fetchPlanConfig()
  }
  return _planConfigCache
}

/** All four plans in INR — used inside the agentspace for plan comparison. */
export async function getAllPlansIn(): Promise<PricingPlan[]> {
  const config = await getPlanConfig()
  return config.plans.map(e => entryToPricingPlan(e, 'inr', true))
}

/** All four plans in USD — used inside the agentspace for plan comparison. */
export async function getAllPlansIntl(): Promise<PricingPlan[]> {
  const config = await getPlanConfig()
  return config.plans.map(e => entryToPricingPlan(e, 'intl', true))
}

/** Trial + Starter only in INR — landing page / public pricing. */
export async function getPricingPlansIn(): Promise<PricingPlan[]> {
  const config = await getPlanConfig()
  return config.plans
    .filter(e => e.tier === 'trial' || e.tier === 'starter')
    .map(e => entryToPricingPlan(e, 'inr'))
}

/** Trial + Starter only in USD — landing page / public pricing. */
export async function getPricingPlansIntl(): Promise<PricingPlan[]> {
  const config = await getPlanConfig()
  return config.plans
    .filter(e => e.tier === 'trial' || e.tier === 'starter')
    .map(e => entryToPricingPlan(e, 'intl'))
}

export const FOOTER_LINKS = {
  product: [
    { label: 'General Agents', href: '#products' },
    { label: 'QnA Assessment Agents', href: '#products' },
    { label: 'Simulation Agents', href: '#products' },
    { label: 'Pricing', href: '#pricing' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  resources: [
    { label: 'Documentation', href: '#' },
    { label: 'Case Studies', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Support', href: '#' },
  ],
}
