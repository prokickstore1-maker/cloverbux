"use client";

import { useState, useEffect } from "react";
import { ZoomIn, Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QrisDisplayProps {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function QrisDisplay({
  src,
  alt = "QRIS Pembayaran",
  title = "QRIS Pembayaran",
  subtitle = "Scan QRIS untuk menyelesaikan pembayaran / aktivasi.",
  className,
}: QrisDisplayProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsZoomed(false);
      }
    };
    if (isZoomed) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isZoomed]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;

    try {
      setDownloading(true);
      if (src.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = src;
        a.download = "qris-cloverbux.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("QRIS berhasil diunduh.");
        return;
      }

      try {
        const res = await fetch(src, { mode: "cors" });
        if (!res.ok) throw new Error("Gagal mengambil file");
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "qris-cloverbux.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success("QRIS berhasil diunduh.");
      } catch {
        // Fallback bila terkena CORS
        window.open(src, "_blank");
      }
    } catch {
      toast.error("Gagal mengunduh gambar QRIS.");
    } finally {
      setDownloading(false);
    }
  };

  if (!src) return null;

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-[#243028] bg-[#111613] p-4 text-center",
          className
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#00b869]">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsZoomed(true)}
              className="h-7 px-2 text-xs text-zinc-300 hover:text-white hover:bg-[#161c18]"
            >
              <ZoomIn className="h-3.5 w-3.5 mr-1 text-[#00b869]" />
              Perbesar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={handleDownload}
              className="h-7 px-2.5 text-xs border-[#243028] bg-[#161c18] text-zinc-200 hover:text-[#00b869] hover:bg-[#1e2621]"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1" />
              )}
              Download
            </Button>
          </div>
        </div>

        {/* Thumbnail Preview with Click to Zoom */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsZoomed(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setIsZoomed(true);
          }}
          className="group relative mx-auto max-w-sm cursor-pointer overflow-hidden rounded-lg border border-[#243028] bg-white p-3 transition-all hover:border-[#00b869]/60 hover:shadow-lg hover:shadow-[#00b869]/10"
        >
          <img
            src={src}
            alt={alt}
            className="mx-auto max-h-72 w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm border border-white/20">
              <ZoomIn className="h-3.5 w-3.5 text-[#00b869]" />
              Klik untuk perbesar
            </span>
          </div>
        </div>

        {subtitle && (
          <p className="mt-3 text-xs text-zinc-400">{subtitle}</p>
        )}
      </div>

      {/* Lightbox / Fullscreen Zoom Modal */}
      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center max-h-[90vh] max-w-md w-full rounded-2xl border border-[#243028] bg-[#161c18] p-5 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex w-full items-center justify-between pb-3 border-b border-[#243028]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00b869]" />
                {title}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloading}
                  onClick={handleDownload}
                  className="h-8 px-2.5 text-xs border-[#243028] bg-[#111613] text-zinc-200 hover:text-[#00b869]"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  Unduh
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsZoomed(false)}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="mt-4 flex items-center justify-center overflow-auto rounded-xl bg-white p-4 w-full">
              <img
                src={src}
                alt={alt}
                className="max-h-[60vh] max-w-full object-contain"
              />
            </div>

            <p className="mt-3 text-center text-xs text-zinc-400">
              Tekan <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">ESC</kbd> atau klik di luar untuk menutup.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
