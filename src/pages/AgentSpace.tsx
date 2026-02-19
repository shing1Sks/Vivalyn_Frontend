import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AgentSpaceProvider, useAgentSpace } from '../context/AgentSpaceContext'
import AgentSpaceHeader from '../components/agentspace/AgentSpaceHeader'
import CreateAgentSpaceModal from '../components/agentspace/CreateAgentSpaceModal'
import { fadeInUp, staggerContainer } from '../lib/motion'

function AgentSpaceContent() {
  const { activeSpace, spacesLoading, spacesError } = useAgentSpace()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (spacesLoading) {
    return (
      <>
        <AgentSpaceHeader onSignOut={handleSignOut} onCreateSpaceClick={() => setCreateOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
      </>
    )
  }

  if (spacesError) {
    return (
      <>
        <AgentSpaceHeader onSignOut={handleSignOut} onCreateSpaceClick={() => setCreateOpen(true)} />
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-red-500">{spacesError}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <AgentSpaceHeader onSignOut={handleSignOut} onCreateSpaceClick={() => setCreateOpen(true)} />

      <main className="flex-1 px-6 py-8">
        {activeSpace ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>
              <h1 className="text-xl font-semibold text-gray-900">{activeSpace.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeSpace.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center min-h-[60vh]"
          >
            <motion.div variants={fadeInUp} className="text-center">
              <p className="text-gray-500 mb-4 text-sm">You have no AgentSpaces yet.</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-120 cursor-pointer"
              >
                Create your first AgentSpace
              </button>
            </motion.div>
          </motion.div>
        )}
      </main>

      <CreateAgentSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => setCreateOpen(false)}
      />
    </>
  )
}

export default function AgentSpace() {
  const { user, loading } = useAuth()
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

  return (
    <AgentSpaceProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <AgentSpaceContent />
      </div>
    </AgentSpaceProvider>
  )
}
