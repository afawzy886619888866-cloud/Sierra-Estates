/**
 * SIERRA ESTATES — PROFILING SERVICE (STAGE 6)
 * Extracts stakeholder intelligence using generative AI.
 */

import { GoogleAIService } from '../server/google-ai';

export interface ExtractedProfile {
  nationality?: string;
  moveInDate?: string;
  familySize?: number;
  budget?: number;
  location?: string;
  isQualified: boolean;
  score?: number;
  summary: string;
}

/**
 * Extracts lead profile data from a conversation string.
 */
export async function extractProfileFromChat(history: string): Promise<ExtractedProfile> {
  const prompt = `
    Analyze the following real estate chat history between an agent and a stakeholder.
    Extract the following fields in JSON format:
    - nationality (e.g., "Egyptian", "British")
    - moveInDate (e.g., "Immediate", "May 2026")
    - familySize (number of people)
    - budget (numeric value in EGP or USD)
    - location (preferred area)
    - isQualified (boolean: true if we have budget and move-in date)
    - summary (1-sentence luxury brief of their requirements)

    Chat History:
    """
    ${history}
    """

    Return ONLY the JSON object.
  `;

  try {
    const data = await GoogleAIService.chatCompletions(
      'scribe', 'profiling',
      [
        { role: 'system', content: 'You are an institutional data extractor for Sierra Estates.' },
        { role: 'user', content: prompt }
      ],
      { model: 'gemini-1.5-flash', temperature: 0 }
    );

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse profile data");
    
    const profile = JSON.parse(jsonMatch[0]) as ExtractedProfile;

    // Calculate Sierra's 1-10 Qualification Score
    profile.score = calculateSierraScore(profile);
    profile.isQualified = profile.score >= 8;

    return profile;
  } catch (error) {
    console.error("Profiling Error:", error);
    return {
      isQualified: false,
      summary: "Manual profiling required due to analysis error."
    };
  }
}

/**
 * Sierra's Gatekeeper Algorithm (V12.0 - Merged Intelligence)
 * Scores leads from 1-10 based on investment strategic value.
 * Logic: Nationality/Expat (3 pts), Target Compound (2 pts), Budget (5 pts)
 */
export function calculateSierraScore(profile: Partial<ExtractedProfile>): number {
  let score = 0;
  
  // 1. Budget Threshold (Max 5 pts)
  // Logic: > 10M EGP (5 pts), > 5M EGP (3 pts), else (1 pt)
  if (profile.budget && profile.budget >= 10000000) score += 5;
  else if (profile.budget && profile.budget >= 5000000) score += 3;
  else if (profile.budget && profile.budget >= 60000) score += 1; // Basic entry point

  // 2. Nationality / Expat Status (Max 3 pts)
  // Higher weight for international/strategic stakeholders as per Drive F
  const strategicNationalities = [
    'Kuwaiti', 'Saudi', 'Emirati', 'Qatari', 'American', 'British', 'French', 'German', 'Russian'
  ];
  if (profile.nationality && strategicNationalities.includes(profile.nationality)) {
    score += 3;
  } else if (profile.nationality) {
    score += 1; // Standard interest
  }

  // 3. Target Location / Strategic Compound (Max 2 pts)
  // Priority compounds from the "Target 21" list
  const priorityCompounds = [
    'Mivida', 'Villette', 'Cairo Festival', 'Marakez', 'Sodic', 'Palm Hills', 'Mountain View', 'ZED'
  ];
  const isPriorityLocation = profile.location && priorityCompounds.some(c => 
    profile.location?.toLowerCase().includes(c.toLowerCase())
  );
  
  if (isPriorityLocation) {
    score += 2;
  }

  return Math.min(score, 10);
}

/**
 * Generates the "Precision Interview" response based on missing fields.
 * Refined for Urban Hub OS V4.0 (Institutional Tone)
 */
