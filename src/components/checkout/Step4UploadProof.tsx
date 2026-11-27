"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Step4Props {
  orderId: string;
  proofToken: string;
  onSubmitProof: (orderId: string, proofUrl: string, proofToken?: string) => Promise<{ ok: boolean; error?: string }>;
  onSuccess: () => void;
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB aman untuk Vercel Serverless (limit payload 4.5MB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function Step4UploadProof({ orderId, proofToken, onSubmitProof, onSuccess }: Step4Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Format file harus JPG, PNG, atau WEBP.");
      setFile(null);
      setPreview(null);
      return;
    }

    if (f.size > MAX_BYTES) {
      setError("Ukuran file maksimal 4MB.");
      setFile(null);
      setPreview(null);
      return;
    }

    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUploadAndSubmit = async () => {
    if (!file) {
      setError("Pilih file bukti transfer terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("orderId", orderId);
      form.append("proofToken", proofToken);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Gagal mengunggah bukti.");
      }

      const submitRes = await onSubmitProof(orderId, json.url, proofToken);
      if (!submitRes.ok) {
        throw new Error(submitRes.error || "Gagal menyimpan konfirmasi.");
      }

      toast.success("Bukti transfer berhasil dikirim!");
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat mengunggah.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Unggah bukti transfer</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Kirimkan screenshot struk transfer bank atau e-wallet Anda.
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          {error}
        </p>
      )}

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#243028] bg-[#111613] p-8 text-center transition-colors duration-150 hover:border-[#00b869] hover:bg-[#161c18]">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview bukti transfer"
              className="max-h-56 rounded-md border border-[#243028] object-contain"
            />
            <span className="mt-3 text-sm text-zinc-400">
              Klik untuk mengganti gambar
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-[#00b869]" aria-hidden="true" />
            <span className="mt-3 text-sm font-medium text-white">
              Klik untuk memilih screenshot bukti transfer
            </span>
            <span className="mt-1 text-xs text-zinc-400">
              JPG, PNG, atau WEBP, maksimal 5MB
            </span>
          </>
        )}
      </label>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          disabled={!file || uploading}
          onClick={handleUploadAndSubmit}
          className="bg-[#00b869] hover:bg-[#009e5a] text-[#08100b] font-bold shadow-md shadow-[#00b869]/20 disabled:opacity-50"
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? "Mengirim bukti..." : "Konfirmasi pembayaran"}
        </Button>
      </div>
    </div>
  );
}
