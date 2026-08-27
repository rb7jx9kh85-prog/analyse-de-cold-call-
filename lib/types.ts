export type CallOutcome =
  | "accepted"
  | "interested"
  | "callback"
  | "send_mockup"
  | "send_email"
  | "send_whatsapp"
  | "meeting"
  | "not_interested"
  | "no_answer"
  | "wrong_number"
  | "gatekeeper"
  | "unknown";

export type OutcomeGroup = "yes" | "no" | "no_answer" | "callback" | "other";

export function outcomeGroup(outcome: CallOutcome): OutcomeGroup {
  if (["accepted", "interested", "send_mockup", "send_email", "send_whatsapp", "meeting"].includes(outcome)) return "yes";
  if (outcome === "callback") return "callback";
  if (outcome === "no_answer") return "no_answer";
  if (["not_interested", "wrong_number", "gatekeeper"].includes(outcome)) return "no";
  return "other";
}

export interface TonalitySalesperson {
  certainty: number;
  enthusiasm: number;
  confidence: number;
  authority: number;
  empathy: number;
  curiosity: number;
  scarcity: number;
  reasonableness: number;
  urgency: number;
  clarity: number;
  energy: number;
  pacing: number;
}

export interface TonalityProspect {
  interest: number;
  trust: number;
  curiosity: number;
  skepticism: number;
  resistance: number;
  urgency: number;
  engagement: number;
  impatience: number;
}

export interface ThreeTens {
  product: number;
  salesperson: number;
  company: number;
  average: number;
  explanation: string;
}

export interface KeyMoment {
  timestamp: string;
  type:
    | "opener"
    | "hook"
    | "positive_signal"
    | "objection"
    | "loss_of_interest"
    | "turning_point"
    | "close"
    | "next_step"
    | "mistake"
    | "strong_moment";
  quote: string;
  explanation: string;
}

export interface ScriptScores {
  opener: number;
  hook: number;
  discovery: number;
  pitch: number;
  objectionHandling: number;
  close: number;
}

export interface TranscriptLine {
  timestamp: string;
  startSeconds: number;
  speaker: string;
  text: string;
}

export interface CallRecord {
  id: string;
  sessionId: string;
  createdAt: string;
  startTime: number;
  endTime: number;
  duration: number;
  company: string | null;
  person: string | null;
  phone: string | null;
  outcome: CallOutcome;
  outcomeReason: string | null;
  interestScore: number;
  transcript: TranscriptLine[];
  summary: string;
  nextAction: string | null;
  callbackAt: string | null;
  objections: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  salespersonStrengths: string[];
  salespersonMistakes: string[];
  recommendedImprovement: string;
  threeTens: ThreeTens;
  tonalities: {
    salesperson: TonalitySalesperson;
    prospect: TonalityProspect;
  };
  scriptScores: ScriptScores;
  keyMoments: KeyMoment[];
  audioUrl: string | null;
  analysisNote: string;
  edited?: boolean;
}

export interface SessionSummaryStats {
  totalCalls: number;
  yes: number;
  no: number;
  noAnswer: number;
  callback: number;
  positiveRate: number;
  answerRate: number;
  sessionScore: number | null;
  bestCallId: string | null;
  worstCallId: string | null;
  topObjection: string | null;
  mainIssue: string | null;
  improvementTip: string | null;
}

export type SessionStatus = "uploading" | "transcribing" | "detecting" | "analyzing" | "saving" | "ready" | "error";

export interface SessionRecord {
  id: string;
  createdAt: string;
  label: string;
  audioUrl: string | null;
  duration: number;
  status: SessionStatus;
  progressMessage: string | null;
  error: string | null;
  callIds: string[];
  stats: SessionSummaryStats;
}
