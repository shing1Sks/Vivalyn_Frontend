import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { fetchAgentSpaces, createAgentSpace } from '../lib/api'
import type { AgentSpace, CreateAgentSpacePayload } from '../lib/api'

const LS_KEY = 'vivalyn_last_agentspace_id'

interface AgentSpaceContextType {
  spaces: AgentSpace[]
  activeSpace: AgentSpace | null
  spacesLoading: boolean
  spacesError: string | null
  switchSpace: (spaceId: string) => void
  createSpace: (payload: CreateAgentSpacePayload) => Promise<AgentSpace>
  refetchSpaces: () => Promise<void>
}

const AgentSpaceContext = createContext<AgentSpaceContextType | undefined>(undefined)

export function AgentSpaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [spaces, setSpaces] = useState<AgentSpace[]>([])
  const [activeSpace, setActiveSpace] = useState<AgentSpace | null>(null)
  const [spacesLoading, setSpacesLoading] = useState(false)
  const [spacesError, setSpacesError] = useState<string | null>(null)

  const loadSpaces = useCallback(async () => {
    if (!session?.access_token) return
    setSpacesLoading(true)
    setSpacesError(null)
    try {
      const fetched = await fetchAgentSpaces(session.access_token)
      setSpaces(fetched)

      const lastId = localStorage.getItem(LS_KEY)
      const lastSpace = lastId ? fetched.find((s) => s.id === lastId) ?? null : null
      const resolved = lastSpace ?? fetched[0] ?? null

      setActiveSpace(resolved)
      if (resolved) {
        localStorage.setItem(LS_KEY, resolved.id)
      }
    } catch (e) {
      setSpacesError(e instanceof Error ? e.message : 'Failed to load spaces')
    } finally {
      setSpacesLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    loadSpaces()
  }, [loadSpaces])

  function switchSpace(spaceId: string) {
    const target = spaces.find((s) => s.id === spaceId)
    if (!target) return
    setActiveSpace(target)
    localStorage.setItem(LS_KEY, spaceId)
  }

  async function createSpace(payload: CreateAgentSpacePayload): Promise<AgentSpace> {
    if (!session?.access_token) throw new Error('Not authenticated')
    const newSpace = await createAgentSpace(session.access_token, payload)
    setSpaces((prev) => [...prev, newSpace])
    setActiveSpace(newSpace)
    localStorage.setItem(LS_KEY, newSpace.id)
    return newSpace
  }

  return (
    <AgentSpaceContext.Provider
      value={{
        spaces,
        activeSpace,
        spacesLoading,
        spacesError,
        switchSpace,
        createSpace,
        refetchSpaces: loadSpaces,
      }}
    >
      {children}
    </AgentSpaceContext.Provider>
  )
}

export function useAgentSpace() {
  const ctx = useContext(AgentSpaceContext)
  if (!ctx) throw new Error('useAgentSpace must be used within an AgentSpaceProvider')
  return ctx
}
