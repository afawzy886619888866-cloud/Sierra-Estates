import { insertRecord } from '@sierra-estates/db';

/**
 * SIERRA ESTATES — VOICE SERVICE (V1.0)
 * Handles ElevenLabs integration for Sierra's voice cloning and TTS notes.
 */

export class VoiceService {
  private static ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  private static VOICE_ID = process.env.LEILA_VOICE_ID || 'pNInz6obpg8nEByWQX7L'; // Default professional female voice

  /**
   * Generates a voice note for a lead and stores the signal as an activity.
   */
  static async generateSierraVoiceNote(leadId: string, text: string): Promise<string | null> {
    if (!this.ELEVENLABS_API_KEY) {
      console.warn("⚠️ [VoiceService] Missing ELEVENLABS_API_KEY. Skipping voice generation.");
      return null;
    }

    try {
      console.log(`🎙️ [VoiceService] Generating Sierra voice note for lead ${leadId}...`);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      // In a real implementation, we would upload the buffer to Supabase Storage.
      // For the "Sales Machine" prototype, we log the intent and return a mock URL.
      const _audioBuffer = await response.arrayBuffer();
      
      // `activities` has no lead_id column: the subject of an activity is
      // (related_type, related_id), which is what the admin feed joins on.
      await insertRecord('activities', {
        type: 'voice_note_generated',
        relatedType: 'lead',
        relatedId: leadId,
        actorName: 'Sierra Concierge',
        text: `Generated personalized voice briefing for stakeholder.`,
      });

      return `https://sierra-estates-assets.s3.amazonaws.com/voice/sierra_${Date.now()}.mp3`;

    } catch (error) {
      console.error("❌ [VoiceService] Generation failed:", error);
      return null;
    }
  }
}
