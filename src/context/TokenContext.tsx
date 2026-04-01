import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useAgentSpace } from './AgentSpaceContext'
import { fetchTokenBalance } from '../lib/api'
import type { TokenBalance } from '../lib/api'

interface TokenContextValue {
  balance: number | null
  lowThreshold: number
  balanceLoading: boolean
  refetchBalance: () => void
}

const TokenContext = createContext<TokenContextValue>({
  balance: null,
  lowThreshold: 10,
  balanceLoading: false,
  refetchBalance: () => {},
})

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()
  const [data, setData] = useState<TokenBalance | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    const token = session?.access_token
    const spaceId = activeSpace?.id
    if (!token || !spaceId) {
      setData(null)
      return
    }
    setLoading(true)
    fetchTokenBalance(token, spaceId)
      .then(setData)
      .catch(() => setData(null))
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
      }}
    >
      {children}
    </TokenContext.Provider>
  )
}

export function useTokenBalance() {
  return useContext(TokenContext)
}
