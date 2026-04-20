import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useAgentSpace } from './AgentSpaceContext'
import { fetchTokenBalance, fetchAgentspaceSubscription } from '../lib/api'
import type { TokenBalance, AgentspaceSubscription } from '../lib/api'

interface TokenContextValue {
  balance: number | null
  lowThreshold: number
  balanceLoading: boolean
  refetchBalance: () => void
  minutesIncluded: number | null
  scalingEnabled: boolean
  overflowMinutes: number
  hasSubscription: boolean
  subscriptionActive: boolean
}

const TokenContext = createContext<TokenContextValue>({
  balance: null,
  lowThreshold: 10,
  balanceLoading: false,
  refetchBalance: () => {},
  minutesIncluded: null,
  scalingEnabled: false,
  overflowMinutes: 0,
  hasSubscription: false,
  subscriptionActive: false,
})

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()
  const [data, setData] = useState<TokenBalance | null>(null)
  const [subscription, setSubscription] = useState<AgentspaceSubscription | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    const token = session?.access_token
    const spaceId = activeSpace?.id
    if (!token || !spaceId) {
      setData(null)
      setSubscription(null)
      return
    }
    setLoading(true)
    Promise.all([
      fetchTokenBalance(token, spaceId),
      fetchAgentspaceSubscription(token, spaceId),
    ])
      .then(([balanceData, subData]) => {
        setData(balanceData)
        setSubscription(subData)
      })
      .catch(() => {
        setData(null)
        setSubscription(null)
      })
      .finally(() => setLoading(false))
  }, [session?.access_token, activeSpace?.id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <TokenContext.Provider
      value={{
        balance: data?.balance ?? null,
        lowThreshold: data?.low_balance_threshold ?? 10,
        balanceLoading: loading,
        refetchBalance: load,
        minutesIncluded: subscription?.has_subscription ? subscription.minutes_included : null,
        scalingEnabled: subscription?.scaling_enabled ?? false,
        overflowMinutes: subscription?.overflow_minutes ?? 0,
        hasSubscription: subscription?.has_subscription ?? false,
        subscriptionActive: subscription?.status === 'active',
      }}
    >
      {children}
    </TokenContext.Provider>
  )
}

export function useTokenBalance() {
  return useContext(TokenContext)
}