export function getNextInterviewQuestion(profile: Partial<ExtractedProfile>): string {
  // Intro for completely new interactions
  if (!profile.location && !profile.budget && !profile.moveInDate) {
    return "<b>✦ SIERRA ESTATES | CONCIERGE ✦</b>\n\nWelcome. I am <b>Antigravity</b>, your Senior Intelligence Partner. To curate an institutional portfolio proposal for you, I require 4 strategic data points:\n\n1. 🏙️ Target Location?\n2. 📅 Move-in Date?\n3. 👤 Family Size?\n4. 💰 Budget Range?\n\nWhich area are you currently focusing on for your next luxury residence?";
  }

  if (!profile.location) return "Perfect. To accurately filter our Nexus inventory, which specific area (e.g., New Cairo, Shourouk, Matareya) are we targeting?";
  if (!profile.budget) return "Understood. What is the maximum monthly budget range you wish to stay within for this selection?";
  if (!profile.moveInDate) return "Strategic Timing: What is your target move-in date? (Immediate or a specific upcoming month?)";
  if (!profile.nationality) return "Final Detail: For registration in our stakeholder vault, could you please confirm your nationality and total household size?";
  
  return "<b>Excellent. Intelligence Capture Complete.</b>\n\nI have registered your requirements into the <b>Matchmaker Engine (S7)</b>. I am now synthesizing your <b>Cinematic Portfolio Proposal</b>. You will receive a unique link to our selection vault shortly.";
}

/**
 * Extracts feedback, objections, and sentiment from a stakeholder's interaction.
 * Used for Neural Memory (V9.0) Stage 9/10.
 */
export async function extractFeedbackAndSentiment(transcript: string) {
  const prompt = `
    Analyze this real estate interaction and extract specific stakeholder feedback.
    Identify any "Negative Signals" (things they specifically dislike) and general objections.
    
    Fields to extract (JSON):
    - signals: Array of { category: "price"|"location"|"finishing"|"layout"|"view", description: string, importance: 0-1 }
    - objections: Array of { reason: string, category: string, sentiment: "positive"|"neutral"|"aggressive"|"desperate" }
    - matrix: { lossAversion: 0-1, premiumTolerance: 0-1 }
    
    Transcript:
    """
    ${transcript}
    """
    
    Return ONLY JSON.
  `;

  try {
    const data = await GoogleAIService.chatCompletions(
      'closer', 'feedback-analysis',
      [
        { role: 'system', content: 'Analyze stakeholder sentiment and feedback.' },
        { role: 'user', content: prompt }
      ],
      { model: 'gemini-1.5-flash', temperature: 0 }
    );

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Feedback Extraction Error:", error);
    return null;
  }
}

/**
 * Orchestration Helper: Conducts the extraction and updates the lead state.
 * Expected by Stage 6 Matchmaker.
 */
export async function conductPrecisionInterview(leadId: string, transcript: string) {
  const profile = await extractProfileFromChat(transcript);
  
  // Dynamic import to avoid client/server conflicts in shared libs
  const { db } = await import('../firebase');
  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  
  const { COLLECTIONS } = await import('../models/schema');
  const leadRef = doc(db, COLLECTIONS.stakeholders, leadId);
  await updateDoc(leadRef, {
    'intelligence.profile': {
      nationality: profile.nationality,
      familySize: profile.familySize,
      moveInDate: profile.moveInDate,
      budget: profile.budget,
      location: profile.location,
      score: profile.score
    },
    'aiProfiling.summary': profile.summary,
    'aiProfiling.isQualified': profile.isQualified,
    'orchestrationState.stage': profile.score && profile.score >= 8 ? 'S8' : 'S7',
    'orchestrationState.status': 'completed',
    updatedAt: serverTimestamp()
  });

  // If high quality lead, trigger Concierge Page (S8)
  if (profile.score && profile.score >= 8) {
    console.log(`🔥 HIGH VALUE LEAD DETECTED: ${leadId} (Score: ${profile.score}). Triggering S8 Concierge.`);
  }

  return profile;
}
