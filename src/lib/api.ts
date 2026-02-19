const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export interface UserProfile {
  id: string
  is_admin: boolean
  profile_pic_gradient: string | null
  profile_pic_link: string | null
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/api/v1/profile/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

// ── AgentSpace ────────────────────────────────────────────────────────────────

export interface AgentSpace {
  id: string
  name: string
  role: string
}

export interface CreateAgentSpacePayload {
  name: string
}

export async function fetchAgentSpaces(accessToken: string): Promise<AgentSpace[]> {
  const res = await fetch(`${BASE}/api/v1/agentspaces`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch agentspaces')
  const data: { spaces: AgentSpace[] } = await res.json()
  return data.spaces
}

export async function createAgentSpace(
  accessToken: string,
  payload: CreateAgentSpacePayload,
): Promise<AgentSpace> {
  const res = await fetch(`${BASE}/api/v1/agentspaces`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Failed to create agentspace')
  }
  return res.json()
}
