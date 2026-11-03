'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, ClipboardList, Moon, PlusCircle, Settings2, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

import { BrandHeader } from '@/components/easy-listing/brand'
import { NewListing } from '@/components/easy-listing/new-listing'
import { SavedListings } from '@/components/easy-listing/saved-listings'
import { SettingsDialog } from '@/components/easy-listing/settings-dialog'
import { SetupDialog } from '@/components/easy-listing/setup-dialog'

import type { AppSettings } from '@/lib/types'
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
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Settings + recent saves live in the browser's localStorage — the tool
    // has no server-side state, which keeps it deployable on any free host.
    // (Read after mount + async setState to avoid hydration mismatches.)
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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <BrandHeader />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setSetupOpen(true)}
            >
              <BookOpenCheck className="h-4 w-4" /> دليل الربط
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4" /> الإعدادات
              {settings.appsScriptUrl ? (
                <Badge className="ml-1 h-2 w-2 rounded-full bg-primary p-0" aria-label="مربوط" />
              ) : (
                <Badge className="ml-1 h-2 w-2 rounded-full bg-[--gold] p-0" aria-label="غير مربوط" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="تبديل الوضع الليلي"
            >
              <Sun className="hidden h-4 w-4 dark:block" />
              <Moon className="block h-4 w-4 dark:hidden" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-6 rounded-2xl border bg-gradient-to-l from-accent/70 via-background to-background p-5 dot-grid">
          <h1 className="text-xl font-extrabold sm:text-2xl">
            اعمل ليستينج كامل في دقيقة واحدة 🏡
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الصق وصف الوحدة → الذكاء الاصطناعي يستخرج البيانات ويعمل الكود والمحتوى ولينك الخريطة →
            احفظ في Google Sheets. بسيطة ومجانية.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'new' | 'saved')}>
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="new" className="gap-1.5">
              <PlusCircle className="h-4 w-4" /> وحدة جديدة
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <ClipboardList className="h-4 w-4" /> الوحدات المحفوظة
              <Badge variant="secondary" className="ms-1 px-1.5 text-[10px]">
                {savedCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            <NewListing
              settings={settings}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenSetup={() => setSetupOpen(true)}
              onSaved={handleSaved}
            />
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <SavedListings
              refreshKey={refreshKey}
              onCountChange={setSavedCount}
              sheetLink={settings.sheetLink}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>Sierra Estates © 2026 — Easy Listing v1.0</span>
          <span className="flex items-center gap-1">
            مدعوم بالذكاء الاصطناعي ✦ البيانات بتتحفظ في شيتكم الخاص
          </span>
        </div>
      </footer>

      {/* Dialogs */}
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
