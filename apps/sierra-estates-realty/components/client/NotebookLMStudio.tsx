'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Headphones,
  Sparkles,
  Send,
  FileText,
  Layers,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

interface Citation {
  sourceId: string;
  sourceTitle: string;
  excerpt: string;
  confidence: number;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  groundingScore?: number;
  keyTakeaways?: string[];
}

interface DialogueTurn {
  speaker: 'Host_Alex' | 'Analyst_Sara';
  speakerArabic: 'أحمد (المحاور)' | 'سارة (محللة الاستثمار)';
  dialogue: string;
  focusTopic: string;
}

interface PodcastData {
  title: string;
  summary: string;
  script: DialogueTurn[];
  totalEstimatedDurationMinutes: number;
}

interface StudyGuideData {
  title: string;
  executiveSummary: string;
  keyInvestmentMetrics: { metric: string; value: string; significance: string }[];
  glossary: { term: string; definition: string }[];
  faqs: { question: string; answer: string; sourceCitation: string }[];
  recommendedActions: string[];
}

export default function NotebookLMStudio() {
  const { lang } = useSite();
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'chat' | 'audio' | 'guide' | 'sources'>('chat');
  const [sources, setSources] = useState<any[]>([]);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  // Podcast / Audio Overview State
  const [podcastData, setPodcastData] = useState<PodcastData | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Study Guide State
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);

  // Fetch initial corpus
  useEffect(() => {
    fetch('/api/notebookllm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'corpus' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.sources) {
          setSources(data.sources);
        }
      })
      .catch((err) => console.error('Failed to load sources corpus', err));

    // Welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'ai',
        content: isAr
          ? 'مرحباً بك في Google NotebookLM الخاص بشركة سييرا العقارية. تم ربط جميع أبحاث السوق، الماستر إنفنتوري (9,000+ وحدة)، ومخططات كايرو بلازا المالية. يمكنك طرح أي استفسار للتحقق الموثق بالمصادر، أو توليد بودكاست صوتي ذكي (Audio Overview) بنقرة واحدة.'
          : 'Welcome to Google NotebookLM by Sierra Estates. Grounded across verified master inventory (9,000+ units), Cairo Plaza blueprints, and market pricing. Ask any investment question with direct citations, or generate a 2-person Deep Dive Audio Overview.',
        citations: [],
        groundingScore: 1.0,
      },
    ]);
  }, [isAr]);

  // Handle Grounded Q&A
  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isQuerying) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsQuerying(true);

    try {
      const res = await fetch('/api/notebookllm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          query: textToSend,
          sources,
          language: isAr ? 'ar' : 'en',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: json.data.answer,
          citations: json.data.citations,
          groundingScore: json.data.groundingScore,
          keyTakeaways: json.data.keyTakeaways,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(json.error || 'Query failed');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: isAr
            ? `⚠️ تعذر استخراج الإجابة: ${err.message}`
            : `⚠️ Could not extract grounded response: ${err.message}`,
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  // Generate Audio Overview Podcast
  const handleGeneratePodcast = async () => {
    setIsGeneratingPodcast(true);
    try {
      const res = await fetch('/api/notebookllm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audio-overview',
          sources,
          language: isAr ? 'ar' : 'en',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPodcastData(json.data);
      }
    } catch (err) {
      console.error('Audio overview error', err);
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  // Speech synthesis playback for podcast
  const playDialogueTurn = (index: number) => {
    if (!podcastData || index >= podcastData.script.length) {
      setIsPlayingAudio(false);
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert(isAr ? 'متصفحك لا يدعم القراءة الصوتية.' : 'Your browser does not support Speech Synthesis.');
      return;
    }

    window.speechSynthesis.cancel();

    const turn = podcastData.script[index];
    setCurrentTurnIndex(index);
    setIsPlayingAudio(true);

    const utterance = new SpeechSynthesisUtterance(turn.dialogue);
    utterance.lang = isAr ? 'ar-SA' : 'en-US';
    utterance.rate = turn.speaker === 'Host_Alex' ? 1.05 : 0.98;

    utterance.onend = () => {
      if (index + 1 < podcastData.script.length) {
        playDialogueTurn(index + 1);
      } else {
        setIsPlayingAudio(false);
      }
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePodcastPlayback = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
    } else {
      playDialogueTurn(currentTurnIndex);
    }
  };

  // Generate Executive Study Guide
  const handleGenerateStudyGuide = async () => {
    setIsGeneratingGuide(true);
    try {
      const res = await fetch('/api/notebookllm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'study-guide',
          sources,
          language: isAr ? 'ar' : 'en',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setStudyGuide(json.data);
      }
    } catch (err) {
      console.error('Study guide error', err);
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const suggestedQuestions = isAr
    ? [
        'قارن بين متوسط سعر المتر في ميفيدا وهايد بارك لعام 2026',
        'ما هي عوائد الإيجار المتوقعة في أبراج كايرو بلازا ومواصفات البرج؟',
        'ما هي قواعد خصم الكاش والتحكيم العقاري (Arbitrage) في سييرا؟',
        'ما هي مواصفات وتسهيلات كمبوند بالم هيلز القاهرة الجديدة؟',
      ]
    : [
        'Compare 2026 price per sqm between Mivida and Hyde Park.',
        'What are the projected rental yields for Cairo Plaza Towers?',
        'Explain the Sierra Estates Underpriced Arbitrage rule.',
        'Summarize villa pricing and payment terms in Palm Hills.',
      ];

  return (
    <div className="nlm-studio-page" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="nlm-container">
        {/* Header Banner */}
        <header className="nlm-header">
          <div className="nlm-badge">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span>Google NotebookLM Grounded Studio · Sierra Intelligence</span>
          </div>
          <h1 className="nlm-title">
            {isAr ? 'استوديو نوت بوك إل إم العقاري الذكي' : 'Grounded Real Estate Research Studio'}
          </h1>
          <p className="nlm-subtitle">
            {isAr
              ? 'تحليل استثماري موثق 100% بالمصادر والأرقام الحقيقية، مع توليد بودكاست صوتي ذكي (Audio Overview) وملخصات تنفيذية من ملفات الماستر إنفنتوري وكايرو بلازا.'
              : 'Grounded intelligence across 9,000+ master units, Cairo Plaza blueprints, and market yield models with 2-host audio podcast synthesis.'}
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="nlm-tabs">
          <button
            className={`nlm-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isAr ? 'المحادثة الموثقة (Grounded Q&A)' : 'Grounded Q&A'}</span>
          </button>
          <button
            className={`nlm-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('audio');
              if (!podcastData && !isGeneratingPodcast) handleGeneratePodcast();
            }}
          >
            <Headphones className="w-4 h-4" />
            <span>{isAr ? 'البودكاست الصوتي الذكي (Audio Overview)' : 'Audio Overview'}</span>
          </button>
          <button
            className={`nlm-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('guide');
              if (!studyGuide && !isGeneratingGuide) handleGenerateStudyGuide();
            }}
          >
            <FileText className="w-4 h-4" />
            <span>{isAr ? 'الدليل والملخص التنفيذي (Study Guide)' : 'Executive Study Guide'}</span>
          </button>
          <button
            className={`nlm-tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            <Layers className="w-4 h-4" />
            <span>{isAr ? `المصادر الموثقة (${sources.length})` : `Grounded Sources (${sources.length})`}</span>
          </button>
        </div>

        {/* Main Workspace Layout */}
        <div className="nlm-grid">
          {/* Sidebar: Sources List */}
          <aside className="nlm-sources-card">
            <div className="nlm-sources-header">
              <span className="nlm-sources-title">
                <ShieldCheck className="w-5 h-5 text-[#d4af37]" />
                {isAr ? 'المستندات النشطة' : 'Active Sources'}
              </span>
              <span className="text-xs text-[#94a3b8]">{sources.length} {isAr ? 'ملفات' : 'docs'}</span>
            </div>

            {sources.map((s) => (
              <div key={s.id} className="nlm-source-item">
                <span className="nlm-source-badge">{s.type}</span>
                <h4 className="nlm-source-name">{s.title}</h4>
                <p className="nlm-source-preview">{s.content}</p>
              </div>
            ))}

            {activeCitation && (
              <div className="nlm-citation-excerpt">
                <div className="font-bold text-[#d4af37] text-xs mb-1">
                  📌 {activeCitation.sourceTitle} ({(activeCitation.confidence * 100).toFixed(0)}% Confidence)
                </div>
                "{activeCitation.excerpt}"
              </div>
            )}
          </aside>

          {/* Main Work Area */}
          <main className="nlm-main-card">
            {/* TAB 1: Grounded Q&A */}
            {activeTab === 'chat' && (
              <>
                <div className="nlm-chat-history">
                  {messages.map((m) => (
                    <div key={m.id} className={`nlm-message ${m.role}`}>
                      <div className="nlm-avatar">
                        {m.role === 'ai' ? <Sparkles className="w-5 h-5" /> : '👤'}
                      </div>
                      <div className="nlm-bubble">
                        <div className="whitespace-pre-wrap">{m.content}</div>

                        {/* Citation Chips */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="nlm-citations-container">
                            <span className="text-xs text-[#94a3b8] font-bold block w-full mb-1">
                              {isAr ? '📑 المصادر المباشرة:' : '📑 Direct Citations:'}
                            </span>
                            {m.citations.map((c, i) => (
                              <button
                                key={i}
                                type="button"
                                className="nlm-citation-chip"
                                onClick={() => setActiveCitation(c)}
                                title={c.excerpt}
                              >
                                <span>[{i + 1}] {c.sourceTitle}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}

                        {m.keyTakeaways && m.keyTakeaways.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-white/10 text-xs text-[#cbd5e1]">
                            <b>{isAr ? '💡 أبرز النقاط:' : '💡 Key Takeaways:'}</b>
                            <ul className="list-disc list-inside mt-1">
                              {m.keyTakeaways.map((t, idx) => (
                                <li key={idx}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isQuerying && (
                    <div className="nlm-message ai">
                      <div className="nlm-avatar"><Sparkles className="w-5 h-5" /></div>
                      <div className="nlm-bubble text-[#94a3b8] animate-pulse">
                        {isAr ? 'جاري الفحص الموثق عبر مستندات المصادر والأرقام...' : 'Synthesizing grounded response from verified sources...'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuery();
                  }}
                  className="nlm-input-bar"
                >
                  <input
                    type="text"
                    className="nlm-input-field"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={
                      isAr
                        ? 'اسأل عن أسعار المتر، عوائد كايرو بلازا، أو مقارنات ميفيدا وهايد بارك...'
                        : 'Ask about price/sqm, Cairo Plaza yields, or compound comparisons...'
                    }
                    disabled={isQuerying}
                  />
                  <button type="submit" className="nlm-send-btn" disabled={isQuerying || !inputQuery.trim()}>
                    <Send className="w-4 h-4" />
                    <span>{isAr ? 'استفسار' : 'Ask'}</span>
                  </button>
                </form>

                {/* Suggested Chips */}
                <div className="nlm-suggestions">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="nlm-suggest-chip"
                      onClick={() => handleSendQuery(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* TAB 2: Audio Overview (Podcast Deep Dive) */}
            {activeTab === 'audio' && (
              <div>
                <div className="nlm-podcast-card">
                  <div className="nlm-podcast-header">
                    <div>
                      <span className="nlm-badge">🎙️ Google Deep Dive Audio Overview</span>
                      <h3 className="text-xl font-bold text-white mt-2">
                        {podcastData ? podcastData.title : (isAr ? 'جاري إعداد حلقة البودكاست الاستثمارية...' : 'Preparing Deep Dive Episode...')}
                      </h3>
                      <p className="text-sm text-[#94a3b8] mt-1">
                        {podcastData?.summary || (isAr ? 'حوار تحليلي ثنائي بين المذيع ومحللة الاستثمار العقاري لفك شفرة الفرص الاستثمارية.' : '2-host deep dive unpacking yields, price arbitrage, and master inventory.')}
                      </p>
                    </div>

                    <div className="nlm-audio-controls">
                      <div className={`nlm-waveform ${isPlayingAudio ? 'playing' : ''}`}>
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="nlm-waveform-bar" />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="nlm-play-btn"
                        onClick={togglePodcastPlayback}
                        disabled={!podcastData}
                        title={isPlayingAudio ? 'Pause Audio' : 'Play Audio'}
                      >
                        {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="nlm-podcast-hosts">
                    <div className={`nlm-host-pill ${currentTurnIndex % 2 === 0 && isPlayingAudio ? 'active' : ''}`}>
                      <span>🎙️ {isAr ? 'أحمد (المحاور)' : 'Host Alex'}</span>
                    </div>
                    <div className={`nlm-host-pill ${currentTurnIndex % 2 === 1 && isPlayingAudio ? 'active' : ''}`}>
                      <span>📊 {isAr ? 'سارة (محللة الاستثمار)' : 'Analyst Sara'}</span>
                    </div>
                  </div>
                </div>

                {isGeneratingPodcast && (
                  <div className="text-center py-16 text-[#d4af37] animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p>{isAr ? 'جاري كتابة وتوليد حلقة البودكاست الصوتية بواسطة Gemini...' : 'Generating podcast dialogue turns with Gemini...'}</p>
                  </div>
                )}

                {podcastData && (
                  <div className="nlm-podcast-script">
                    {podcastData.script.map((turn, i) => (
                      <div
                        key={i}
                        className={`nlm-dialogue-turn ${currentTurnIndex === i && isPlayingAudio ? 'current-playing' : ''}`}
                        onClick={() => playDialogueTurn(i)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="nlm-speaker-tag">
                          <span>{turn.speaker === 'Host_Alex' ? '🎙️' : '📊'}</span>
                          <span>{isAr ? turn.speakerArabic : turn.speaker}</span>
                          <span className="text-xs text-[#64748b] font-normal mr-auto">({turn.focusTopic})</span>
                        </div>
                        <p className="nlm-dialogue-text">{turn.dialogue}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Study Guide */}
            {activeTab === 'guide' && (
              <div>
                {isGeneratingGuide && (
                  <div className="text-center py-16 text-[#d4af37] animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p>{isAr ? 'جاري تلخيص وتوليد الدليل التنفيذي...' : 'Generating executive study guide...'}</p>
                  </div>
                )}

                {studyGuide && (
                  <div>
                    <div className="nlm-guide-section">
                      <h3 className="nlm-guide-title">
                        <TrendingUp className="w-5 h-5 text-[#d4af37]" />
                        <span>{studyGuide.title}</span>
                      </h3>
                      <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-sm text-[#e2e8f0] leading-relaxed">
                        {studyGuide.executiveSummary}
                      </div>
                    </div>

                    <div className="nlm-guide-section">
                      <h4 className="nlm-guide-title">
                        <DollarSign className="w-5 h-5 text-[#d4af37]" />
                        <span>{isAr ? 'المؤشرات المالية الرئيسية' : 'Key Investment Metrics'}</span>
                      </h4>
                      <div className="nlm-metrics-grid">
                        {studyGuide.keyInvestmentMetrics.map((m, idx) => (
                          <div key={idx} className="nlm-metric-card">
                            <div className="nlm-metric-val">{m.value}</div>
                            <div className="nlm-metric-name">{m.metric}</div>
                            <div className="nlm-metric-sig">{m.significance}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="nlm-guide-section">
                      <h4 className="nlm-guide-title">
                        <BookOpen className="w-5 h-5 text-[#d4af37]" />
                        <span>{isAr ? 'الأسئلة الشائعة الموثقة' : 'Grounded FAQs'}</span>
                      </h4>
                      <div className="space-y-3">
                        {studyGuide.faqs.map((f, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <b className="text-[#d4af37] block text-sm mb-1">{f.question}</b>
                            <p className="text-xs text-[#cbd5e1] leading-relaxed">{f.answer}</p>
                            <span className="text-[10px] text-[#64748b] mt-2 block">Ref: {f.sourceCitation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Sources Vault */}
            {activeTab === 'sources' && (
              <div>
                <h3 className="nlm-guide-title">
                  <Layers className="w-5 h-5 text-[#d4af37]" />
                  <span>{isAr ? 'قاعدة المستندات الموثقة (Verified Grounded Vault)' : 'Grounded Documents Vault'}</span>
                </h3>
                <div className="space-y-4 mt-4">
                  {sources.map((s, idx) => (
                    <div key={s.id} className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white text-base">[{idx + 1}] {s.title}</h4>
                        <span className="nlm-source-badge">{s.type}</span>
                      </div>
                      <p className="text-xs text-[#94a3b8] whitespace-pre-wrap leading-relaxed bg-black/30 p-4 rounded-lg border border-white/5">
                        {s.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
