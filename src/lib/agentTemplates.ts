import type { SessionDesignRequest, QnASessionDesignRequest } from "./api";

export interface AgentTemplate {
  id: string;
  name: string;
  category: "academic" | "interview" | "corporate";
  meta: string;
  suggested_name: string;
  duration: number;
  session_objective: string;
  agent_role: string;
  participant_role: string;
  style: string;
  eval_competency: string;
  eval_strong: string;
  eval_weak: string;
}

export interface QnAAgentTemplate {
  id: string;
  name: string;
  category: "academic" | "professional" | "language";
  meta: string;
  suggested_name: string;
  duration: number;
  session_objective: string;
  agent_role: string;
  participant_role: string;
  style: string;
  feedback_mode: "silent" | "feedback";
  eval_competency: string;
  eval_strong: string;
  eval_weak: string;
}

export function templateToSessionDesign(
  t: AgentTemplate,
  agentName: string,
): Omit<SessionDesignRequest, "additional_context"> {
  return {
    agent_name: agentName,
    session_objective: t.session_objective,
    agent_role: t.agent_role,
    participant_role: t.participant_role,
    communication_style: t.style,
    session_duration_minutes: t.duration,
  };
}

export function qnaTemplateToSessionDesign(
  t: QnAAgentTemplate,
  agentName: string,
): Omit<QnASessionDesignRequest, "additional_context" | "resource_text" | "resource_images"> {
  return {
    agent_name: agentName,
    session_objective: t.session_objective,
    agent_role: t.agent_role,
    participant_role: t.participant_role,
    communication_style: t.style,
    session_duration_minutes: t.duration,
    feedback_mode: t.feedback_mode,
  };
}

// ── General Agent Templates ────────────────────────────────────────────────────

