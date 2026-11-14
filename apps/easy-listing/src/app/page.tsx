'use client'

import { useCallback, useEffect, useState, startTransition, ViewTransition } from 'react'
import {
  BookOpenCheck,
  ClipboardList,
  Moon,
  PlusCircle,
  Settings2,
  Sun,
  Sparkles,
  ShieldCheck,
  Database,
  Table2,
  MapPin,
  Bot,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

import { BrandHeader } from '@/components/easy-listing/brand'
import { NewListing } from '@/components/easy-listing/new-listing'
import { SavedListings } from '@/components/easy-listing/saved-listings'
import { SettingsDialog } from '@/components/easy-listing/settings-dialog'
import { SetupDialog } from '@/components/easy-listing/setup-dialog'

import type { AppSettings, SavedProperty } from '@/lib/types'
import {
  DEFAULT_SETTINGS,
  loadSavedProperties,
  loadSettings,
  saveSettings,
} from '@/lib/local-store'

export default function Home() {
  const [tab, setTab] = useState<'new' | 'saved'>('new')
  const [savedCount, setSavedCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [editingProperty, setEditingProperty] = useState<SavedProperty | null>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const stored = loadSettings()
    const count = loadSavedProperties().length
    const id = window.setTimeout(() => {
      setSettings(stored)
      setSavedCount(count)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const handleSaved = useCallback(() => {
    setSavedCount(loadSavedProperties().length)
    setRefreshKey((k) => k + 1)
  }, [])

  const handleSavedSettings = useCallback((s: AppSettings) => {
    setSettings(s)
    saveSettings(s)
  }, [])

  const handleTabChange = useCallback((v: string) => {
    startTransition(() => {
      setTab(v as 'new' | 'saved')
    })
  }, [])

  const handleLoadProperty = useCallback((property: SavedProperty) => {
    setEditingProperty(property)
    startTransition(() => {
      setTab('new')
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-[#070b12] text-foreground">
      {/* ── High-End Hyouz Luxury Header ── */}
      <header className="sticky top-0 z-40 border-b border-[#c8961a]/20 bg-[#070b12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <BrandHeader />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl"
              onClick={() => setSetupOpen(true)}
            >
              <BookOpenCheck className="h-4 w-4 text-[#e9c176]" /> دليل الربط
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4 text-[#e9c176]" /> الإعدادات
              {settings.appsScriptUrl ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-label="مربوط" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-[#c8961a]" aria-label="غير مربوط" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-300 hover:text-white rounded-xl"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="تبديل الوضع"
            >
              <Sun className="hidden h-4 w-4 dark:block text-[#e9c176]" />
              <Moon className="block h-4 w-4 dark:hidden" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 space-y-6">
        {/* Hyouz Luxury Banner */}
        <div className="hyouz-card rounded-2xl p-6 relative overflow-hidden border-[#c8961a]/30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-[#c8961a]/15 via-transparent to-transparent -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#c8961a]/20 text-[#e9c176] border border-[#c8961a]/40 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Hyouz Luxury Engine · الربط الشامل
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Supabase + Sheets + GIS Map
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                استوديو إدراج ومزامنة العقارات الفوري 🏡
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                حدد صفة الرقم (مالك، وسيط، إيجنت، أو موظف بالشركة) والصق وصف الوحدة. بضغطة واحدة، الذكاء الاصطناعي يستخرج البيانات ويزامن مع قاعدة البيانات وشيت المتابعة وخريطة التجمع ومخزون سييرا فوراً.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#070b12]/90 border border-slate-800 text-xs">
                <Bot className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">سجل ردود البوت:</div>
                  <div className="font-bold text-white text-xs">{savedCount} وحدات معتمدة</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Studio Tabs ── */}
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4 w-full sm:w-auto bg-[#0d1524] border border-[#c8961a]/20 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5">
            <TabsTrigger
              value="new"
              className="gap-2 text-xs font-bold py-2.5 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c8961a] data-[state=active]:to-[#e9c176] data-[state=active]:text-[#070b12] cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" /> وحدة جديدة ومزامنة شاملة
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="gap-2 text-xs font-bold py-2.5 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c8961a] data-[state=active]:to-[#e9c176] data-[state=active]:text-[#070b12] cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" /> سجل الأونرز ومحادثات البوت
              <Badge variant="secondary" className="ms-1 px-1.5 py-0.5 text-[10px] bg-[#070b12] text-[#e9c176] border border-[#c8961a]/30">
                {savedCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            <ViewTransition enter="slide-up" exit="fade-out" default="none">
              <div>
                <NewListing
                  settings={settings}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onOpenSetup={() => setSetupOpen(true)}
                  onSaved={handleSaved}
                  initialProperty={editingProperty}
                  onClearInitialProperty={() => setEditingProperty(null)}
                />
              </div>
            </ViewTransition>
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <ViewTransition enter="slide-up" exit="fade-out" default="none">
              <div>
                <SavedListings
                  refreshKey={refreshKey}
                  onCountChange={setSavedCount}
                  sheetLink={settings.sheetLink}
                  onLoadProperty={handleLoadProperty}
                />
              </div>
            </ViewTransition>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#c8961a]/20 bg-[#070b12]/80 mt-12">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#e9c176]" />
            <span>Sierra Estates © 2026 — Hyouz Easy Listing Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Supabase Postgres متصل
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400">
              تشفير البيانات وفق معايير الأمان العقاري
            </span>
          </div>
        </div>
      </footer>

      {/* ── Dialogs ── */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSavedSettings={handleSavedSettings}
        onOpenSetup={() => setSetupOpen(true)}
      />
      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  )
}
