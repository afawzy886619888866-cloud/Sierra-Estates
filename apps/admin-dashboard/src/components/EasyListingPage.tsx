import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Upload, Download, Copy, Check, FileImage, FileText, MessageCircle } from 'lucide-react';

const COMPOUND_DICTIONARY: Record<string, string> = {
  'ميفيدا': 'MI', 'mivida': 'MI',
  'ماونتن فيو': 'MV', 'mountain view': 'MV',
  'هايد بارك': 'HP', 'hyde park': 'HP',
  'ليك فيو': 'LV', 'lake view': 'LV',
  'كايرو فيستيفال': 'CFC', 'cairo festival city': 'CFC',
  'فيليت': 'VS', 'villette': 'VS',
  'جاردينيا': 'GC', 'gardenia': 'GC',
  'الرحاب': 'RH', 'rehab': 'RH',
  'الشروق': 'ES', 'el shorouk': 'ES', 'shorouk': 'ES',
  'المقصد': 'MQ', 'al maksad': 'MQ', 'maksad': 'MQ',
  'دار مصر': 'DM', 'dar misr': 'DM'
};

const FURNISHED_DICTIONARY: Record<string, { code: string; label: string; }> = {
  'مفروش': { code: 'F', label: 'Fully Furnished' },
  'fully furnished': { code: 'F', label: 'Fully Furnished' },
  'نصف': { code: 'S', label: 'Semi-Furnished' },
  'semi': { code: 'S', label: 'Semi-Furnished' },
  'مطبخ': { code: 'K', label: 'Kitchen Only' },
  'kitchen': { code: 'K', label: 'Kitchen Only' },
  'غير': { code: 'U', label: 'Unfurnished' },
  'unfurnished': { code: 'U', label: 'Unfurnished' }
};

interface ExtractedData {
  compound: string;
  compoundCode: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  price: number | null;
  priceCode: string;
  currency: string;
  furnished: string;
  furnishedLabel: string;
  propertyCode: string;
}