export const GENERAL_TEMPLATES: AgentTemplate[] = [
  // Academic & Viva
  {
    id: "research-discussion",
    name: "Research Discussion Partner",
    category: "academic",
    meta: "20 min · Coaching",
    suggested_name: "Dr. Morgan",
    duration: 20,
    session_objective:
      "Explore the participant's research ideas, help them sharpen their argument, and identify gaps in their reasoning or literature review",
    agent_role:
      "A supportive academic supervisor guiding the participant through their research thinking, asking Socratic questions to develop clarity and rigour",
    participant_role:
      "A researcher or student developing a research proposal, literature review, or thesis chapter",
    style: "Coaching",
    eval_competency: "Research thinking, argumentation clarity, and intellectual depth",
    eval_strong:
      "Demonstrates nuanced thinking, anticipates counterarguments, references relevant literature fluently, and refines ideas through dialogue",
    eval_weak:
      "Presents underdeveloped ideas, cannot engage with challenges to their argument, or lacks awareness of relevant scholarship",
  },
  {
    id: "oral-presentation",
    name: "Oral Presentation Coach",
    category: "academic",
    meta: "15 min · Coaching",
    suggested_name: "Dr. Clarke",
    duration: 15,
    session_objective:
      "Help the participant practise delivering a clear, confident oral presentation and improve their ability to handle questions from the audience",
    agent_role:
      "A presentation coach listening to the participant's talk and providing structured feedback on clarity, structure, pacing, and question handling",
    participant_role:
      "A student or researcher preparing to deliver an academic presentation or seminar",
    style: "Coaching",
    eval_competency: "Oral presentation delivery and Q&A handling",
    eval_strong:
      "Delivers a well-structured, engaging presentation at an appropriate pace, fields questions confidently, and adapts language to audience level",
    eval_weak:
      "Rushes through material, stumbles over key concepts, cannot handle follow-up questions, or fails to engage the audience",
  },
  {
    id: "english-speaking",
    name: "English Speaking Coach",
    category: "academic",
    meta: "10 min · Conversational",
    suggested_name: "Sarah",
    duration: 10,
    session_objective:
      "Improve the participant's spoken English fluency, pronunciation, and ability to express ideas clearly in conversation",
    agent_role:
      "A friendly English language coach engaging the participant in natural conversation, gently correcting errors, and encouraging more precise expression",
    participant_role:
      "A non-native English speaker looking to improve conversational fluency and confidence",
    style: "Conversational",
    eval_competency: "Spoken English fluency and communicative accuracy",
    eval_strong:
      "Speaks with natural rhythm, uses varied vocabulary accurately, self-corrects mistakes, and maintains clear coherent expression throughout",
    eval_weak:
      "Relies heavily on filler words, makes repeated grammatical errors, struggles to find vocabulary, or loses coherence in longer responses",
  },
  {
    id: "academic-debate",
    name: "Academic Debate Practice",
    category: "academic",
    meta: "15 min · Strict",
    suggested_name: "Prof. Adeyemi",
    duration: 15,
    session_objective:
      "Challenge the participant to defend a position on a controversial academic topic using evidence, logical reasoning, and rebuttal",
    agent_role:
      "A debate moderator and opponent who presents counterarguments, demands evidence, and challenges logical consistency throughout the debate",
    participant_role:
      "A student or debater practising constructing and defending an academic argument under pressure",
    style: "Strict",
    eval_competency: "Argumentation, evidence use, and rebuttal quality",
    eval_strong:
      "Constructs logically coherent arguments, cites credible evidence, anticipates and refutes counterarguments effectively, and maintains composure under challenge",
    eval_weak:
      "Makes unsupported claims, cannot rebut counterarguments, contradicts earlier statements, or concedes ground without justification",
  },

  // Interview & Speaking
  {
    id: "tech-interview",
    name: "Technical Interview Coach (SWE)",
    category: "interview",
    meta: "30 min · Formal",
    suggested_name: "Alex",
    duration: 30,
    session_objective:
      "Simulate a senior software engineering technical interview, assessing system design thinking, problem-solving approach, and communication of technical reasoning",
    agent_role:
      "A senior software engineer conducting a technical interview, asking system design and problem-solving questions, probing edge cases and trade-offs",
    participant_role:
      "A software engineering candidate preparing for technical interviews at a top-tier technology company",
    style: "Formal",
    eval_competency: "Technical problem-solving communication and system design reasoning",
    eval_strong:
      "Structures thinking clearly before answering, asks clarifying questions, considers edge cases and trade-offs, and explains reasoning at each step",
    eval_weak:
      "Jumps to solutions without clarifying requirements, ignores edge cases, cannot explain trade-offs, or gives technically incorrect reasoning",
  },
  {
    id: "behavioural-interview",
    name: "Behavioural Interview Trainer (STAR)",
    category: "interview",
    meta: "20 min · Formal",
    suggested_name: "James",
    duration: 20,
    session_objective:
      "Coach the participant to answer behavioural interview questions using the STAR method, drawing on real professional experiences",
    agent_role:
      "An experienced interviewer asking competency-based behavioural questions and coaching the participant to structure answers using the STAR method",
    participant_role:
      "A job seeker or professional preparing for competency-based interviews",
    style: "Formal",
    eval_competency: "Behavioural interview response quality using STAR structure",
    eval_strong:
      "Clearly identifies a Situation and Task, describes specific Actions taken, and articulates measurable Results — with responses that are concise, relevant, and credible",
    eval_weak:
      "Gives generic or vague answers, omits key STAR components, describes team efforts without personal contribution, or provides results that are unquantified",
  },
  {
    id: "case-interview",
    name: "Case Interview Partner",
    category: "interview",
    meta: "30 min · Structured",
    suggested_name: "Priya",
    duration: 30,
    session_objective:
      "Walk the participant through a consulting-style case interview, evaluating their structured problem-solving, quantitative reasoning, and ability to synthesise recommendations",
    agent_role:
      "A management consulting interviewer presenting a business case and guiding the candidate through structured problem solving with probing questions and new information",
    participant_role:
      "A consulting candidate preparing for case interviews at a management consultancy",
    style: "Formal",
    eval_competency: "Structured problem-solving, quantitative reasoning, and consulting communication",
    eval_strong:
      "Frames the problem clearly, structures an approach before diving in, makes reasonable quantitative estimates, synthesises findings into a concise recommendation",
    eval_weak:
      "Jumps into analysis without a framework, makes computational errors without checking, loses the thread of the argument, or cannot synthesise a clear recommendation",
  },

  // Corporate & Sales
  {
    id: "sales-discovery",
    name: "Sales Discovery Call (Roleplay)",
    category: "corporate",
    meta: "15 min · Conversational",
    suggested_name: "Chris",
    duration: 15,
    session_objective:
      "Roleplay a sales discovery call where the participant must uncover customer needs, build rapport, and position their solution without pitching prematurely",
    agent_role:
      "A realistic potential customer — a busy mid-market decision-maker with genuine pain points — responding naturally to the salesperson's questions and approach",
    participant_role:
      "A sales professional practising discovery call technique and consultative selling skills",
    style: "Conversational",
    eval_competency: "Discovery call effectiveness: need uncovering and consultative approach",
    eval_strong:
      "Asks open probing questions, listens actively, uncovers real pain points, builds rapport naturally, and resists pitching before needs are fully understood",
    eval_weak:
      "Jumps to pitching without uncovering needs, asks closed or leading questions, fails to listen or adapt, or pushes through obvious resistance",
  },
  {
    id: "cold-call",
    name: "Cold Call Coach (Roleplay)",
    category: "corporate",
    meta: "10 min · Strict",
    suggested_name: "Dana",
    duration: 10,
    session_objective:
      "Simulate a cold call scenario where the participant must break through initial resistance, earn 30 seconds of attention, and secure a follow-up meeting",
    agent_role:
      "A realistic cold call recipient — a sceptical but reachable executive — applying real objections and gatekeeping behaviour throughout the call",
    participant_role:
      "A sales development representative or account executive practising cold calling technique and objection handling",
    style: "Strict",
    eval_competency: "Cold call opener quality, objection handling, and conversion to next step",
    eval_strong:
      "Delivers a compelling opener quickly, handles objections without caving, maintains confidence under pressure, and steers toward a clear next step",
    eval_weak:
      "Stumbles on the opener, folds under the first objection, fails to earn engagement, or cannot articulate a clear reason to continue the conversation",
  },
];

