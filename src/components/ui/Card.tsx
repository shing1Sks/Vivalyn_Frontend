interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export default function Card({
  children,
  className = '',
  hoverable = true,
}: CardProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm transition-all duration-[180ms] ${
        hoverable ? 'hover:shadow-md hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
