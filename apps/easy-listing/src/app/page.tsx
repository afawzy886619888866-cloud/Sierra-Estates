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
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="https://sierra-estates.net/request"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#c8961a] to-[#e9c176] px-3 py-1.5 text-[11px] font-black text-[#061122] shadow-[0_0_14px_rgba(201,168,76,0.45)] hover:brightness-110 transition-all"
              title="Sierra Estates Black Friday Offer · 25% OFF Service till 25th November 2026"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>أضف طلبك (خصم 25% حتى 25 نوفمبر)</span>
            </a>
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
        {/* ── Studio Tabs ── */}
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <TabsList className="bg-surface-container border border-[#222a3d] p-1.5 rounded-xl grid grid-cols-2 gap-1.5 w-full sm:w-auto">
              <TabsTrigger
                value="new"
                className="gap-2 text-xs font-bold py-2.5 px-5 rounded-lg data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container data-[state=active]:shadow-[0_0_12px_rgba(0,229,255,0.3)] text-on-surface-variant hover:text-white cursor-pointer transition-all"
              >
                <PlusCircle className="h-4 w-4" /> وحدة جديدة ومزامنة شاملة
              </TabsTrigger>
              <TabsTrigger
                value="saved"
                className="gap-2 text-xs font-bold py-2.5 px-5 rounded-lg data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container data-[state=active]:shadow-[0_0_12px_rgba(0,229,255,0.3)] text-on-surface-variant hover:text-white cursor-pointer transition-all"
              >
                <ClipboardList className="h-4 w-4" /> سجل الأونرز ومحادثات البوت
                <Badge variant="secondary" className="ms-1 px-1.5 py-0.5 text-[10px] bg-surface-container-lowest text-primary-container border border-primary-container/30">
                  {savedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 self-end sm:self-auto px-3.5 py-2 rounded-xl bg-surface-container border border-[#222a3d] text-xs">
              <Bot className="h-4 w-4 text-primary-container shrink-0" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400">سجل البوت: </span>
                <span className="font-bold text-white text-xs">{savedCount} وحدات معتمدة</span>
              </div>
            </div>
          </div>

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