// ── QnA Agent Templates ────────────────────────────────────────────────────────

export const QNA_TEMPLATES: QnAAgentTemplate[] = [
  // Academic
  {
    id: "history-quiz",
    name: "History Quiz",
    category: "academic",
    meta: "10 min · Conversational",
    suggested_name: "Prof. Okafor",
    duration: 10,
    session_objective:
      "Test the participant's knowledge of historical events, causes, consequences, and key figures across a defined period or theme",
    agent_role:
      "A history teacher running an engaging quiz, asking about events, dates, causes, and significance across historical topics",
    participant_role: "A history student revising for exams or deepening their historical knowledge",
    style: "Conversational",
    feedback_mode: "feedback",
    eval_competency: "Historical knowledge: events, causation, and significance",
    eval_strong:
      "Accurately recalls events and figures, explains causation and consequence, and places events in broader historical context",
    eval_weak:
      "Gets dates and events confused, cannot explain why events happened, or fails to connect individual events to broader historical patterns",
  },
  {
    id: "general-knowledge",
    name: "General Knowledge Quiz",
    category: "academic",
    meta: "10 min · Conversational",
    suggested_name: "Jamie",
    duration: 10,
    session_objective:
      "Test the participant's general knowledge across science, history, geography, culture, and current affairs in an engaging quiz format",
    agent_role:
      "An enthusiastic quiz host asking varied general knowledge questions across multiple domains",
    participant_role: "A participant taking part in a general knowledge quiz for fun or practice",
    style: "Conversational",
    feedback_mode: "feedback",
    eval_competency: "Breadth of general knowledge across multiple domains",
    eval_strong:
      "Answers accurately across a wide range of topics, demonstrates curiosity when uncertain, and engages enthusiastically with unfamiliar questions",
    eval_weak:
      "Gets a high proportion of questions wrong, gives up quickly on uncertain answers, or shows limited engagement with topics outside a narrow interest area",
  },

  // Professional
  {
    id: "swe-knowledge",
    name: "Software Engineering Knowledge Check",
    category: "professional",
    meta: "20 min · Formal",
    suggested_name: "Jordan",
    duration: 20,
    session_objective:
      "Assess the participant's technical knowledge across software engineering topics including data structures, algorithms, system design concepts, and engineering principles",
    agent_role:
      "A senior software engineer conducting a technical knowledge assessment through targeted questions on CS fundamentals and engineering concepts",
    participant_role:
      "A software engineering candidate or developer preparing for technical assessments",
    style: "Formal",
    feedback_mode: "silent",
    eval_competency: "Software engineering fundamentals and conceptual depth",
    eval_strong:
      "Gives technically accurate answers with clear explanations, understands trade-offs, and can reason about complex concepts without prompting",
    eval_weak:
      "Gives vague or incorrect answers, confuses fundamental concepts, or cannot reason beyond surface-level knowledge",
  },

  // Language
  {
    id: "english-proficiency",
    name: "English Proficiency Assessment",
    category: "language",
    meta: "15 min · Formal",
    suggested_name: "Helen",
    duration: 15,
    session_objective:
      "Assess the participant's spoken English proficiency across vocabulary range, grammatical accuracy, coherence, and fluency",
    agent_role:
      "A language assessor conducting a structured spoken English proficiency test through conversation, description tasks, and opinion questions",
    participant_role:
      "A non-native English speaker being assessed for academic, professional, or immigration purposes",
    style: "Formal",
    feedback_mode: "silent",
    eval_competency: "Spoken English proficiency: fluency, accuracy, vocabulary, and coherence",
    eval_strong:
      "Speaks fluently with minimal hesitation, uses varied accurate vocabulary, maintains grammatical control, and produces coherent extended responses",
    eval_weak:
      "Pauses frequently, makes persistent grammatical errors, uses limited vocabulary, or produces fragmented incoherent responses",
  },
  {
    id: "vocabulary-test",
    name: "Vocabulary Knowledge Test",
    category: "language",
    meta: "10 min · Conversational",
    suggested_name: "Sam",
    duration: 10,
    session_objective:
      "Test the participant's vocabulary depth through definition questions, usage in context, synonyms, and word formation tasks",
    agent_role:
      "A language teacher testing vocabulary knowledge through targeted questions on word meaning, usage, and form",
    participant_role:
      "A language learner or student building vocabulary for exams or professional communication",
    style: "Conversational",
    feedback_mode: "feedback",
    eval_competency: "Vocabulary depth: meaning, usage, and word knowledge",
    eval_strong:
      "Accurately defines words, uses them naturally in context, identifies synonyms, and demonstrates knowledge of word families and collocations",
    eval_weak:
      "Cannot define target vocabulary, confuses similar words, or cannot use new vocabulary accurately in context",
  },
];
