interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
  bgSoft?: boolean
}

export default function SectionWrapper({
  children,
  className = '',
  id,
  bgSoft = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`py-16 md:py-24 ${bgSoft ? 'bg-gray-50' : 'bg-white'} ${className}`}
    >
      <div className="max-w-[1200px] mx-auto px-6">{children}</div>
    </section>
  )
}
