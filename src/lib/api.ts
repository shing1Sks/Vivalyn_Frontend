const BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export interface UserProfile {
  id: string;
  profile_pic_gradient: string | null;
  profile_pic_link: string | null;
  name: string;
  email: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/api/v1/profile/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new ApiError("Failed to fetch profile", res.status);
  return res.json();
}

// ── AgentSpace ────────────────────────────────────────────────────────────────

export interface AgentSpace {
  id: string;
  name: string;
  role: string;
}

export interface CreateAgentSpacePayload {
  name: string;
}

export async function fetchAgentSpaces(
  accessToken: string,
): Promise<AgentSpace[]> {
  const res = await fetch(`${BASE}/api/v1/agentspaces`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch agentspaces");
  const data: { spaces: AgentSpace[] } = await res.json();
  return data.spaces;
}

export async function createAgentSpace(
  accessToken: string,
  payload: CreateAgentSpacePayload,
): Promise<AgentSpace> {
  const res = await fetch(`${BASE}/api/v1/agentspaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? "Failed to create agentspace",
    );
  }
  return res.json();
}

export async function renameAgentSpace(
  accessToken: string,
  agentspaceId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to rename agentspace",
      res.status,
    );
  }
  return res.json();
}

// ── Members ───────────────────────────────────────────────────────────────────

export interface AgentSpaceMember {
  user_id: string;
  email: string;
  name: string;
  role: string;
  profile_pic_gradient: string | null;
  profile_pic_link: string | null;
  joined_at: string;
}

export async function fetchAgentSpaceMembers(
  accessToken: string,
  agentspaceId: string,
): Promise<AgentSpaceMember[]> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/members`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to fetch members",
      res.status,
    );
  }
  const data: { members: AgentSpaceMember[] } = await res.json();
  return data.members;
}

export async function changeAgentSpaceMemberRole(
  accessToken: string,
  agentspaceId: string,
  userId: string,
  role: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/members/${userId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to change role",
      res.status,
    );
  }
}

export async function removeAgentSpaceMember(
  accessToken: string,
  agentspaceId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/members/${userId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to remove member",
      res.status,
    );
  }
}

// ── Invites ───────────────────────────────────────────────────────────────────

export interface Invite {
  id: string;
  agentspace_id: string;
  agentspace_name: string;
  invited_email: string;
  invited_by_name: string;
  invited_by_email: string;
  role: string;
  status: string;
  is_expired: boolean;
  created_at: string;
  expires_at: string;
}

export async function fetchAgentSpaceInvites(
  accessToken: string,
  agentspaceId: string,
): Promise<Invite[]> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/invites`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to fetch invites",
      res.status,
    );
  }
  const data: { invites: Invite[] } = await res.json();
  return data.invites;
}

export async function createInvite(
  accessToken: string,
  agentspaceId: string,
  invited_email: string,
  role: string,
): Promise<Invite> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/invites`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invited_email, role }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to send invite",
      res.status,
    );
  }
  return res.json();
}

export async function revokeInvite(
  accessToken: string,
  agentspaceId: string,
  inviteId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/invites/${inviteId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to revoke invite",
      res.status,
    );
  }
}

export async function fetchInboxInvites(
  accessToken: string,
): Promise<Invite[]> {
  const res = await fetch(`${BASE}/api/v1/invites/inbox`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to fetch inbox",
      res.status,
    );
  }
  const data: { invites: Invite[] } = await res.json();
  return data.invites;
}

export async function fetchInviteDetails(inviteId: string): Promise<Invite> {
  const res = await fetch(`${BASE}/api/v1/invites/${inviteId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Invite not found",
      res.status,
    );
  }
  return res.json();
}

export async function acceptInvite(
  accessToken: string,
  inviteId: string,
): Promise<{ agentspace_id: string; agentspace_name: string }> {
  const res = await fetch(`${BASE}/api/v1/invites/${inviteId}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to accept invite",
      res.status,
    );
  }
  return res.json();
}

// ── Voices ────────────────────────────────────────────────────────────────────