export default function EasyListingPage() {
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('01092048333');
  const [images, setImages] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const offerCardRef = useRef<HTMLDivElement>(null);

  const extractDataFromText = (text: string) => {
    // Convert Arabic numerals to English before parsing
    const arabicToEnglish: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
    let cleanedText = text;
    for (const [a, e] of Object.entries(arabicToEnglish)) {
      cleanedText = cleanedText.replace(new RegExp(a, 'g'), e);
    }
    
    const raw = cleanedText.toLowerCase();
    
    // 1. Compound
    let compound = '';
    let compoundCode = '';
    for (const [key, code] of Object.entries(COMPOUND_DICTIONARY)) {
      if (raw.includes(key)) {
        compound = key;
        compoundCode = code;
        break;
      }
    }
    if (!compoundCode) {
      // Fallback
      compoundCode = 'UK'; // Unknown
      compound = 'Unknown Compound';
    }

    // 2. Bedrooms
    let bedrooms = null;
    const bedMatch = raw.match(/(\d+)\s*(غرف|bedroom|bed|br|rooms)/i) || raw.match(/(غرفتين)/i) || raw.match(/(studio|استوديو)/i);
    if (bedMatch) {
      if (bedMatch[1] && !isNaN(parseInt(bedMatch[1]))) {
        bedrooms = parseInt(bedMatch[1]);
      } else if (bedMatch[0].includes('غرفتين')) {
        bedrooms = 2;
      } else if (bedMatch[0].includes('studio') || bedMatch[0].includes('استوديو')) {
        bedrooms = 1;
      }
    }

    // 3. Bathrooms
    let bathrooms = null;
    const bathMatch = raw.match(/(\d+)\s*(حمام|bathroom|bath|ba)/i);
    if (bathMatch && bathMatch[1]) {
      bathrooms = parseInt(bathMatch[1]);
    }

    // 4. Area
    let area = null;
    const areaMatch = raw.match(/(\d+)\s*(متر|sqm|m2|m)/i);
    if (areaMatch && areaMatch[1]) {
      area = parseInt(areaMatch[1]);
    }

    // 5. Price
    let price = null;
    let priceCode = '';
    let currency = 'EGP';
    
    // Check for explicit currency first
    if (raw.includes('$') || raw.includes('dollar') || raw.includes('usd') || raw.includes('دولار')) {
        currency = 'USD';
    } else if (raw.includes('درهم') || raw.includes('aed')) {
        currency = 'AED';
    }

    // Matches numbers with formatting or words
    const priceMatchEgpM = raw.match(/(\d+(?:\.\d+)?)\s*(مليون|m|million)/i);
    const priceMatchEgpK = raw.match(/(\d+(?:\.\d+)?)\s*(الف|ألف|k|thousand)/i);
    const priceMatchNum = raw.match(/((?:\d{1,3}(?:,\d{3})+|\d+))/i);
    
    if (priceMatchEgpM) {
        price = parseFloat(priceMatchEgpM[1]) * 1000000;
    } else if (priceMatchEgpK) {
        price = parseFloat(priceMatchEgpK[1]) * 1000;
    } else if (priceMatchNum) {
        price = parseFloat(priceMatchNum[1].replace(/,/g, ''));
    }

    if (price !== null) {
        if (currency === 'USD') {
            if (price >= 1000000) priceCode = `$${(price / 1000000).toFixed(1).replace('.0', '')}M`;
            else if (price >= 1000) priceCode = `$${Math.round(price / 1000)}K`;
            else priceCode = `$${price}`;
        } else if (currency === 'AED') {
            if (price >= 1000000) priceCode = `${(price / 1000000).toFixed(1).replace('.0', '')}M AED`;
            else if (price >= 1000) priceCode = `${Math.round(price / 1000)}K AED`;
            else priceCode = `${price} AED`;
        } else {
            if (price >= 1000000) priceCode = `${Math.round(price / 1000000)}M`;
            else if (price >= 1000) priceCode = `${Math.round(price / 1000)}K`;
            else priceCode = `${price}`;
        }
    } else {
        priceCode = 'TBD';
    }

    // 6. Furnished Status
    let furnished = 'U';
    let furnishedLabel = 'Unfurnished';
    for (const [key, data] of Object.entries(FURNISHED_DICTIONARY)) {
      if (raw.includes(key)) {
        furnished = data.code;
        furnishedLabel = data.label;
        break;
      }
    }

    // 7. Property Code
    const propertyCode = `${compoundCode}-${bedrooms || 'X'}${furnished}-${priceCode}`.toUpperCase();

    setExtractedData({
      compound,
      compoundCode,
      bedrooms,
      bathrooms,
      area,
      price,
      priceCode,
      currency,
      furnished,
      furnishedLabel,
      propertyCode
    });
  };

  const processListing = () => {
    setIsProcessing(true);
    setTimeout(() => {
      extractDataFromText(description);
      setIsProcessing(false);
    }, 800);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).map(file => URL.createObjectURL(file as any));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const copyToClipboard = (text: string, ref: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [ref]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [ref]: false }));
    }, 2000);
  };

  const getWhatsAppContent = () => {
    if (!extractedData) return '';
    return `*Code : ${extractedData.propertyCode}*

*${extractedData.compound.toUpperCase()} 📍*

${getPFBody()}

*For rent*
- Apartment (${extractedData.bedrooms || '?'} bedroom)
- Area: ${extractedData.area || '?'} sqm
- ${extractedData.furnishedLabel}
- Price: ${extractedData.price ? extractedData.price.toLocaleString() : '?'} ${extractedData.currency}

for more details

*Sierra Estates*
${phone}`;
  };

  const getFacebookContent = () => {
    if (!extractedData) return '';
    return `🏢 Apartment For Rent in ${extractedData.compound}
📍 ${extractedData.compound} – New Cairo
🛏️ ${extractedData.bedrooms || '?'} Bedrooms
🛋️ ${extractedData.furnishedLabel}
📐 ${extractedData.area || '?'} sqm
💰 ${extractedData.price ? extractedData.price.toLocaleString() : '?'} ${extractedData.currency}

📞 ${phone}
Sierra Estates – Beyond Brokerage ✦

#${extractedData.compound.replace(/\s+/g, '')} #LuxuryLiving #NewCairo`;
  };

  const getPFTitle = () => {
    if (!extractedData) return '';
    return `Premium ${extractedData.bedrooms || '?'} BR in ${extractedData.compound} | ${extractedData.furnishedLabel}`;
  };

  const getPFBody = () => {
    if (!extractedData) return '';
    return `Experience luxury living at its finest in ${extractedData.compound}. This magnificent ${extractedData.bedrooms || '?'}-bedroom property offers an exceptional lifestyle with its well-designed layout and premium finishes.

Property Status: ${extractedData.furnishedLabel}
Built-up Area: ${extractedData.area || '?'} sqm
Bathrooms: ${extractedData.bathrooms || '?'}

Contact Sierra Estates today to schedule a viewing and embrace the definition of luxury living.`;
  };

  const generateOfferImage = async () => {
    if (!offerCardRef.current) return;
    try {
      const canvas = await html2canvas(offerCardRef.current, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `sierra-estates-${extractedData?.propertyCode || 'property'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  const generatePDFBrochure = () => {
    if (!extractedData) return;
    try {
      const doc = new jsPDF();
      
      // Basic styling
      doc.setFont("helvetica");
      
      // Header
      doc.setFillColor(10, 26, 58); // Navy #0A1A3A
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(201, 162, 74); // Gold #C9A24A
      doc.setFontSize(24);
      doc.text("✦ SIERRA ESTATES ✦", 105, 20, { align: 'center' });
      
      doc.setTextColor(245, 247, 250); // Light #F5F7FA
      doc.setFontSize(12);
      doc.text("Beyond Brokerage", 105, 30, { align: 'center' });

      // Body
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(16);
      doc.text(`PROPERTY: ${extractedData.propertyCode}`, 20, 60);
      
      doc.setFontSize(12);
      doc.text(`Location: ${extractedData.compound.toUpperCase()}`, 20, 80);
      doc.text(`Bedrooms: ${extractedData.bedrooms || '-'}`, 20, 95);
      doc.text(`Bathrooms: ${extractedData.bathrooms || '-'}`, 20, 110);
      doc.text(`Area: ${extractedData.area || '-'} sqm`, 20, 125);
      doc.text(`Furnishing: ${extractedData.furnishedLabel}`, 20, 140);
      doc.text(`Price: ${extractedData.price ? extractedData.price.toLocaleString() : '-'} ${extractedData.currency}`, 20, 155);

      if (images.length > 0) {
        try {
          doc.addImage(images[0], 'JPEG', 110, 70, 80, 60);
        } catch(e) {
          console.warn("Could not add image to PDF", e);
        }
      }

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Contact: ${phone}`, 105, 280, { align: 'center' });
      
      doc.save(`Sierra-Estates-Brochure-${extractedData.propertyCode}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  const saveToFirebase = async () => {
    if (!extractedData) return;
    setSaveStatus('Saving...');
    try {
      await addDoc(collection(db, 'properties'), {
        code: extractedData.propertyCode,
        compound: extractedData.compound,
        bedrooms: extractedData.bedrooms,
        bathrooms: extractedData.bathrooms,
        area: extractedData.area,
        price: extractedData.price,
        currency: extractedData.currency,
        furnished: extractedData.furnished,
        phone: phone,
        whatsappContent: getWhatsAppContent(),
        facebookContent: getFacebookContent(),
        propertyFinderTitle: getPFTitle(),
        propertyFinderContent: getPFBody(),
        images: images,
        createdAt: serverTimestamp()
      });
      setSaveStatus('Success!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Save failed', err);
      setSaveStatus('Failed to save');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in-up">
      {/* Brand Header */}
      <div className="bg-[#0A1A3A] p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between border border-[#C9A24A]/20 relative overflow-hidden">
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-3xl font-serif text-[#C9A24A] uppercase tracking-widest font-bold mb-2">
            ✦ Sierra Estates ✦
          </h1>
          <p className="text-[#F5F7FA] font-sans tracking-[0.2em] text-sm uppercase">
            Beyond Brokerage · Property Coding Engine
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* INPUT COLUMN */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
              <span className="text-[#C9A24A]">1.</span> Raw Field Data
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Property Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste WhatsApp text or broker description here... e.g., 'شقة 3 غرف في ميفيدا نصف فرش بـ 35 الف'"
                  className="w-full h-48 bg-slate-900/50 border border-slate-700 text-slate-200 p-4 rounded-lg focus:outline-none focus:border-[#C9A24A] transition placeholder-slate-600 font-sans text-sm resize-none"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Contact Phone</label>
                <input 
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:border-[#C9A24A] transition font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Property Images</label>
                <label className="flex items-center justify-center w-full h-24 bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-[#C9A24A]/50 rounded-lg cursor-pointer transition">
                  <div className="flex flex-col items-center">
                    <Upload className="w-6 h-6 text-slate-500 mb-2" />
                    <span className="text-xs text-slate-400 font-medium">Click to upload images</span>
                  </div>
                  <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                </label>
                
                {images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {images.map((src, i) => (
                      <img key={i} src={src} className="w-16 h-16 object-cover rounded-md border border-slate-700" alt={`upload-${i}`} />
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={processListing}
                disabled={!description.trim() || isProcessing}
                className="w-full bg-[#C9A24A] hover:bg-[#b08d41] text-[#0A1A3A] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase font-mono tracking-wider text-sm mt-4"
              >
                {isProcessing ? 'Processing Data...' : 'Extract & Code Listing'}
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="lg:col-span-7 space-y-6">
          {extractedData ? (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* PRIMARY STATUS & CODE */}
              <div className="bg-[#0a0f1d] border border-[#C9A24A]/30 rounded-xl p-6 shadow-[0_0_20px_rgba(201,162,74,0.05)]">
                 <div className="flex justify-between items-start mb-6">
                   <div>
                     <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Generated Identity Code</p>
                     <h2 className="text-3xl font-bold font-mono text-white tracking-widest bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                       {extractedData.propertyCode}
                     </h2>
                   </div>
                   <button 
                     onClick={saveToFirebase}
                     className="px-6 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded font-mono text-xs uppercase tracking-wider transition"
                   >
                     {saveStatus || 'Save to CRM'}
                   </button>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                   <div>
                     <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Compound</p>
                     <p className="font-semibold text-slate-200 truncate">{extractedData.compound}</p>
                   </div>
                   <div>
                     <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Price</p>
                     <p className="font-semibold text-slate-200">{extractedData.price ? `${(extractedData.price).toLocaleString()} ${extractedData.currency}` : 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Beds</p>
                     <p className="font-semibold text-slate-200">{extractedData.bedrooms || '?'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Furnishing</p>
                     <p className="font-semibold text-slate-200 truncate">{extractedData.furnishedLabel}</p>
                   </div>
                 </div>
              </div>

              {/* MEDIA GENERATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={generateOfferImage} className="flex gap-3 items-center justify-center p-4 bg-[#0A1A3A] hover:bg-[#0f244e] border border-slate-700 hover:border-[#C9A24A] rounded-xl transition text-white">
                  <FileImage className="w-5 h-5 text-[#C9A24A]" />
                  <span className="font-medium font-sans">Download Offer Image</span>
                </button>
                <button onClick={generatePDFBrochure} className="flex gap-3 items-center justify-center p-4 bg-[#0A1A3A] hover:bg-[#0f244e] border border-slate-700 hover:border-[#C9A24A] rounded-xl transition text-white">
                  <FileText className="w-5 h-5 text-[#C9A24A]" />
                  <span className="font-medium font-sans">Generate PDF Brochure</span>
                </button>
              </div>

              {/* COPY CONTENT TABS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Whatsapp Content */}
                <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold">WhatsApp Template</span>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          const text = encodeURIComponent(getWhatsAppContent());
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                        className="text-emerald-400 hover:text-emerald-300 px-2.5 py-1 flex items-center gap-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 rounded font-mono text-[10px] transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        AUTO-FORMAT & SHARE
                      </button>
                      <button 
                        onClick={() => copyToClipboard(getWhatsAppContent(), 'wa')}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        {copiedStates['wa'] ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-[#040710]">
                    <pre className="text-slate-300 font-sans text-sm whitespace-pre-wrap">{getWhatsAppContent()}</pre>
                  </div>
                </div>

                {/* Facebook Content */}
                <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                    <span className="font-mono text-xs uppercase tracking-wider text-blue-400 font-bold">Facebook Post</span>
                    <button 
                      onClick={() => copyToClipboard(getFacebookContent(), 'fb')}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {copiedStates['fb'] ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-4 bg-[#040710]">
                    <pre className="text-slate-300 font-sans text-sm whitespace-pre-wrap" dir="auto">{getFacebookContent()}</pre>
                  </div>
                </div>

                {/* Property Finder Content */}
                <div className="md:col-span-2 bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#C9A24A] font-bold">Property Finder Ready</span>
                    <button 
                      onClick={() => copyToClipboard(`${getPFTitle()}\n\n${getPFBody()}`, 'pf')}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {copiedStates['pf'] ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-4 bg-[#040710] space-y-4">
                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Title (Max 50 Chars)</p>
                      <p className="text-slate-200 font-bold bg-slate-900 p-2 rounded border border-slate-800 truncate">{getPFTitle()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Body Description</p>
                      <pre className="text-slate-300 font-sans text-sm whitespace-pre-wrap bg-slate-900 p-3 rounded border border-slate-800">{getPFBody()}</pre>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/10 min-h-[400px]">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-slate-300 font-serif text-lg mb-2">Awaiting Input Data</h3>
              <p className="text-slate-500 text-sm text-center max-w-sm">
                Paste a property description to automatically generate formatted codes, social media ready templates, and high-quality flyer assets.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* HIDDEN: Offer Card Template for html2canvas */}
      {extractedData && (
        <div className="absolute top-[-9999px] left-[-9999px]">
          <div ref={offerCardRef} className="w-[800px] h-[800px] bg-[#0A1A3A] relative flex flex-col overflow-hidden">
            {/* Background Image / Pattern */}
            {images.length > 0 ? (
              <div className="absolute inset-0 z-0">
                <img src={images[0]} alt="bg" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A3A] via-[#0A1A3A]/80 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0A1A3A] to-[#040710]" />
            )}
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#C9A24A10_1px,transparent_1px),linear-gradient(to_bottom,#C9A24A10_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            <div className="relative z-10 flex flex-col items-center pt-16">
              <h2 className="text-[#C9A24A] text-5xl font-serif tracking-widest uppercase">✦ Sierra Estates ✦</h2>
              <p className="text-white text-xl tracking-[0.3em] font-light mt-4 uppercase">Beyond Brokerage</p>
            </div>

            <div className="relative z-10 flex-[1] flex flex-col justify-center items-center px-16 text-center">
              <div className="bg-[#C9A24A] text-[#0A1A3A] px-6 py-2 rounded-full font-bold tracking-widest uppercase mb-8 text-xl">
                Ready to Move In!
              </div>

              <h1 className="text-white text-7xl font-bold font-serif leading-tight mb-4 drop-shadow-2xl">
                {extractedData.compound.toUpperCase()}
              </h1>
              
              <div className="flex gap-6 mt-6">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20">
                  <p className="text-[#C9A24A] uppercase tracking-widest text-sm mb-1">Bedrooms</p>
                  <p className="text-white text-3xl font-bold">{extractedData.bedrooms || '-'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20">
                  <p className="text-[#C9A24A] uppercase tracking-widest text-sm mb-1">Area</p>
                  <p className="text-white text-3xl font-bold">{extractedData.area ? `${extractedData.area} sqm` : '-'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20">
                  <p className="text-[#C9A24A] uppercase tracking-widest text-sm mb-1">Status</p>
                  <p className="text-white text-3xl font-bold">{extractedData.furnished === 'F' ? 'Furnished' : extractedData.furnished === 'S' ? 'Semi-Furnished' : 'Unfurnished'}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 bg-[#040710]/95 backdrop-blur-xl border-t border-[#C9A24A]/30 p-10 flex justify-between items-center">
              <div>
                <p className="text-[#C9A24A] tracking-wider uppercase text-lg mb-1">Monthly Rent</p>
                <p className="text-white text-5xl font-bold font-mono">
                  {extractedData.price ? extractedData.price.toLocaleString() : 'Negotiable'} 
                  <span className="text-2xl ml-2 text-slate-400 font-sans">{extractedData.currency}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#C9A24A] tracking-wider uppercase text-lg mb-1">Contact Us</p>
                <p className="text-white text-5xl font-bold font-mono tracking-tight">{phone}</p>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-black/50 px-4 py-2 rounded text-white/50 font-mono text-sm">
              Ref: {extractedData.propertyCode}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
