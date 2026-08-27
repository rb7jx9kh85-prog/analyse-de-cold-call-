import OpenAI from "openai";
import { z } from "zod";
import {
  callAnalysisSchema,
  defaultCallAnalysis,
  segmentationSchema,
  sessionInsightSchema,
  type CallAnalysisAI,
  type SessionInsightAI,
} from "./schema";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured on the server.");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  duration: number;
  segments: TranscriptSegment[];
}

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function transcribeAudio(file: File): Promise<TranscriptionResult> {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(
      `Le fichier dépasse la limite de 25MB imposée par l'API de transcription. Découpe l'enregistrement en plusieurs fichiers plus courts et importe-les séparément.`
    );
  }

  const openai = getOpenAI();
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const anyResult = result as unknown as {
    text: string;
    duration?: number;
    segments?: { start: number; end: number; text: string }[];
  };

  const segments: TranscriptSegment[] = (anyResult.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));

  return {
    fullText: anyResult.text,
    duration: anyResult.duration ?? segments[segments.length - 1]?.end ?? 0,
    segments,
  };
}

async function structuredJson<T>(schema: z.ZodType<T>, systemPrompt: string, userContent: string, fallback: T): Promise<T> {
  const openai = getOpenAI();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (err) {
      if (attempt === 1) {
        return fallback;
      }
    }
  }
  return fallback;
}

export async function segmentCalls(
  segments: TranscriptSegment[],
  totalDuration: number
): Promise<{ startTime: number; endTime: number; reason: string }[]> {
  const compact = segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`).join("\n");

  const fallback = [{ startTime: 0, endTime: totalDuration, reason: "Fallback: segmentation non déterminée, session traitée comme un seul appel." }];

  if (!compact.trim()) return fallback;

  const result = await structuredJson(
    segmentationSchema,
    `Tu es un expert en analyse de sessions de cold call. On te donne un transcript horodaté (secondes) d'un enregistrement pouvant contenir PLUSIEURS appels téléphoniques distincts, séparés par des silences, des sonneries, des nouvelles salutations ("bonjour"), des raccrochages ou des changements évidents de conversation.
Ta tâche : découper la session en appels individuels distincts.
Réponds en JSON strict au format {"calls":[{"startTime":number,"endTime":number,"reason":string}]}.
Les startTime/endTime sont en secondes, doivent couvrir toute la durée (${totalDuration.toFixed(1)}s) sans se chevaucher, dans l'ordre chronologique.
Si tu ne détectes qu'un seul appel, renvoie un seul objet couvrant toute la durée.`,
    compact,
    { calls: fallback }
  );

  if (!result.calls || result.calls.length === 0) return fallback;
  return result.calls;
}

export async function analyzeCall(transcript: string, callDuration: number): Promise<CallAnalysisAI> {
  const fallback = defaultCallAnalysis();

  return structuredJson(
    callAnalysisSchema,
    `Tu es un coach commercial senior spécialisé dans l'analyse de cold calls, formé aux "Three Tens" de Jordan Belfort (certainty in the product, certainty in you/salesperson, certainty in the company).
On te donne le transcript d'UN appel téléphonique de prospection (vendeur = ALPINIA, agence web basée en Valais, Suisse ; prospect = entreprise appelée).
Analyse cet appel et réponds en JSON strict respectant exactement ce schéma :
{
 "prospect": {"company": string|null, "person": string|null, "phone": string|null},
 "outcome": "accepted"|"interested"|"callback"|"send_mockup"|"send_email"|"send_whatsapp"|"meeting"|"not_interested"|"no_answer"|"wrong_number"|"gatekeeper"|"unknown",
 "outcomeReason": string|null,
 "interestScore": number (0-10),
 "summary": string (2-4 phrases),
 "nextAction": string|null,
 "callbackAt": string|null (date/heure en texte libre si mentionné, sinon null),
 "objections": string[],
 "positiveSignals": string[],
 "negativeSignals": string[],
 "salespersonStrengths": string[],
 "salespersonMistakes": string[],
 "recommendedImprovement": string (une seule recommandation actionnable),
 "threeTens": {"product": number(0-10), "salesperson": number(0-10), "company": number(0-10), "average": number(0-10), "explanation": string},
 "tonalities": {
   "salesperson": {"certainty":n,"enthusiasm":n,"confidence":n,"authority":n,"empathy":n,"curiosity":n,"scarcity":n,"reasonableness":n,"urgency":n,"clarity":n,"energy":n,"pacing":n} (chaque n 0-10),
   "prospect": {"interest":n,"trust":n,"curiosity":n,"skepticism":n,"resistance":n,"urgency":n,"engagement":n,"impatience":n} (chaque n 0-10)
 },
 "scriptScores": {"opener":n,"hook":n,"discovery":n,"pitch":n,"objectionHandling":n,"close":n} (chaque n 0-10),
 "keyMoments": [{"timestamp": "MM:SS", "type": "opener"|"hook"|"positive_signal"|"objection"|"loss_of_interest"|"turning_point"|"close"|"next_step"|"mistake"|"strong_moment", "quote": string, "explanation": string}],
 "analysisNote": string (précise que l'analyse tonale est inférée du texte transcrit, pas mesurée acoustiquement)
}
N'invente JAMAIS de nom d'entreprise ou de personne si l'information n'est pas clairement énoncée dans le transcript : utilise null.
Durée de l'appel: ${callDuration.toFixed(0)}s.`,
    transcript,
    fallback
  );
}

export async function analyzeSession(callSummaries: string): Promise<SessionInsightAI> {
  const fallback: SessionInsightAI = {
    sessionScore: 0,
    topObjection: null,
    mainIssue: "Analyse de session indisponible.",
    improvementTip: "Réessaie l'analyse de session plus tard.",
  };

  if (!callSummaries.trim()) return fallback;

  return structuredJson(
    sessionInsightSchema,
    `Tu es un coach commercial senior. On te donne les résumés structurés de tous les appels d'une session de cold call.
Produis UNE synthèse globale en JSON strict: {"sessionScore": number(0-10), "topObjection": string|null, "mainIssue": string (1-2 phrases décrivant LE problème principal du vendeur sur cette session), "improvementTip": string (UNE seule recommandation actionnable pour la prochaine session)}.
Ne donne pas 20 conseils : une seule priorité.`,
    callSummaries,
    fallback
  );
}
