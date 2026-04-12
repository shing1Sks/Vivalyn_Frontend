import Header from '../components/layout/Header'
import Hero from '../sections/Hero'
import ProblemSolution from '../sections/ProblemSolution'
import FeatureGrid from '../sections/FeatureGrid'
import HowItWorks from '../sections/HowItWorks'
import Pricing from '../sections/Pricing'
import SocialProof from '../sections/SocialProof'
import FAQ from '../sections/FAQ'
import CTASection from '../sections/CTASection'
import Footer from '../components/layout/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <FeatureGrid />
        <HowItWorks />
        <Pricing />
        <SocialProof />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
