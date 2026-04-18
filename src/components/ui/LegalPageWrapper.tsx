import { useEffect } from 'react'
import Header from '../layout/Header'
import Footer from '../layout/Footer'

interface Props {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalPageWrapper({ title, lastUpdated, children }: Props) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: {lastUpdated}</p>
          <div className="space-y-8">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
