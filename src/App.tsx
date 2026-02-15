import Header from './components/layout/Header'
import Hero from './sections/Hero'
import ProblemStatement from './sections/ProblemStatement'
import SolutionSummary from './sections/SolutionSummary'
import FeatureGrid from './sections/FeatureGrid'
import HowItWorks from './sections/HowItWorks'
import ReportPreview from './sections/ReportPreview'
import SocialProof from './sections/SocialProof'
import FAQ from './sections/FAQ'
import CTASection from './sections/CTASection'
import Footer from './components/layout/Footer'

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <ProblemStatement />
        <SolutionSummary />
        <FeatureGrid />
        <HowItWorks />
        <ReportPreview />
        <SocialProof />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