export interface VoiceOption {
  preference: string;
  voice_name: string; // internal wavenet code — not displayed in UI
}

export interface LanguageVoiceOption {
  key: string;
  display_name: string;
  voices: VoiceOption[];
}

export async function fetchVoices(): Promise<{
  languages: LanguageVoiceOption[];
}> {
  const res = await fetch(`${BASE}/api/v1/voices`);
  if (!res.ok) throw new ApiError("Failed to fetch voices", res.status);
  return res.json();
}

export async function fetchVoicePreviewBlob(
  language: string,
  voicePref: string,
): Promise<Blob> {
  const res = await fetch(
    `${BASE}/api/v1/voices/${language}/${voicePref}/preview`,
  );
  if (!res.ok) throw new ApiError("Voice preview unavailable", res.status);
  return res.blob();
}

// ── Agent Prompt Spec ─────────────────────────────────────────────────────────

export interface AgentPromptSpec {
  identity_and_persona: string;
  session_brief: string;
  behavior_rules: Record<string, string>;  // { opening, probing, adaptation, feedback, closing }
  guardrails: string[];
}

// ── Evaluation ────────────────────────────────────────────────────────────────

export interface EvaluationMetrics {
  report_curator_prompt: string;
  metrics: string[]; // exactly 4
}

export interface EvaluationReport {
  scoring: Record<string, number>;
  highlights: string[];
  transcript_summary: string;
  feedback: string[];
  summary: string;
}

export async function generateEvaluationCriteria(
  accessToken: string,
  payload: { session_brief: string; users_raw_evaluation_criteria: string },
): Promise<EvaluationMetrics> {
  const res = await fetch(
    `${BASE}/api/v1/agents/generate-evaluation-criteria`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ??
        "Failed to generate evaluation criteria",
      res.status,
    );
  }
  return res.json();
}

// ── Agent Planning ────────────────────────────────────────────────────────────

export interface PlanQuestion {
  query_statement: string;
  suggestion1: { statement: string };
  suggestion2: { statement: string };
}

export interface PlanAgentResult {
  status: string; // "need_inputs" | "ready"
  questions?: PlanQuestion[];
  plan?: Record<string, unknown>;
}

export async function planAgent(
  accessToken: string,
  payload: { seed_prompt: string; plan_history?: string },
): Promise<PlanAgentResult> {
  const res = await fetch(`${BASE}/api/v1/agents/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to plan agent",
      res.status,
    );
  }
  return res.json();
}

// CompileResult includes agent_name plus the 4 spec sections
export interface CompileResult extends AgentPromptSpec {
  agent_name: string;
}

export async function compileAgentPlan(
  accessToken: string,
  payload: { plan_history: string },
): Promise<CompileResult> {
  const res = await fetch(`${BASE}/api/v1/agents/compile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to compile agent",
      res.status,
    );
  }
  return res.json();
}

export async function rewriteAgentSection(
  accessToken: string,
  payload: {
    section_name: string;
    current_content: string;
    instruction: string;
  },
): Promise<{ updated_content: string }> {
  const res = await fetch(`${BASE}/api/v1/agents/rewrite-section`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to rewrite section",
      res.status,
    );
  }
  return res.json();
}

// ── Agents CRUD ───────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  created_at: string;
  agentspace_id: string;
  agent_name: string;
  agent_prompt: AgentPromptSpec | QnAPromptSpec;
  agent_language: string;
  agent_voice: string;
  created_by_id: string;
  created_by_name: string;
  agent_status: "live" | "idle";
  agent_first_speaker: string;
  transcript_evaluation_metrics?: EvaluationMetrics | null;
  agent_type: "general" | "qna";
}

// ── QnA Types ─────────────────────────────────────────────────────────────────

export interface QnAQuestion {
  id: string;
  text: string;
  cross_question_enabled: boolean;
}

export interface QnAQuestionBank {
  fixed: QnAQuestion[];
  randomized_pool: QnAQuestion[];
  randomized_count: number;
}

export interface QnAPromptSpec {
  identity_and_persona: string;
  session_brief: string;
  behavior_rules: Record<string, string>; // opening, transition, closing
  guardrails: string[];
  question_bank: QnAQuestionBank;
}

