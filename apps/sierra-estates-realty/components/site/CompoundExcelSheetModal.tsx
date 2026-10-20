"use client";

import React, { useEffect } from "react";
import type { InventoryUnit } from "@/lib/inventory/types";
import ExcelInventorySheet, {
  SIERRA_CONTACT_PHONE,
  SIERRA_WHATSAPP_PHONE,
} from "./ExcelInventorySheet";

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
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !compoundName) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${compoundName} Inventory Sheet`}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-7xl h-[92vh] max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/30 bg-[#061122] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(223,173,58,0.15)] overflow-hidden"
      >
        <ExcelInventorySheet
          compoundName={compoundName}
          initialUnits={initialUnits}
          isAr={isAr}
          onClose={onClose}
          isEmbedded={false}
        />
      </div>
    </div>
  );
}
