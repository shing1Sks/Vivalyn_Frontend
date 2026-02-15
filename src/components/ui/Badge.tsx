interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export default function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full ${className}`}
    >
      {children}
    </span>
  )
}
