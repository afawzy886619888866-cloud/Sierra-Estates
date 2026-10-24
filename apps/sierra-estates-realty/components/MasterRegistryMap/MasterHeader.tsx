import React from 'react';
import { Globe, Moon, Sun, Sparkles, Table2, Map, Box, FileText, Compass, ShieldCheck } from 'lucide-react';

interface MasterHeaderProps {
  currentTab: 'map' | 'excel' | 'threed' | 'yield' | 'compounds' | 'radar' | 'dossier';
  onSelectTab: (tab: 'map' | 'excel' | 'threed' | 'yield' | 'compounds' | 'radar' | 'dossier') => void;
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenConsultation: () => void;
}

export const MasterHeader: React.FC<MasterHeaderProps> = ({
  currentTab,
  onSelectTab,
  lang,
  onToggleLang,
  isDarkMode,
  onToggleTheme,
  onOpenConsultation,
}) => {
  const isAr = lang === 'ar';

  return (
    <header className={`w-full border-b transition-colors duration-200 sticky top-0 z-50 ${
      isDarkMode 
        ? 'bg-[#080E1A]/95 border-amber-900/40 text-stone-100 backdrop-blur-md' 
        : 'bg-[#FAF8F5]/95 border-[#E6DEC8] text-stone-900 backdrop-blur-md'
    }`}>
      {/* Strict 3-Zone Top Bar Contract: Brand — 4-5 single-line Nav Links — Primary Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        
        {/* Zone 1: Brand Wordmark with Official Sierra Estates Logo Image */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('map')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-cyan-500/40 bg-stone-900 shadow-md group-hover:border-cyan-400 transition-all p-0.5 flex items-center justify-center">
              <img 
                src="/assets/aistudio/8e9559f6f_image__1__4350f848.png" 
                alt="Sierra Estates Logo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            <div className="flex flex-col">
              <span className={`text-base font-extrabold tracking-widest uppercase font-cinzel ${
                isDarkMode ? 'text-white' : 'text-stone-900'
              }`}>
                {isAr ? 'سيرّا العقارية' : 'SIERRA ESTATES'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono tracking-wider uppercase text-cyan-600 dark:text-cyan-400 font-bold">
                  {isAr ? 'مستقبل العقارات' : 'FUTURE OF REAL ESTATES'}
                </span>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <a
                  href="https://sierra-estates.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                  title="Visit official portal: sierra-estates.net"
                >
                  <span>sierra-estates.net</span>
                </a>
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold tracking-wide uppercase">
          <button
            onClick={() => onSelectTab('map')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'map'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>{isAr ? 'الخريطة التفاعلية' : 'Master Plan'}</span>
          </button>

          <button
            onClick={() => onSelectTab('excel')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'excel'
                ? 'text-emerald-600 border-b-2 border-emerald-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'جدول الإكسيل (إيجار / بيع)' : 'Units Excel Sheet'}</span>
          </button>

          <button
            onClick={() => onSelectTab('yield')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'yield'
                ? 'text-cyan-500 border-b-2 border-cyan-500 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isAr ? 'عوائد الإيجار (Heatmap)' : 'Yield Heatmap'}</span>
          </button>

          <button
            onClick={() => onSelectTab('threed')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'threed'
                ? 'text-sky-500 border-b-2 border-sky-500 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-sky-500" />
            <span>{isAr ? 'مجسم 3D للمدينة' : '3D Master Scene'}</span>
          </button>

          <button
            onClick={() => onSelectTab('compounds')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              currentTab === 'compounds'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            {isAr ? 'دليل المشروعات' : 'Compounds'}
          </button>

          <button
            onClick={() => onSelectTab('radar')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              currentTab === 'radar'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            {isAr ? 'مسافات AUC' : 'AUC Matrix'}
          </button>

          <button
            onClick={() => onSelectTab('dossier')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1 ${
              currentTab === 'dossier'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isAr ? 'الملف الاستثماري' : 'Dossier'}</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action + language & theme toggles */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-stone-300 dark:border-stone-700 hover:border-amber-600 dark:hover:border-amber-500 transition-colors text-stone-700 dark:text-stone-300 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? (isAr ? 'التبديل إلى النسخة التحريرية المضيئة' : 'Switch to Light Editorial Edition') : (isAr ? 'التبديل إلى النسخة الليلية الفاخرة' : 'Switch to Obsidian Dark Edition')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-stone-300 dark:border-stone-700 hover:border-amber-600 dark:hover:border-amber-400 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-mono text-[11px]">{isAr ? 'مضيء' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline font-mono text-[11px]">{isAr ? 'ليلي' : 'Dark'}</span>
              </>
            )}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenConsultation}
            className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-md shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border border-amber-300/40"
          >
            <ShieldCheck className="w-4 h-4 text-amber-900" />
            <span>{isAr ? 'حجز معاينة واستشارة' : 'Rent & Resale Desk'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
