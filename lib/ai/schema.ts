import { z } from "zod";

export const outcomeEnum = z.enum([
  "accepted",
  "interested",
  "callback",
  "send_mockup",
  "send_email",
  "send_whatsapp",
  "meeting",
  "not_interested",
  "no_answer",
  "wrong_number",
  "gatekeeper",
  "unknown",
]);

export const segmentationSchema = z.object({
  calls: z.array(
    z.object({
      startTime: z.number(),
      endTime: z.number(),
      reason: z.string(),
    })
  ),
});

export const tonalitySalespersonSchema = z.object({
  certainty: z.number().min(0).max(10),
  enthusiasm: z.number().min(0).max(10),
  confidence: z.number().min(0).max(10),
  authority: z.number().min(0).max(10),
  empathy: z.number().min(0).max(10),
  curiosity: z.number().min(0).max(10),
  scarcity: z.number().min(0).max(10),
  reasonableness: z.number().min(0).max(10),
  urgency: z.number().min(0).max(10),
  clarity: z.number().min(0).max(10),
  energy: z.number().min(0).max(10),
  pacing: z.number().min(0).max(10),
});

export const tonalityProspectSchema = z.object({
  interest: z.number().min(0).max(10),
  trust: z.number().min(0).max(10),
  curiosity: z.number().min(0).max(10),
  skepticism: z.number().min(0).max(10),
  resistance: z.number().min(0).max(10),
  urgency: z.number().min(0).max(10),
  engagement: z.number().min(0).max(10),
  impatience: z.number().min(0).max(10),
});

export const keyMomentSchema = z.object({
  timestamp: z.string(),
  type: z.enum([
    "opener",
    "hook",
    "positive_signal",
    "objection",
    "loss_of_interest",
    "turning_point",
    "close",
    "next_step",
    "mistake",
    "strong_moment",
  ]),
  quote: z.string(),
  explanation: z.string(),
});

export const callAnalysisSchema = z.object({
  prospect: z.object({
    company: z.string().nullable(),
    person: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  outcome: outcomeEnum,
  outcomeReason: z.string().nullable(),
  interestScore: z.number().min(0).max(10),
  summary: z.string(),
  nextAction: z.string().nullable(),
  callbackAt: z.string().nullable(),
  objections: z.array(z.string()),
  positiveSignals: z.array(z.string()),
  negativeSignals: z.array(z.string()),
  salespersonStrengths: z.array(z.string()),
  salespersonMistakes: z.array(z.string()),
  recommendedImprovement: z.string(),
  threeTens: z.object({
    product: z.number().min(0).max(10),
    salesperson: z.number().min(0).max(10),
    company: z.number().min(0).max(10),
    average: z.number().min(0).max(10),
    explanation: z.string(),
  }),
  tonalities: z.object({
    salesperson: tonalitySalespersonSchema,
    prospect: tonalityProspectSchema,
  }),
  scriptScores: z.object({
    opener: z.number().min(0).max(10),
    hook: z.number().min(0).max(10),
    discovery: z.number().min(0).max(10),
    pitch: z.number().min(0).max(10),
    objectionHandling: z.number().min(0).max(10),
    close: z.number().min(0).max(10),
  }),
  keyMoments: z.array(keyMomentSchema),
  analysisNote: z.string(),
});

export type CallAnalysisAI = z.infer<typeof callAnalysisSchema>;

export const sessionInsightSchema = z.object({
  sessionScore: z.number().min(0).max(10),
  topObjection: z.string().nullable(),
  mainIssue: z.string(),
  improvementTip: z.string(),
});

export type SessionInsightAI = z.infer<typeof sessionInsightSchema>;

export function defaultCallAnalysis(): CallAnalysisAI {
  return {
    prospect: { company: null, person: null, phone: null },
    outcome: "unknown",
    outcomeReason: null,
    interestScore: 0,
    summary: "Analyse indisponible pour cet appel.",
    nextAction: null,
    callbackAt: null,
    objections: [],
    positiveSignals: [],
    negativeSignals: [],
    salespersonStrengths: [],
    salespersonMistakes: [],
    recommendedImprovement: "N/A",
    threeTens: { product: 0, salesperson: 0, company: 0, average: 0, explanation: "Non évalué." },
    tonalities: {
      salesperson: {
        certainty: 0,
        enthusiasm: 0,
        confidence: 0,
        authority: 0,
        empathy: 0,
        curiosity: 0,
        scarcity: 0,
        reasonableness: 0,
        urgency: 0,
        clarity: 0,
        energy: 0,
        pacing: 0,
      },
      prospect: {
        interest: 0,
        trust: 0,
        curiosity: 0,
        skepticism: 0,
        resistance: 0,
        urgency: 0,
        engagement: 0,
        impatience: 0,
      },
    },
    scriptScores: { opener: 0, hook: 0, discovery: 0, pitch: 0, objectionHandling: 0, close: 0 },
    keyMoments: [],
    analysisNote: "Analyse générée automatiquement à partir du transcript uniquement ; les dimensions tonales sont inférées du texte, non mesurées acoustiquement.",
  };
}
