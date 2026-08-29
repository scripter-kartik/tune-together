"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmContext = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}











export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirmAction = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: options.title || "Are you sure?",
        message: options.message || "",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        tone: options.tone || "default", 
      });
    });
  }, []);

  const close = useCallback((result) => {
    setDialog(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  const tone = dialog?.tone === "danger";
  const confirmBtnClass = tone
    ? "bg-red-500 hover:bg-red-400 active:scale-95 text-white"
    : "bg-green-500 hover:bg-green-400 active:scale-95 text-black";

  return (
    <ConfirmContext.Provider value={confirmAction}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={dialog.title}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-[var(--tt-border)] shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 px-5 pt-5">
              <div
                className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  tone ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-white leading-snug">{dialog.title}</h2>
                {dialog.message && (
                  <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{dialog.message}</p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="flex-shrink-0 p-1 rounded-full text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 mt-5 border-t border-[var(--tt-divider)] bg-black/20">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                {dialog.cancelText}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${confirmBtnClass}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