export interface QnACompileResult extends Omit<QnAPromptSpec, "question_bank"> {
  agent_name: string;
  question_bank: QnAQuestionBank;
}

export async function saveAgent(
  accessToken: string,
  agentspaceId: string,
  payload: {
    agent_name: string;
    agent_prompt: AgentPromptSpec;
    agent_language: string;
    agent_voice: string;
    agent_first_speaker?: string;
    transcript_evaluation_metrics?: EvaluationMetrics;
  },
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/agents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to save agent",
      res.status,
    );
  }
  return res.json();
}

export async function fetchAgents(
  accessToken: string,
  agentspaceId: string,
): Promise<Agent[]> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/agents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to fetch agents",
      res.status,
    );
  }
  const data: { agents: Agent[] } = await res.json();
  return data.agents;
}

export async function updateAgent(
  accessToken: string,
  agentId: string,
  updates: {
    agent_prompt?: AgentPromptSpec;
    agent_language?: string;
    agent_voice?: string;
    agent_first_speaker?: string;
    transcript_evaluation_metrics?: EvaluationMetrics | null;
  },
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to update agent",
      res.status,
    );
  }
  return res.json();
}

export async function updateAgentPrompt(
  accessToken: string,
  agentId: string,
  agent_prompt: AgentPromptSpec,
): Promise<Agent> {
  return updateAgent(accessToken, agentId, { agent_prompt });
}

export async function toggleAgentStatus(
  accessToken: string,
  agentId: string,
  status: "live" | "idle",
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agents/${agentId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to update status",
      res.status,
    );
  }
  return res.json();
}

// ── QnA Agent API ─────────────────────────────────────────────────────────────

export async function generateQnAQuestions(
  accessToken: string,
  payload: { context: string; resource_text?: string; resource_images?: string[] },
): Promise<{ questions: Array<{ text: string; type: "fixed" | "randomized"; cross_question_enabled: boolean }> }> {
  const res = await fetch(`${BASE}/api/v1/agents/qna/generate-questions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to generate questions",
      res.status,
    );
  }
  return res.json();
}

export async function compileQnAAgent(
  accessToken: string,
  payload: {
    question_bank: QnAQuestionBank;
    tone: string;
    feedback_mode: "silent" | "feedback";
    session_context: string;
  },
): Promise<QnACompileResult> {
  const res = await fetch(`${BASE}/api/v1/agents/qna/compile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to compile QnA agent",
      res.status,
    );
  }
  return res.json();
}

export async function saveQnAAgent(
  accessToken: string,
  agentspaceId: string,
  payload: {
    agent_name: string;
    agent_prompt: QnAPromptSpec;
    agent_language: string;
    agent_voice: string;
    agent_first_speaker?: string;
    transcript_evaluation_metrics?: EvaluationMetrics;
  },
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/qna-agents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to save QnA agent",
      res.status,
    );
  }
  return res.json();
}

export async function updateAgentQuestionBank(
  accessToken: string,
  agentId: string,
  question_bank: QnAQuestionBank,
): Promise<Agent> {
  const res = await fetch(`${BASE}/api/v1/agents/${agentId}/question-bank`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question_bank }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Failed to update question bank",
      res.status,
    );
  }
  return res.json();
}

// ── Live Sessions ─────────────────────────────────────────────────────────────

export interface AgentPublicConfig {
  agent_name: string;
  agent_language: string;
  agent_status: string;
  persona_name?: string | null; // voice_character.name from prompt, if set
  agent_first_speaker: string; // "agent" | "user"
}

export async function fetchAgentPublicConfig(
  agentId: string,
): Promise<AgentPublicConfig> {
  const res = await fetch(`${BASE}/api/v1/agents/${agentId}/public-config`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { detail?: string }).detail ?? "Agent not found",
      res.status,
    );
  }
  return res.json();
}

// ── Run Records ───────────────────────────────────────────────────────────────

