const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export interface UserProfile {
  id: string
  is_admin: boolean
  profile_pic_gradient: string | null
  profile_pic_link: string | null
  name: string
  email: string
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/api/v1/profile/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new ApiError('Failed to fetch profile', res.status)
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

// ── Members ───────────────────────────────────────────────────────────────────

export interface AgentSpaceMember {
  user_id: string
  email: string
  name: string
  role: string
  profile_pic_gradient: string | null
  profile_pic_link: string | null
  joined_at: string
}

export async function fetchAgentSpaceMembers(
  accessToken: string,
  agentspaceId: string,
): Promise<AgentSpaceMember[]> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/members`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to fetch members', res.status)
  }
  const data: { members: AgentSpaceMember[] } = await res.json()
  return data.members
}

export async function changeAgentSpaceMemberRole(
  accessToken: string,
  agentspaceId: string,
  userId: string,
  role: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/members/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to change role', res.status)
  }
}

export async function removeAgentSpaceMember(
  accessToken: string,
  agentspaceId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to remove member', res.status)
  }
}

// ── Invites ───────────────────────────────────────────────────────────────────

export interface Invite {
  id: string
  agentspace_id: string
  agentspace_name: string
  invited_email: string
  invited_by_name: string
  invited_by_email: string
  role: string
  status: string
  is_expired: boolean
  created_at: string
  expires_at: string
}

export async function fetchAgentSpaceInvites(
  accessToken: string,
  agentspaceId: string,
): Promise<Invite[]> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/invites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to fetch invites', res.status)
  }
  const data: { invites: Invite[] } = await res.json()
  return data.invites
}

export async function createInvite(
  accessToken: string,
  agentspaceId: string,
  invited_email: string,
  role: string,
): Promise<Invite> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invited_email, role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to send invite', res.status)
  }
  return res.json()
}

export async function revokeInvite(
  accessToken: string,
  agentspaceId: string,
  inviteId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/invites/${inviteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to revoke invite', res.status)
  }
}

export async function fetchInboxInvites(accessToken: string): Promise<Invite[]> {
  const res = await fetch(`${BASE}/api/v1/invites/inbox`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to fetch inbox', res.status)
  }
  const data: { invites: Invite[] } = await res.json()
  return data.invites
}

export async function fetchInviteDetails(inviteId: string): Promise<Invite> {
  const res = await fetch(`${BASE}/api/v1/invites/${inviteId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Invite not found', res.status)
  }
  return res.json()
}

export async function acceptInvite(
  accessToken: string,
  inviteId: string,
): Promise<{ agentspace_id: string; agentspace_name: string }> {
  const res = await fetch(`${BASE}/api/v1/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to accept invite', res.status)
  }
  return res.json()
}
