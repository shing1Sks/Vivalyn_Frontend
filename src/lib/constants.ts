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
  type LucideIcon,
} from 'lucide-react'

export const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'Products', href: '#products' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
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
        description: 'Design your own evaluation criteria to follow.',
      },
      {
        icon: BarChart3,
        title: 'Actionable reports',
        description:
          'Conversation transcripts + scores + summarizations and recommendations.',
      },
      {
        icon: Coins,
        title: 'Low cost',
        description:
          'Fraction of human effort price; unlimited scalability.',
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
        description:
          'Agents mimic real customers with emotions, confusion, and escalation.',
      },
      {
        icon: Brain,
        title: 'Context-aware',
        description:
          'Inject real-time signals — delays, interruptions, time pressure.',
      },
      {
        icon: MessageSquare,
        title: 'Multi-stage scenarios',
        description:
          'Walk through multi-step sales or support journeys.',
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
        description:
          'Multiple agents represent stakeholders, customers, and managers.',
      },
      {
        icon: Shuffle,
        title: 'Emergent behavior',
        description:
          'Agents act independently with cross-inputs like time and stress.',
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
  tier: 'trial' | 'starter'
  price: string
  crossedPrice: string | null
  billingLabel: string
  sessions: string
  minutes: number
  note?: string
}

export const PRICING_PLANS_IN: PricingPlan[] = [
  {
    name: 'Trial',
    tier: 'trial',
    price: '₹200',
    crossedPrice: null,
    billingLabel: 'one-time',
    sessions: '~15',
    minutes: 150,
    note: 'One-time only per workspace. Reach out for a free trial on your first plan purchase.',
  },
  {
    name: 'Starter',
    tier: 'starter',
    price: '₹2,499',
    crossedPrice: '₹2,999',
    billingLabel: '/mo',
    sessions: '~150',
    minutes: 1500,
  },
]

export const PRICING_PLANS_INTL: PricingPlan[] = [
  {
    name: 'Trial',
    tier: 'trial',
    price: '₹200',
    crossedPrice: null,
    billingLabel: 'one-time · INR only',
    sessions: '~15',
    minutes: 150,
    note: 'One-time only per workspace. Reach out for a free trial on your first plan purchase.',
  },
  {
    name: 'Starter',
    tier: 'starter',
    price: '$35',
    crossedPrice: '$49',
    billingLabel: '/mo',
    sessions: '~150',
    minutes: 1500,
  },
]

export const FOOTER_LINKS = {
  product: [
    { label: 'Assessor Agents', href: '#product' },
    { label: 'Simulation Agents', href: '#product' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Roadmap', href: '#' },
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
