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
  { label: 'Product', href: '#product' },
  { label: 'Use Cases', href: '#use-cases' },
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
    title: 'Assessor Agents',
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
      'We offer pay-per-use pricing based on your plan. Contact our sales team for enterprise pilot pricing and volume discounts.',
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
