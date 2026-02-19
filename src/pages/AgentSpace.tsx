import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import UserAvatar from '../components/ui/UserAvatar'
import { fadeInUp, staggerContainer } from '../lib/motion'

export default function AgentSpace() {
  const { user, loading, signOut } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center max-w-md"
        >
          <motion.div variants={fadeInUp} className="mx-auto mb-6 w-fit">
            <UserAvatar size="md" email={user.email ?? ''} profile={profile} />
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome back
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-gray-500 mb-8">
            {user.email}
          </motion.p>

          <motion.button
            variants={fadeInUp}
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-[120ms] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </motion.button>
        </motion.div>
      </main>
    </div>
  )
}
