import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Clock, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchInviteDetails, acceptInvite, ApiError } from '../lib/api'
import type { Invite } from '../lib/api'
import Logo from '../components/ui/Logo'
import { fadeInUp, staggerContainer } from '../lib/motion'

export default function InviteAccept() {
  const { inviteId } = useParams<{ inviteId: string }>()
  const { user, session, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<Invite | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!inviteId) return
    fetchInviteDetails(inviteId)
      .then(setInvite)
      .catch((e: ApiError | Error) => {
        setLoadError(e instanceof ApiError && e.status === 404 ? 'This invite link is invalid or no longer exists.' : 'Failed to load invite.')
      })
  }, [inviteId])

  async function handleAccept() {
    if (!session?.access_token || !inviteId) return
    setAccepting(true)
    setAcceptError(null)
    try {
      await acceptInvite(session.access_token, inviteId)
      setAccepted(true)
      setTimeout(() => navigate('/agent-space', { replace: true }), 2000)
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  const isLoading = authLoading || (!invite && !loadError)

  // ── Derived state ──────────────────────────────────────────────────────────
  const isExpiredOrRevoked = invite && (invite.is_expired || invite.status === 'revoked')
  const isAlreadyAccepted = invite && invite.status === 'accepted'
  const emailMismatch = user && invite && user.email?.toLowerCase() !== invite.invited_email.toLowerCase()
  const canAccept = invite && !isExpiredOrRevoked && !isAlreadyAccepted && !emailMismatch && invite.status === 'pending'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-6 py-12">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[440px]"
      >
        {/* Logo */}
        <motion.div variants={fadeInUp} className="flex justify-center mb-10">
          <Link to="/">
            <Logo />
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div variants={fadeInUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
          )}

          {loadError && (
            <div className="text-center py-4">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-gray-900 mb-1">Invalid invite</h2>
              <p className="text-sm text-gray-500">{loadError}</p>
              <Link to="/" className="inline-block mt-6 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Go to homepage
              </Link>
            </div>
          )}

          {accepted && (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-gray-900 mb-1">You're in!</h2>
              <p className="text-sm text-gray-500">Redirecting you to {invite?.agentspace_name}…</p>
            </div>
          )}

          {invite && !accepted && !loadError && (
            <>
              {/* Invite details */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Invitation</p>
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">{invite.agentspace_name}</h2>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-5">
                <span className="font-medium text-gray-900">{invite.invited_by_name}</span>
                {' '}has invited you to join{' '}
                <span className="font-medium text-gray-900">{invite.agentspace_name}</span>
                {' '}as{' '}
                <span className="font-medium text-gray-900">{invite.role === 'admin' ? 'an Admin' : 'a Member'}</span>.
              </p>

              {/* Role + status pills */}
              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  {invite.role === 'admin' ? 'Admin' : 'Member'}
                </span>
                {isAlreadyAccepted && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                    Already accepted
                  </span>
                )}
                {invite.status === 'revoked' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                    Revoked
                  </span>
                )}
                {invite.is_expired && invite.status !== 'revoked' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    Expired
                  </span>
                )}
              </div>

              {/* State: expired or revoked */}
              {isExpiredOrRevoked && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
                  {invite.status === 'revoked'
                    ? 'This invitation has been revoked by the workspace admin.'
                    : 'This invitation has expired. Ask the admin to send a new invite.'}
                </div>
              )}

              {/* State: already accepted */}
              {isAlreadyAccepted && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                  You've already joined this workspace.{' '}
                  <button
                    onClick={() => navigate('/agent-space')}
                    className="font-medium underline hover:no-underline cursor-pointer"
                  >
                    Open it
                  </button>
                </div>
              )}

              {/* State: wrong email */}
              {emailMismatch && !isExpiredOrRevoked && !isAlreadyAccepted && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  This invite was sent to <span className="font-medium">{invite.invited_email}</span>. You're signed in as <span className="font-medium">{user?.email}</span>.
                </div>
              )}

              {/* State: not logged in */}
              {!user && !authLoading && canAccept && (
                <div className="space-y-3">
                  <Link
                    to={`/auth?next=/invite/${inviteId}`}
                    className="flex items-center justify-center w-full py-3 px-5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms] text-sm"
                  >
                    Sign in to accept
                  </Link>
                  <p className="text-center text-xs text-gray-400">
                    New to Vivalyn?{' '}
                    <Link
                      to={`/auth?next=/invite/${inviteId}`}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              )}

              {/* State: logged in, can accept */}
              {user && canAccept && (
                <div className="space-y-3">
                  {acceptError && (
                    <p className="text-sm text-red-600">{acceptError}</p>
                  )}
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="flex items-center justify-center gap-2 w-full py-3 px-5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-[120ms] text-sm cursor-pointer"
                  >
                    {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Accept invitation
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    Signed in as <span className="font-medium text-gray-600">{user.email}</span>
                  </p>
                </div>
              )}
            </>
          )}

        </motion.div>
      </motion.div>
    </div>
  )
}
