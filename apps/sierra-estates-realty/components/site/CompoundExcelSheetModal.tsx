"use client";

import React, { useEffect, useState } from "react";
import type { InventoryUnit } from "@/lib/inventory/types";
import ExcelInventorySheet, {
  SIERRA_CONTACT_PHONE,
  SIERRA_WHATSAPP_PHONE,
} from "./ExcelInventorySheet";
import { ExcelInventorySheet as CadastralExcelSheet } from "@/components/MasterRegistryMap/ExcelInventorySheet";
import { UnitDetailModal } from "@/components/MasterRegistryMap/UnitDetailModal";
import {
  Compound,
  UnitListing,
  COMPOUNDS,
  resolveCompoundFromInventoryName,
} from "@/components/MasterRegistryMap/registryData";
import { FileText, FileSpreadsheet, Moon, Sun, X } from "lucide-react";

export { SIERRA_CONTACT_PHONE, SIERRA_WHATSAPP_PHONE };

export interface CompoundExcelSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  compoundName: string | null;
  /** Optional pre-loaded units list; if not provided or empty, will fetch from /api/inventory?compound=... */
  initialUnits?: InventoryUnit[];
  isAr?: boolean;
}

export default function CompoundExcelSheetModal({
  isOpen,
  onClose,
  compoundName,
  initialUnits = [],
  isAr = false,
}: CompoundExcelSheetModalProps) {
  const [sheetMode, setSheetMode] = useState<"cadastral" | "crm">("cadastral");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedCompound, setSelectedCompound] = useState<Compound>(() =>
    resolveCompoundFromInventoryName(compoundName)
  );
  const [inspectedUnit, setInspectedUnit] = useState<UnitListing | null>(null);

  useEffect(() => {
    if (compoundName) {
      setSelectedCompound(resolveCompoundFromInventoryName(compoundName));
    }
  }, [compoundName]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (inspectedUnit) {
          setInspectedUnit(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, inspectedUnit]);

  if (!isOpen || !compoundName) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${compoundName} Inventory Sheet`}
      className="fixed inset-0 z-9999 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-7xl h-[92vh] max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/30 bg-[#061122] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(223,173,58,0.15)] overflow-hidden">
        {/* Top Mode & Theme Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#040b16] border-b border-amber-500/25 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetMode("cadastral")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sheetMode === "cadastral"
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "text-stone-300 hover:text-white bg-white/5"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? "سجل الإكسل + تحميل PDF + حاسبة العائد والجولة 360°"
                  : "Master Registry Sheet + PDF Dossier + ROI & 360°"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSheetMode("crm")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sheetMode === "crm"
                  ? "bg-cyan-500 text-stone-950 shadow-sm"
                  : "text-stone-300 hover:text-white bg-white/5"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                {isAr ? "جدول المبيعات المباشر (CRM)" : "Direct CRM Sheet"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {sheetMode === "cadastral" && (
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-stone-700 bg-stone-900 text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5" />
                    <span>{isAr ? "وضع نهاري" : "Light"}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>{isAr ? "وضع ليلي" : "Dark"}</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-stone-300 hover:text-rose-300 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sheet Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {sheetMode === "cadastral" ? (
            <CadastralExcelSheet
              selectedCompound={selectedCompound}
              onSelectCompound={(c) => setSelectedCompound(c)}
              onSelectUnit={(u) => setInspectedUnit(u)}
              lang={isAr ? "ar" : "en"}
              isDarkMode={isDarkMode}
            />
          ) : (
            <ExcelInventorySheet
              compoundName={compoundName}
              initialUnits={initialUnits}
              isAr={isAr}
              onClose={onClose}
              isEmbedded={false}
            />
          )}
        </div>
      </div>

      {inspectedUnit && (
        <UnitDetailModal
          unit={inspectedUnit}
          onClose={() => setInspectedUnit(null)}
          lang={isAr ? "ar" : "en"}
          isDarkMode={isDarkMode}
          onBookViewing={(u) => {
            const msg = encodeURIComponent(
              `Hello Sierra Estates, I would like to book a viewing / inquire about unit ${u.unitCode} in ${u.compoundNameEn}.`
            );
            window.open(`https://wa.me/201092048333?text=${msg}`, "_blank", "noopener,noreferrer");
          }}
        />
      )}
    </div>
  );
}
