/**
 * Voice Notes Transcription & Processing Service
 * Transcribes inbound WhatsApp Egyptian Arabic / English voice notes (PTT)
 * using Gemini Multimodal Audio Processing.
 */

const { GoogleGenAI } = require('@google/genai');

class VoiceService {
  constructor() {
    this.ai = null;
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey && !apiKey.includes('placeholder')) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (e) {}
    }
  }

  /**
   * Transcribe WhatsApp voice message buffer (base64) using Gemini 2.0 Flash
   * @param {string} base64Audio - Base64 encoded audio data (ogg/mp4/aac/wav)
   * @param {string} mimeType - Audio mime type (e.g. 'audio/ogg; codecs=opus')
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(base64Audio, mimeType = 'audio/ogg') {
    if (!this.ai) {
      console.warn('⚠️ [VoiceService] Gemini API key not initialized for audio transcription.');
      return '';
    }

    try {
      const cleanMime = mimeType.split(';')[0].trim() || 'audio/ogg';

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: base64Audio,
                },
              },
              {
                text: 'You are an expert transcriber. Transcribe this audio message exactly as spoken in Arabic (Egyptian dialect / عامية مصرية) or English. Return ONLY the transcribed text with no preface or explanations.',
              },
            ],
          },
        ],
      });

      const transcription = response.text ? response.text.trim() : '';
      console.log(`🎙️ [VoiceService] Transcribed Voice Note: "${transcription}"`);
      return transcription;
    } catch (err) {
      console.error('❌ [VoiceService] Transcription error:', err.message);
      return '';
    }
  }
}

module.exports = new VoiceService();
