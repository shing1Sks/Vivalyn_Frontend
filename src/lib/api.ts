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

// ── Voices ────────────────────────────────────────────────────────────────────

export interface VoiceOption {
  preference: string
  voice_name: string  // internal wavenet code — not displayed in UI
}

export interface LanguageVoiceOption {
  key: string
  display_name: string
  voices: VoiceOption[]
}

export async function fetchVoices(): Promise<{ languages: LanguageVoiceOption[] }> {
  const res = await fetch(`${BASE}/api/v1/voices`)
  if (!res.ok) throw new ApiError('Failed to fetch voices', res.status)
  return res.json()
}

export async function fetchVoicePreviewBlob(language: string, voicePref: string): Promise<Blob> {
  const res = await fetch(`${BASE}/api/v1/voices/${language}/${voicePref}/preview`)
  if (!res.ok) throw new ApiError('Voice preview unavailable', res.status)
  return res.blob()
}

// ── Agent Prompt Spec ─────────────────────────────────────────────────────────

export interface AgentPromptSpec {
  identity_and_persona: string
  task_definition: string
  objectives: string[]
  transcript: string[]
  guardrails: string[]
  voice_character?: { name: string; persona: string }
}

// ── Agent Planning ────────────────────────────────────────────────────────────

export interface PlanQuestion {
  query_statement: string
  suggestion1: { statement: string }
  suggestion2: { statement: string }
}

export interface PlanSectionResult {
  approach: string
  need_user_inputs: boolean
  questions: PlanQuestion[]
}

export async function planAgentSection(
  accessToken: string,
  payload: { seed_prompt: string; plan_history: string; section_name: string },
): Promise<PlanSectionResult> {
  const res = await fetch(`${BASE}/api/v1/agents/plan-section`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to plan section', res.status)
  }
  return res.json()
}

// CompileResult includes agent_name (returned by the compiler) plus the 5 spec sections
export interface CompileResult extends AgentPromptSpec {
  agent_name: string
}

export async function compileAgentPlan(
  accessToken: string,
  payload: { plan_history: string },
): Promise<CompileResult> {
  const res = await fetch(`${BASE}/api/v1/agents/compile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to compile agent', res.status)
  }
  return res.json()
}

export async function rewriteAgentSection(
  accessToken: string,
  payload: { section_name: string; current_content: string; instruction: string },
): Promise<{ updated_content: string }> {
  const res = await fetch(`${BASE}/api/v1/agents/rewrite-section`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to rewrite section', res.status)
  }
  return res.json()
}

// ── Agents CRUD ───────────────────────────────────────────────────────────────

export interface Agent {
  id: string
  created_at: string
  agentspace_id: string
  agent_name: string
  agent_prompt: AgentPromptSpec
  agent_language: string
  agent_voice: string
  created_by_id: string
  created_by_name: string
}

export async function saveAgent(
  accessToken: string,
  agentspaceId: string,
  payload: { agent_name: string; agent_prompt: AgentPromptSpec; agent_language: string; agent_voice: string },
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/agents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to save agent', res.status)
  }
  return res.json()
}

export async function fetchAgents(accessToken: string, agentspaceId: string): Promise<Agent[]> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/agents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to fetch agents', res.status)
  }
  const data: { agents: Agent[] } = await res.json()
  return data.agents
}

export async function updateAgent(
  accessToken: string,
  agentId: string,
  updates: { agent_prompt?: AgentPromptSpec; agent_language?: string; agent_voice?: string },
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { detail?: string }).detail ?? 'Failed to update agent', res.status)
  }
  return res.json()
}

export async function updateAgentPrompt(
  accessToken: string,
  agentId: string,
  agent_prompt: AgentPromptSpec,
): Promise<Agent> {
  return updateAgent(accessToken, agentId, { agent_prompt })
}
