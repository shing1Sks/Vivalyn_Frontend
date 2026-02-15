import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/30',
  secondary:
    'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50',
  ghost:
    'bg-transparent text-indigo-600 hover:bg-indigo-50',
}

type ButtonProps = {
  variant?: Variant
  className?: string
  href?: string
  children: React.ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'>

export default function Button({
  variant = 'primary',
  className = '',
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center px-5 py-3 font-medium rounded-lg transition-all duration-[120ms] cursor-pointer ${variantClasses[variant]} ${className}`

  if (href) {
    return (
      <a href={href} className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
