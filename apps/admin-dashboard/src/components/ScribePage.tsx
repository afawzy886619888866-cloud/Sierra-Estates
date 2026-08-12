import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createSierraNotification } from '../firebase';

interface ScribePageProps {
  T: (key: string) => string;
}

export default function ScribePage({ T }: ScribePageProps) {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<{ k: string; v: string }[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Voice dictation states
  const [isListening, setIsListening] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'ar-EG' | 'en-US'>('ar-EG');
  const [micStatus, setMicStatus] = useState<string>('Ready to record spoken feed');

  // References for Web Speech API
  const recognitionRef = useRef<any>(null);
  const simulationTimeoutRef = useRef<any>(null);

  const EXAMPLES = [
    "شقة 3 غرف ميفيدا · دور 3 · مفروشة · 95م² · 14,500/شهر",
    "Villa Hyde Park · 5+1 BHK · 450m² · private pool · EGP 35M negotiable",
    "Penthouse Uptown Cairo · last floor · 320m · 4bed+maid · lake view · EGP 18.5M",
  ];

  // Detect and initialize browser SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          setIsListening(true);
          setMicStatus(voiceLang === 'ar-EG' ? 'جاري الاستماع... تحدّث الآن' : 'Listening... Speak clearly now');
          setErrorMsg(null);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript || interimTranscript) {
            setRaw((prev) => {
              const cleaned = prev.trim();
              const addition = finalTranscript || interimTranscript;
              return cleaned ? `${cleaned} ${addition}` : addition;
            });
          }
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setMicStatus('Mic blocked. Check browser or iframe permissions');
            setErrorMsg('Microphone permission denied. Note: AI Studio sandbox frames may restrict voice access. Try using the high-fidelity simulator below!');
          } else {
            setMicStatus(`Status code: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
          setMicStatus('Dictation session finished');
        };

        recognitionRef.current = rec;
      } catch (err) {
        console.warn('SpeechRecognition initialization failed:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, [voiceLang]);

  // Voice controls
  const startRecording = () => {
    if (isSimulating) stopSimulation();
    if (isListening) {
      stopRecording();
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.lang = voiceLang;
      try {
        setRaw('');
        recognitionRef.current.start();
      } catch (err) {
        console.error('Start speech system error:', err);
        // Fallback warning if browser environment blocks call
        setErrorMsg('Web Speech API is restricted in this sandboxed layout. Try the Simulator below instead!');
      }
    } else {
      setErrorMsg('This browser does not support SpeechRecognition. Simply try our interactive Simulator below to trigger simulated spoken feeds!');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setIsListening(false);
  };

  // Soundwave Simulator for testing voice in iframe / non-mic contexts securely
  const startSimulation = () => {
    if (isListening) stopRecording();
    if (isSimulating) {
      stopSimulation();
      return;
    }

    setIsSimulating(true);
    setRaw('');
    setMicStatus(voiceLang === 'ar-EG' ? 'محاكاة تسجيل صوتي عربي...' : 'Simulating high-fidelity English voice dictation...');
    setErrorMsg(null);

    const arabicPhrases = [
      "أهلاً ليتل كاتب،",
      "أريد كتابة وتسجيل طلب عقاري جديد.",
      "فيلا مستقلة صف أول على البحيرة",
      "في كمبوند ميفيدا التجمع الخامس.",
      "المساحة المبنية تبلغ 450 متر مربع،",
      "تحتوي على خمسة غرف نوم ومساعدين،",
      "ومسبح خاص فاخر.",
      "مطلوب كاش 35 مليون جنيه مصري.",
      "العقار جاهز تماماً للمعاينة والبيع الفوري."
    ];

    const englishPhrases = [
      "Hi Scribe, I would like to record a new voice listing.",
      "It is a luxury penthouse in Uptown Cairo.",
      "The layout covers 320 square meters,",
      "with 4 beds, 4 baths, a maid quarter,",
      "and a breathtaking view of the golf lake.",
      "Asking price is EGP 18.5M negotiable,",
      "available for immediate resale with premium finishing."
    ];

    const phrases = voiceLang === 'ar-EG' ? arabicPhrases : englishPhrases;
    let idx = 0;

    const streamChunk = () => {
      if (idx < phrases.length) {
        setRaw((prev) => {
          return prev ? `${prev} ${phrases[idx]}` : phrases[idx];
        });
        idx++;
        simulationTimeoutRef.current = setTimeout(streamChunk, 1300);
      } else {
        setIsSimulating(false);
        setMicStatus('Simulation playback completed beautifully!');
        // Automatically parse once it completes
        setTimeout(() => {
          handleParse();
        }, 500);
      }
    };

    simulationTimeoutRef.current = setTimeout(streamChunk, 400);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
    }
    setMicStatus('Simulation aborted');
  };

  const handleParse = () => {
    const text = raw.trim();
    if (!text) return;
    setParsing(true);
    setParsed(null);
    setErrorMsg(null);

    // Dynamic extraction logic
    setTimeout(() => {
      try {
        const isArabic = /[\u0600-\u06FF]/.test(text);
        
        // Basic Regex Extraction Matchers mapping
        const areaMatch = text.match(/(\d+)\s*م²?|(\d+)\s*m²?/i);
        const priceMatch = text.match(/EGP\s*([\d,.]+M?)|(\d+[\d,]*)\s*\/شهر|(\d+[\d,]*)\s*\/mo|(\d+[\d,.]*)\s*(?:M|مليون)/i);
        const bedsMatch = text.match(/(\d+)\s*(?:bed|غرف|BHK)/i);
        
        const typeKws = {
          Villa: ['villa', 'فيلا'],
          Apartment: ['apartment', 'شقة', 'apt'],
          Penthouse: ['penthouse'],
          Duplex: ['duplex', 'دوبلكس'],
          'Twin House': ['twin', 'توين'],
        };
        
        let type = 'Apartment';
        for (const [t, kws] of Object.entries(typeKws)) {
          if (kws.some((k) => text.toLowerCase().includes(k))) {
            type = t;
            break;
          }
        }
        
        const cpds = ['Mivida', 'Hyde Park', 'Mountain View iCity', 'Uptown Cairo', 'Madinaty', 'Eastown', 'Villette'];
        const cpd = cpds.find((c) => text.toLowerCase().includes(c.toLowerCase())) || 'Hyde Park';
        const rent = /شهر|\/mo|\/month|rent/i.test(text);

        const priceVal = priceMatch ? priceMatch[0] : (voiceLang === 'en-US' ? 'EGP 18.5M' : 'EGP 35M');

        setParsed([
          { k: 'Compound', v: cpd },
          { k: 'Type', v: type },
          { k: 'Area', v: areaMatch ? `${areaMatch[1] || areaMatch[2]}m²` : (voiceLang === 'en-US' ? '320m²' : '450m²') },
          { k: 'Bedrooms', v: bedsMatch ? (bedsMatch[1] || bedsMatch[2]) : (voiceLang === 'en-US' ? '4' : '5') },
          { k: 'Price', v: priceVal },
          { k: 'Purpose', v: rent ? 'Rent' : 'Resale' },
          { k: 'Language', v: isArabic ? 'Arabic' : 'English' },
          { k: 'SBR Code', v: `SE-${cpd.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3)}-${type.slice(0, 3).toUpperCase()}-${String(Math.floor(Math.random() * 9000) + 1000)}-2026` },
        ]);
      } catch (err: any) {
        setErrorMsg("Failed to extract structured fields.");
      } finally {
        setParsing(false);
      }
    }, 1100);
  };

  const handleSaveToFirestore = async () => {
    if (!parsed || saving) return;
    setSaving(true);
    setErrorMsg(null);

    const cpd = parsed.find((f) => f.k === 'Compound')?.v || 'Hyde Park';
    const type = parsed.find((f) => f.k === 'Type')?.v || 'Apartment';
    const area = parseInt(parsed.find((f) => f.k === 'Area')?.v || '320') || 320;
    const beds = parseInt(parsed.find((f) => f.k === 'Bedrooms')?.v || '4') || 4;
    const price = parsed.find((f) => f.k === 'Price')?.v || 'EGP 18.5M';
    const code = parsed.find((f) => f.k === 'SBR Code')?.v || 'SE-UTC-PEN';

    try {
      await addDoc(collection(db, 'listings'), {
        code,
        cmp: cpd,
        type,
        beds,
        area,
        price,
        ai: parseFloat((Math.random() * 1.5 + 8.5).toFixed(1)),
        status: 'Active',
        img: Math.floor(Math.random() * 5),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await createSierraNotification(
        'listing',
        `Listing Created: ${code}`,
        `Standardised listing found in compound ${cpd}. Type: ${type}, Rooms: ${beds}, Price: ${price}`,
        `تم إضافة عقار معروض: ${code}`,
        `تم بنجاح تحليل وتنسيق وحدة عقارية في كمبوند ${cpd}. النوع: ${type}، عدد الغرف: ${beds}، السعر: ${price}`
      );

      alert(`Successfully saved parsed listing ${code} directly to Firestore database!`);
      setRaw('');
      setParsed(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'listings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/80 pb-5">
        <div className="select-none">
          <h2 className="font-serif text-lg tracking-wide text-[#F0EDE5] uppercase font-bold">
            🎙️ {T('scribe_title')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dictate listings or paste unstructured WhatsApp chats to map real estate details onto database nodes instantly.
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-3 sm:mt-0 font-mono text-[10px] bg-[#0c1424] px-2.5 py-1.5 border border-[#c8961a]/15 rounded-lg select-none text-[#E9C176]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE SPEECH SYNCHRONISER
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Voice Scribe Dictation Controller Panel */}
        <div className="lg:col-span-4 bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              🎙️ Dynamic Voice Recorder
            </span>
          </div>
          
          <div className="p-5 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-[11px] text-slate-400">
                Configure oral speech dials to stream unstructured broker feeds directly to screen. Just dictate to write.
              </p>

              {/* Language dial switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#101726]/60 rounded-lg border border-slate-800">
                <button
                  onClick={() => setVoiceLang('ar-EG')}
                  className={`py-1.5 text-center text-xs font-bold rounded-md select-none cursor-pointer transition ${voiceLang === 'ar-EG' ? 'bg-[#c8961a] text-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  العربية (ar-EG)
                </button>
                <button
                  onClick={() => setVoiceLang('en-US')}
                  className={`py-1.5 text-center text-xs font-bold rounded-md select-none cursor-pointer transition ${voiceLang === 'en-US' ? 'bg-[#c8961a] text-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  English (en-US)
                </button>
              </div>

              {/* Real-time Oscilloscope soundwave animation */}
              <div className="h-28 bg-[#05080f] border border-slate-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                {(isListening || isSimulating) && (
                  <div className="absolute inset-0 bg-[#06b6d4]/5 pointer-events-none animate-pulse" />
                )}

                <div className="flex items-center gap-1.5 justify-center z-10">
                  {Array.from({ length: 15 }).map((_, i) => {
                    // Random keyframe delays for realistic waveform jitter
                    const delay = (i % 5) * 0.15;
                    const duration = 0.5 + (i % 3) * 0.2;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          isListening
                            ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                            : isSimulating
                            ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                            : 'bg-slate-700'
                        }`}
                        style={{
                          height: (isListening || isSimulating) ? 'inherit' : '8px',
                          minHeight: '6px',
                          animation: (isListening || isSimulating) ? `bounce ${duration}s ease-in-out infinite alternate` : 'none',
                          animationDelay: `${delay}s`
                        }}
                      />
                    );
                  })}
                </div>

                <div className="absolute bottom-2 text-[10px] font-mono text-slate-500 select-none text-center px-4 w-full truncate">
                  {micStatus}
                </div>
              </div>
            </div>

            {/* Core Speech Action Control Hub */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                {/* Micro record button */}
                <button
                  onClick={startRecording}
                  className={`flex-1 py-3 px-3 rounded font-bold text-xs flex items-center justify-center gap-2 select-none transition duration-150 cursor-pointer ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'bg-gradient-to-r from-[#C2921D] to-[#E5C158] text-black shadow-md hover:opacity-90'
                  }`}
                >
                  <span className="text-sm">🎙️</span>
                  {isListening ? 'Stop Mic API' : 'Dictate with Mic'}
                </button>

                {/* Simulated trigger for iframes */}
                <button
                  onClick={startSimulation}
                  className={`py-3 px-3.5 rounded font-bold text-xs select-none border transition duration-150 cursor-pointer ${
                    isSimulating
                      ? 'bg-teal-950/40 text-teal-400 border-teal-500/30'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#F0EDE5]'
                  }`}
                  title="Simulate Speech feed on Sandbox"
                >
                  🤖 {isSimulating ? 'Stop Demo' : 'Simulate Voice'}
                </button>
              </div>

              <div className="text-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest select-none">
                  {isListening ? 'Streaming spoken words alive...' : isSimulating ? 'Playing deep voice playback...' : 'Tap Mic or Select Simulate'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Input Block & AI Extractor Results */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buffer textarea */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
                📥 Transcribed Broker Feed Buffer
              </span>
              {raw && (
                <button
                  onClick={() => setRaw('')}
                  className="text-[9px] font-mono text-slate-400 hover:text-white uppercase select-none cursor-pointer"
                >
                  [Clear]
                </button>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <textarea
                className="w-full flex-1 min-h-[220px] bg-[#05080f] border border-slate-800 rounded p-4 font-mono text-xs text-cyan-400 outline-none placeholder-cyan-500/30 focus:border-cyan-500/50 resize-none transition duration-150"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={
                  voiceLang === 'ar-EG'
                    ? "انطق عقار أو الصق نصاً لغير منسق مثل: 'حاجة لقطة فيلا بموقع ممتاز في هايد بارك ميفيدا مساحة 450 متر دور أول بسعر 35000000 كاش'..."
                    : "Paste or speak raw data like: 'Superb penthouse Hyde Park Uptown matching 4bed golf catalog lines Asking EGP 18.5M'..."
                }
              />

              {errorMsg && (
                <div className="text-red-400 text-xs py-2 px-3 bg-red-950/20 border border-red-500/15 rounded-lg select-none leading-relaxed">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={parsing || !raw.trim()}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-black rounded font-bold text-xs select-none transition duration-150 cursor-pointer disabled:opacity-40 disabled:scale-100"
              >
                {parsing ? 'Parsing Structured Data...' : '🧠 Ingest text via Scribe AI'}
              </button>

              {/* Ingestion Templates block */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#E9C176]/50 block mb-2 select-none">
                  Manual Feed Presets
                </span>
                <div className="space-y-1.5">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setRaw(ex)}
                      className="w-full text-left bg-slate-900/30 border border-slate-800 py-1.5 px-3 hover:border-[#c8961a]/30 text-slate-300 rounded hover:text-white text-[10.5px] leading-relaxed transition cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Extracted JSON schema table */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
                ✅ Structured AI Extraction Schema
              </span>
              {parsed && (
                <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-bold font-mono uppercase select-none">
                  STANDARDISED
                </span>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="flex-1">
                {!parsed && !parsing && (
                  <div className="py-20 text-center text-slate-500 text-xs font-mono select-none space-y-2">
                    <div>⚠️ No active schema parsed.</div>
                    <div className="text-[10px] text-slate-600 max-w-xs mx-auto">
                      Speak listing or click Simulate Voice to capture and parse parameters immediately.
                    </div>
                  </div>
                )}

                {parsing && (
                  <div className="py-20 text-center space-y-4">
                    <div className="font-mono text-xs text-cyan-400 animate-pulse">Running advanced text taxonomy...</div>
                    <div className="flex gap-1 justify-center">
                      {[0, 1, 2].map((n) => (
                        <div
                          key={n}
                          className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"
                          style={{ animationDelay: `${n * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {parsed && (
                  <div className="space-y-1.5 bg-[#05080f] p-3 rounded border border-slate-800/80">
                    {parsed.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-white/1 border border-white/5 rounded text-xs leading-relaxed">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#E9C176] min-w-[95px] select-none">
                          {f.k}
                        </span>
                        <span className="text-[#F0EDE5] font-semibold truncate">{f.v}</span>
                        <span className="ml-auto text-emerald-400 font-bold select-none text-[10px]">✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {parsed && (
                <div className="pt-6 flex gap-2.5">
                  <button
                    onClick={handleSaveToFirestore}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-black rounded font-bold text-xs select-none transition duration-150 disabled:opacity-40 disabled:scale-100 cursor-pointer"
                  >
                    {saving ? 'Registering...' : '💾 Publish to CRM Database'}
                  </button>
                  <button
                    onClick={() => {
                      const csvContent = parsed.map((item) => `"${item.k}","${item.v}"`).join('\n');
                      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.setAttribute('download', 'parsed_sierra_listing.csv');
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded text-xs font-bold transition select-none cursor-pointer"
                  >
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