export interface RunRecord {
  id: string;
  created_at: string;
  agent_id: string;
  agent_name: string;
  user_email: string;
  user_name: string;
  transcript?: Array<{ role: string; content: string | Record<string, unknown>; timestamp: string }>;
  evaluation_report: EvaluationReport | null;
  is_test: boolean;
}

export async function fetchLatestRunRecord(
  agentId: string,
  email: string,
): Promise<RunRecord | null> {
  const res = await fetch(
    `${BASE}/api/v1/agents/${agentId}/runs/latest?email=${encodeURIComponent(email)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAgentspaceRuns(
  accessToken: string,
  agentspaceId: string,
  page = 1,
  pageSize = 10,
  filters?: {
    agentId?: string;
    search?: string;
    isTest?: boolean;
    includeTranscript?: boolean;
  },
): Promise<{ runs: RunRecord[]; total: number }> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (filters?.agentId) params.set("agent_id", filters.agentId);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.isTest !== undefined) params.set("is_test", String(filters.isTest));
  if (filters?.includeTranscript) params.set("include_transcript", "true");

  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/runs?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return { runs: [], total: 0 };
  return res.json();
}

export async function exportAgentspaceRuns(
  accessToken: string,
  agentspaceId: string,
  filters?: {
    agentId?: string;
    search?: string;
    isTest?: boolean;
  },
): Promise<RunRecord[]> {
  const allRuns: RunRecord[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const { runs, total } = await fetchAgentspaceRuns(
      accessToken,
      agentspaceId,
      page,
      pageSize,
      { ...filters, includeTranscript: true },
    );
    allRuns.push(...runs);
    if (allRuns.length >= total || runs.length === 0) break;
    page += 1;
  }

  return allRuns;
}

export async function fetchRunRecordById(
  accessToken: string,
  agentspaceId: string,
  runId: string,
): Promise<RunRecord> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/runs/${runId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch run record');
  return res.json();
}

export interface RecordingData {
  agent_audio_url: string | null;
  user_audio_url: string | null;
  manifest: Array<{ turn_index: number; speaker: string; content: string; start_ms: number }>;
  duration_ms: number;
}

export async function fetchRecording(
  accessToken: string,
  runId: string,
): Promise<RecordingData | null> {
  const res = await fetch(`${BASE}/api/v1/recordings/${runId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch recording');
  return res.json();
}

// ── Admin ──────────────────────────────────────────────────────────────────

export interface AdminDailyPoint {
  date: string;
  sessions: number;
  session_seconds: number;
  llm_conv_input: number;
  llm_conv_cached: number;
  llm_conv_output: number;
  llm_report_input: number;
  llm_report_output: number;
  stt_seconds: number;
  tts_chars: number;
}

export interface AdminOverview {
  total_sessions: number;
  live_sessions: number;
  test_sessions: number;
  total_session_seconds: number;
  total_llm_conv_input_tokens: number;
  total_llm_conv_cached_tokens: number;
  total_llm_conv_output_tokens: number;
  total_llm_report_input_tokens: number;
  total_llm_report_output_tokens: number;
  total_stt_seconds: number;
  total_stt_calls: number;
  total_tts_chars: number;
  total_tts_calls: number;
  daily_series: AdminDailyPoint[];
}

export interface AdminOrgSummary {
  agentspace_id: string;
  agentspace_name: string;
  total_sessions: number;
  total_session_seconds: number;
  total_llm_conv_input_tokens: number;
  total_llm_conv_output_tokens: number;
  total_stt_seconds: number;
  total_tts_chars: number;
}

export interface AdminAgentSummary {
  agent_id: string;
  agent_name: string;
  total_sessions: number;
  total_session_seconds: number;
  total_llm_conv_input_tokens: number;
  total_llm_conv_output_tokens: number;
  total_stt_seconds: number;
  total_tts_chars: number;
}

export interface AdminRunSummary {
  run_id: string;
  created_at: string;
  user_email: string;
  user_name: string;
  is_test: boolean;
  conversation_turns: number;
  session_duration_seconds: number;
  llm_conv_input_tokens: number;
  llm_conv_cached_tokens: number;
  llm_conv_output_tokens: number;
  llm_report_input_tokens: number | null;
  llm_report_output_tokens: number | null;
  stt_total_seconds: number;
  tts_total_chars: number;
}

export interface AdminAgentDetail {
  runs: AdminRunSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminRunDetail extends AdminRunSummary {
  llm_conv_model: string;
  llm_report_model: string | null;
  stt_model: string;
  stt_calls: number;
  tts_model: string;
  tts_calls: number;
  transcript: Array<{ role: string; content: string; timestamp: string }>;
  evaluation_report: Record<string, unknown>;
}

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function adminParams(dateFrom: string, dateTo: string, excludeTest: boolean) {
  return `date_from=${dateFrom}&date_to=${dateTo}&exclude_test=${excludeTest}`;
}

export async function adminMe(token: string): Promise<{ email: string }> {
  const res = await fetch(`${BASE}/api/v1/admin/me`, { headers: adminHeaders(token) });
  if (!res.ok) throw new ApiError("Not authorized", res.status);
  return res.json();
}

export async function fetchAdminOverview(
  token: string,
  dateFrom: string,
  dateTo: string,
  excludeTest: boolean,
): Promise<AdminOverview> {
  const res = await fetch(
    `${BASE}/api/v1/admin/overview?${adminParams(dateFrom, dateTo, excludeTest)}`,
    { headers: adminHeaders(token) },
  );
  if (!res.ok) throw new ApiError("Failed to fetch overview", res.status);
  return res.json();
}

export async function fetchAdminOrgs(
  token: string,
  dateFrom: string,
  dateTo: string,
  excludeTest: boolean,
): Promise<AdminOrgSummary[]> {
  const res = await fetch(
    `${BASE}/api/v1/admin/orgs?${adminParams(dateFrom, dateTo, excludeTest)}`,
    { headers: adminHeaders(token) },
  );
  if (!res.ok) throw new ApiError("Failed to fetch orgs", res.status);
  return res.json();
}

export async function fetchAdminOrgDetail(
  token: string,
  agentspaceId: string,
  dateFrom: string,
  dateTo: string,
  excludeTest: boolean,
): Promise<AdminAgentSummary[]> {
  const res = await fetch(
    `${BASE}/api/v1/admin/orgs/${agentspaceId}?${adminParams(dateFrom, dateTo, excludeTest)}`,
    { headers: adminHeaders(token) },
  );
  if (!res.ok) throw new ApiError("Failed to fetch org detail", res.status);
  return res.json();
}

export async function fetchAdminAgentDetail(
  token: string,
  agentId: string,
  dateFrom: string,
  dateTo: string,
  excludeTest: boolean,
  page = 1,
  pageSize = 20,
): Promise<AdminAgentDetail> {
  const res = await fetch(
    `${BASE}/api/v1/admin/agents/${agentId}?${adminParams(dateFrom, dateTo, excludeTest)}&page=${page}&page_size=${pageSize}`,
    { headers: adminHeaders(token) },
  );
  if (!res.ok) throw new ApiError("Failed to fetch agent detail", res.status);
  return res.json();
}

export async function fetchAdminRunDetail(
  token: string,
  runId: string,
): Promise<AdminRunDetail> {
  const res = await fetch(`${BASE}/api/v1/admin/runs/${runId}`, {
    headers: adminHeaders(token),
  });
  if (!res.ok) throw new ApiError("Failed to fetch run detail", res.status);
  return res.json();
}

// ── Tokens ────────────────────────────────────────────────────────────────────

export interface TokenBalance {
  balance: number;
  low_balance_threshold: number;
  updated_at: string | null;
}

export interface TokenTransaction {
  id: string;
  created_at: string;
  delta: number;
  balance_after: number;
  reason: string;
  run_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TokenTransactionsPage {
  transactions: TokenTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export async function fetchTokenBalance(
  accessToken: string,
  agentspaceId: string,
): Promise<TokenBalance> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/tokens/balance`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new ApiError("Failed to fetch token balance", res.status);
  return res.json();
}

export async function fetchTokenTransactions(
  accessToken: string,
  agentspaceId: string,
  page = 1,
  pageSize = 20,
): Promise<TokenTransactionsPage> {
  const res = await fetch(
    `${BASE}/api/v1/agentspaces/${agentspaceId}/tokens/transactions?page=${page}&page_size=${pageSize}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new ApiError("Failed to fetch token transactions", res.status);
  return res.json();
}

export async function addTokens(
  accessToken: string,
  agentspaceId: string,
  amount: number,
): Promise<{ new_balance: number }> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/tokens/add`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new ApiError("Failed to add tokens", res.status);
  return res.json();
}

export async function fetchAdminOrgTokenTransactions(
  token: string,
  agentspaceId: string,
  page = 1,
  pageSize = 20,
): Promise<TokenTransactionsPage> {
  const res = await fetch(
    `${BASE}/api/v1/admin/orgs/${agentspaceId}/tokens/transactions?page=${page}&page_size=${pageSize}`,
    { headers: adminHeaders(token) },
  );
  if (!res.ok) throw new ApiError("Failed to fetch org token transactions", res.status);
  return res.json();
}

// ── Support (authenticated) ───────────────────────────────────────────────────

export type SupportTicketType = 'billing' | 'technical' | 'feedback' | 'other'

export async function submitSupport(
  token: string,
  data: { type: SupportTicketType; message: string },
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/support/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? "Failed to submit support request", res.status);
  }
}

// ── Contact / OTP ─────────────────────────────────────────────────────────────

export async function requestOtp(data: { name: string; email: string; message: string }): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/contact/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? "Failed to send verification code", res.status);
  }
}

export async function verifyOtp(data: { email: string; otp: string }): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/contact/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? "Verification failed", res.status);
  }
}

// ── Live session OTP ──────────────────────────────────────────────────────────

export async function requestSessionOtp(email: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/live/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? 'Failed to send verification code', res.status);
  }
}

export async function verifySessionOtp(email: string, otp: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/live/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? 'Verification failed', res.status);
  }
}

// ── Subscription (member-facing) ──────────────────────────────────────────────

export interface AgentspaceSubscription {
  has_subscription: boolean;
  plan_tier: string | null;
  status: string;
  currency: string | null;
  period_start: string | null;
  period_end: string | null;
  minutes_included: number;
  scaling_enabled: boolean;
  overflow_minutes: number;
  balance: number;
  cancel_at_period_end?: boolean;
  had_trial: boolean;
}

export async function fetchAgentspaceSubscription(
  accessToken: string,
  agentspaceId: string,
): Promise<AgentspaceSubscription> {
  const res = await fetch(`${BASE}/api/v1/agentspaces/${agentspaceId}/subscription`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new ApiError("Failed to fetch subscription", res.status);
  return res.json();
}

// ── Admin — Contact Events ────────────────────────────────────────────────────

export interface ContactEvent {
  id: string;
  created_at: string;
  type: string;
  name: string;
  email: string;
  message: string;
  source: string | null;
  status: string;
  notes: string | null;
}

export async function fetchContactEvents(
  token: string,
  status?: string,
  type?: string,
): Promise<ContactEvent[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  const qs = params.toString();
  const url = qs ? `${BASE}/api/v1/admin/contact-events?${qs}` : `${BASE}/api/v1/admin/contact-events`;
  const res = await fetch(url, { headers: adminHeaders(token) });
  if (!res.ok) throw new ApiError("Failed to fetch contact events", res.status);
  return res.json();
}

export async function updateContactEvent(
  token: string,
  id: string,
  data: { status?: string; notes?: string },
): Promise<ContactEvent> {
  const res = await fetch(`${BASE}/api/v1/admin/contact-events/${id}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError("Failed to update contact event", res.status);
  return res.json();
}

// ── Admin — Subscriptions ─────────────────────────────────────────────────────

export interface AdminSubscription {
  id: string;
  created_at: string;
  agentspace_id: string;
  agentspace_name: string;
  plan_tier: string;
  status: string;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  minutes_included: number;
  scaling_enabled: boolean;
  activated_by: string | null;
  requester_email: string | null;
  notes: string | null;
  balance: number;
}

export async function fetchAdminSubscriptions(token: string): Promise<AdminSubscription[]> {
  const res = await fetch(`${BASE}/api/v1/admin/subscriptions`, { headers: adminHeaders(token) });
  if (!res.ok) throw new ApiError("Failed to fetch subscriptions", res.status);
  return res.json();
}

export async function activateSubscription(
  token: string,
  data: {
    agentspace_id: string;
    plan_tier: string;
    currency: string;
    period_start?: string;
    period_end?: string;
    requester_email?: string;
    notes?: string;
  },
): Promise<AdminSubscription> {
  const res = await fetch(`${BASE}/api/v1/admin/subscriptions/activate`, {
    method: 'POST',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError("Failed to activate subscription", res.status);
  return res.json();
}

export async function updateAdminSubscription(
  token: string,
  id: string,
  data: { status?: string; scaling_enabled?: boolean; period_end?: string; notes?: string },
): Promise<AdminSubscription> {
  const res = await fetch(`${BASE}/api/v1/admin/subscriptions/${id}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError("Failed to update subscription", res.status);
  return res.json();
}

// ── Admin — Retention ─────────────────────────────────────────────────────────

export interface SubscriptionEvent {
  id: string;
  created_at: string;
  agentspace_id: string;
  event_type: 'activated' | 'renewed' | 'upgraded' | 'downgraded' | 'cancelled' | 'expired';
  plan_tier: string;
  previous_tier: string | null;
  period_start: string | null;
  period_end: string | null;
  minutes_included: number | null;
}

export interface AdminRetentionOrg {
  agentspace_id: string;
  agentspace_name: string;
  plan_tier: string | null;
  status: string;
  expiring_soon: boolean;
  period_start: string | null;
  period_end: string | null;
  minutes_included: number;
  minutes_used_this_period: number;
  sessions_last_30d: number;
  sessions_last_60d: number;
  sessions_last_90d: number;
  last_session_at: string | null;
  events: SubscriptionEvent[];
}

export interface AdminRetentionData {
  orgs: AdminRetentionOrg[];
  monthly_sessions: { month: string; count: number }[];
}

export async function fetchAdminRetention(token: string): Promise<AdminRetentionData> {
  const res = await fetch(`${BASE}/api/v1/admin/retention`, { headers: adminHeaders(token) });
  if (!res.ok) throw new ApiError("Failed to fetch retention data", res.status);
  return res.json();
}

// ── Admin agentspace search ───────────────────────────────────────────────────

export interface AgentspaceSearchResult {
  id: string
  name: string
  admin_name: string
  admin_email: string
}

export interface AgentspaceDetails {
  id: string
  name: string
  admin_name: string
  admin_email: string
  subscription: {
    plan_tier: string
    status: string
    period_start: string | null
    period_end: string | null
    minutes_included: number
    currency: string
  } | null
  balance: number
  had_trial: boolean
}

export async function searchAdminAgentspaces(token: string, q: string): Promise<AgentspaceSearchResult[]> {
  const res = await fetch(`${BASE}/api/v1/admin/agentspaces/search?q=${encodeURIComponent(q)}`, { headers: adminHeaders(token) })
  if (!res.ok) throw new ApiError('Search failed', res.status)
  return res.json()
}

export async function fetchAdminAgentspaceDetails(token: string, agentspaceId: string): Promise<AgentspaceDetails> {
  const res = await fetch(`${BASE}/api/v1/admin/agentspaces/${agentspaceId}/details`, { headers: adminHeaders(token) })
  if (!res.ok) throw new ApiError('Failed to fetch agentspace details', res.status)
  return res.json()
}

// ── Plan config ───────────────────────────────────────────────────────────────

export interface PlanConfigEntry {
  tier: 'trial' | 'starter' | 'growth' | 'pro'
  minutes: number
  sessions: number
  price_inr: number
  price_usd: number
  crossed_inr: number | null
  crossed_usd: number | null
  scaling_available: boolean
  scaling_rate_inr: number | null
  scaling_rate_usd: number | null
}

export interface PlanConfigResponse {
  plans: PlanConfigEntry[]
  cost_floor_inr: number
  cost_floor_usd: number
}

// ── Admin — Inquiries ─────────────────────────────────────────────────────────

export interface Inquiry {
  id: string;
  created_at: string;
  name: string;
  email: string;
  business_name: string | null;
  size: string | null;
  use_case: string | null;
  plan_interest: string | null;
  currency_pref: string | null;
  status: string;
}

export async function fetchAdminInquiries(
  token: string,
  status?: string,
): Promise<Inquiry[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${BASE}/api/v1/admin/inquiries${qs}`, { headers: adminHeaders(token) });
  if (!res.ok) throw new ApiError("Failed to fetch inquiries", res.status);
  return res.json();
}

export async function updateAdminInquiry(
  token: string,
  id: string,
  data: { status?: string; notes?: string },
): Promise<Inquiry> {
  const res = await fetch(`${BASE}/api/v1/admin/inquiries/${id}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError("Failed to update inquiry", res.status);
  return res.json();
}

export async function sendAdminFollowupEmail(
  token: string,
  id: string,
  data: { subject: string; body_html: string },
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/admin/inquiries/${id}/followup`, {
    method: 'POST',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError("Failed to send follow-up email", res.status);
}

// ── Plan config ───────────────────────────────────────────────────────────────

export async function fetchPlanConfig(): Promise<PlanConfigResponse> {
  const res = await fetch(`${BASE}/api/v1/plans`);
  if (!res.ok) throw new ApiError("Failed to fetch plan config", res.status);
  return res.json();
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface RazorpayCheckoutData {
  gateway: "razorpay";
  razorpay_key_id: string;
  subscription_id: string;
  plan_tier: string;
  amount_display: string;
  description: string;
}

export interface StripeCheckoutData {
  gateway: "stripe";
  checkout_url: string;
}

export type CheckoutData = RazorpayCheckoutData | StripeCheckoutData;

export interface PaymentStatusResponse {
  found: boolean;
  status: string; // 'pending' | 'completed' | 'expired' | 'not_found'
  plan_tier?: string;
  agentspace_id?: string;
}

export async function initiatePayment(
  token: string,
  body: { agentspace_id: string; plan_tier: string; currency: string }
): Promise<CheckoutData> {
  const res = await fetch(`${BASE}/api/v1/payments/initiate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Payment initiation failed" }));
    throw new ApiError(err.detail ?? "Payment initiation failed", res.status);
  }
  return res.json();
}

export async function fetchPaymentStatus(
  token: string,
  provider: string,
  ref: string
): Promise<PaymentStatusResponse> {
  const res = await fetch(
    `${BASE}/api/v1/payments/status?provider=${encodeURIComponent(provider)}&ref=${encodeURIComponent(ref)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new ApiError("Failed to fetch payment status", res.status);
  return res.json();
}

export async function cancelSubscription(
  token: string,
  body: { agentspace_id: string; at_period_end: boolean }
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/api/v1/payments/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError((err as { detail?: string }).detail ?? "Failed to cancel subscription", res.status);
  }
  return res.json();
}

export async function switchPlan(
  token: string,
  body: { agentspace_id: string; new_plan_tier: string; at_period_end: boolean }
): Promise<CheckoutData | { ok: boolean; message: string }> {
  const res = await fetch(`${BASE}/api/v1/payments/switch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError((err as { detail?: string }).detail ?? "Failed to switch plan", res.status);
  }
  return res.json();
}

export interface PaymentTransaction {
  id: string;
  created_at: string;
  event_type: string;
  plan_tier: string;
  currency: string;
  amount_paid: number | null;
  status: string;
}

export async function fetchPaymentTransactions(
  token: string,
  agentspace_id: string,
  page: number,
  page_size: number
): Promise<{ transactions: PaymentTransaction[]; total: number }> {
  const params = new URLSearchParams({
    agentspace_id,
    page: String(page),
    page_size: String(page_size),
  });
  const res = await fetch(`${BASE}/api/v1/payments/transactions?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError("Failed to fetch billing history", res.status);
  return res.json();
}

