"use client";

import { useState, useEffect } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Step3Payment } from "./Step3Payment";
import { Step4UploadProof } from "./Step4UploadProof";
import { Step5Success } from "./Step5Success";
import { createOrderAction, submitPaymentProofAction } from "@/app/actions/order";
import { Check, ArrowLeft, Loader2, Info, AlertCircle, RefreshCw } from "lucide-react";
import type { GameConfig } from "@/lib/games";

interface DynamicCheckoutWizardProps {
  gameConfig: GameConfig;
  packages?: Array<{ id: string; name: string; price: number; amount?: number }>;
  rekeningList: Array<{ bank: string; nomor: string; atasNama: string }>;
  qrImageUrl?: string;
  adminWhatsapp?: string;
  initialPackageId?: string;
  defaultPackages?: Array<{ id: string; name: string; price: number; amount?: number }>;
}

export function DynamicCheckoutWizard({
  gameConfig,
  packages,
  rekeningList,
  qrImageUrl,
  adminWhatsapp,
  initialPackageId,
  defaultPackages,
}: DynamicCheckoutWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const availablePackages =
    packages && packages.length > 0
      ? packages
      : defaultPackages && defaultPackages.length > 0
      ? defaultPackages
      : [];

  const initialPkg = initialPackageId
    ? availablePackages.find((p) => p.id === initialPackageId) || availablePackages[0]
    : availablePackages[0];

  const [selectedPackage, setSelectedPackage] = useState(
    initialPkg || { id: "", name: "", price: 0, amount: 0 }
  );

  // Form inputs state
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    gameUserId: "",
    gameZoneId: "",
  });

  // Account validation state
  const [validation, setValidation] = useState<{
    state: "idle" | "loading" | "valid" | "not_found" | "format_only" | "unavailable";
    nickname?: string;
    username?: string;
    region?: string;
    avatarUrl?: string;
    message?: string;
    source?: "official" | "community" | "format";
  }>({ state: "idle" });
  const [retryKey, setRetryKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Created order data
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [proofToken, setProofToken] = useState("");

  // Auto-validation effect with 700ms debounce
  useEffect(() => {
    if (step !== 2) return;

    const uid = formData.gameUserId.trim();
    const zone = formData.gameZoneId.trim();

    // Cek batas minimal karakter sebelum panggil API
    let meetsMin = false;
    if (gameConfig.id === "roblox") {
      meetsMin = uid.length >= 3;
    } else if (gameConfig.id === "mlbb") {
      meetsMin = uid.length >= 5 && zone.length >= 3;
    } else {
      meetsMin = uid.length >= 5;
    }

    if (!meetsMin) {
      setValidation({ state: "idle" });
      return;
    }

    setValidation({ state: "loading" });
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/game/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game: gameConfig.id,
            userId: uid,
            zoneId: zone || undefined,
          }),
          signal: controller.signal,
        });

        const data = await res.json();
        setValidation({
          state: data.status || "unavailable",
          nickname: data.nickname,
          username: data.username,
          region: data.region,
          avatarUrl: data.avatarUrl,
          message: data.message,
          source: data.source,
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setValidation({
          state: "unavailable",
          message: "Server verifikasi sedang tidak merespons.",
          source: gameConfig.id === "roblox" ? "official" : "community",
        });
      }
    }, 700);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [step, formData.gameUserId, formData.gameZoneId, gameConfig.id, retryKey]);

  const steps = [
    `Pilih ${gameConfig.shortName}`,
    "Data Akun",
    "Bayar",
    "Upload Bukti",
    "Selesai",
  ];

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPackage.id || selectedPackage.price <= 0) {
      setError("Silakan pilih paket item terlebih dahulu.");
      return;
    }

    if (!formData.name.trim() || !formData.whatsapp.trim()) {
      setError("Nama pemesan dan Nomor WhatsApp wajib diisi.");
      return;
    }

    if (!formData.gameUserId.trim()) {
      setError(`${gameConfig.fields[0]?.label || "ID Akun"} wajib diisi.`);
      return;
    }

    // Aturan non-blocking checkout:
    // Hanya blokir submit bila gameConfig.id === "roblox" && validation.state === "not_found" && validation.source === "official"
    if (
      gameConfig.id === "roblox" &&
      validation.state === "not_found" &&
      validation.source === "official"
    ) {
      setError("Username Roblox tidak ditemukan. Periksa kembali username akun Anda.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await createOrderAction({
        game: gameConfig.id,
        packageId: selectedPackage.id,
        itemName: selectedPackage.name,
        robuxAmount: selectedPackage.amount || 0,
        price: selectedPackage.price,
        gameUserId: formData.gameUserId.trim(),
        gameZoneId: formData.gameZoneId ? formData.gameZoneId.trim() : undefined,
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
      });

      if (!res.success) {
        setError(res.error || "Gagal membuat pesanan.");
        return;
      }

      setCreatedOrder(res.order);
      setProofToken(res.proofToken);
      setStep(3);
    } catch (err: any) {
      setError(`Terjadi kesalahan sistem: ${err?.message || "Coba lagi nanti."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl rounded-2xl p-3 sm:p-7 bg-[#161c18] text-white border border-[#243028] shadow-2xl shadow-black/60 w-full max-w-full min-w-0 overflow-hidden">
      {/* Progress Steps Header */}
      <div className="mb-5 sm:mb-8">
        <ol className="grid grid-cols-5 gap-1 sm:gap-3" aria-label="Progres pemesanan">
          {steps.map((label, index) => {
            const isCompletedOrActive = step >= index + 1;
            const isCurrent = step === index + 1;
            return (
              <li key={label} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold transition-all duration-200",
                    isCompletedOrActive
                      ? "bg-[#00b869] text-[#08100b] shadow-sm shadow-[#00b869]/30"
                      : "border-2 border-[#243028] bg-[#111613] text-zinc-500"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center text-[9px] sm:text-xs",
                    isCurrent ? "font-semibold text-white" : isCompletedOrActive ? "text-zinc-300" : "text-zinc-500"
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#111613] border border-[#243028]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={step}
        >
          <div
            className="h-full bg-[#00b869] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,184,105,0.6)]"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Nominal Selection */}
      {step === 1 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-semibold text-white font-heading">
              1. Pilih Paket {gameConfig.currencyName}
            </h3>
            <Badge variant="outline" className="text-[10px] sm:text-xs border-[#243028] bg-[#111613] text-[#00b869] px-2 py-0.5">
              {gameConfig.name}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Pilih denominasi item yang ingin Anda kirimkan ke akun game.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3.5 sm:grid-cols-3">
            {availablePackages.map((item) => {
              const isSelected = selectedPackage.id === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedPackage(item)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative rounded-xl p-2.5 sm:p-3.5 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border min-w-0 overflow-hidden",
                    isSelected
                      ? "border-[#00b869] bg-[#1c2620] text-white shadow-lg shadow-[#00b869]/10 ring-1 ring-[#00b869]/50"
                      : "border-[#243028] bg-[#111613] text-zinc-200 hover:border-[#00b869]/40 hover:bg-[#19221d]"
                  )}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className={cn("text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider", isSelected ? "text-[#00b869]" : "text-zinc-500")}>
                      {gameConfig.shortName}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full border-2 transition-colors shrink-0",
                        isSelected
                          ? "border-[#00b869] bg-[#00b869] text-[#08100b]"
                          : "border-zinc-700 bg-zinc-800/60 text-transparent"
                      )}
                    >
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                    </span>
                  </div>

                  <div className="mt-1.5 text-sm sm:text-lg font-bold tracking-tight line-clamp-2 text-white">
                    {item.name}
                  </div>

                  <div className={cn("mt-1.5 text-xs sm:text-sm font-bold", isSelected ? "text-[#00b869] font-extrabold" : "text-emerald-400")}>
                    {formatRupiah(item.price)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 sm:pt-4 border-t border-[#243028]">
            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
              <span className="text-xs sm:text-sm text-zinc-400">Total:</span>
              <span className="font-extrabold text-[#00b869] text-base sm:text-lg">
                {selectedPackage.price ? formatRupiah(selectedPackage.price) : "Pilih paket"}
              </span>
            </div>
            <Button
              type="button"
              disabled={!selectedPackage || !selectedPackage.price}
              onClick={() => setStep(2)}
              className="w-full sm:w-auto h-10 px-5 bg-[#00b869] hover:bg-[#009e5a] text-[#08100b] font-bold text-xs sm:text-sm shadow-md shadow-[#00b869]/20 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              Lanjut ke Data Akun →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Account & Buyer Data Form */}
      {step === 2 && (
        <form onSubmit={handleCreateOrder}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-lg font-semibold text-white font-heading">
              2. Masukkan Data Akun {gameConfig.shortName}
            </h3>
            <span className="text-xs text-zinc-400 font-medium">Langkah 2 dari 5</span>
          </div>
          <p className="text-sm text-zinc-400">
            Isi identitas akun game tempat item akan dikirimkan. Kami tidak pernah meminta password.
          </p>

          {/* Guide Banner */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#243028] bg-[#111613] p-3 text-xs text-zinc-300">
            <Info className="h-4 w-4 shrink-0 text-[#00b869] mt-0.5" />
            <span>{gameConfig.idGuide}</span>
          </div>

          {error && (
            <p className="mt-4 rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 space-y-4">
            {/* Game Specific Fields */}
            {gameConfig.fields.length === 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {gameConfig.fields.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={field.key} className="block text-sm font-medium text-zinc-200">
                      {field.label} <span className="text-[#00b869]">*</span>
                    </label>
                    <Input
                      id={field.key}
                      type={field.type || "text"}
                      required={field.required}
                      value={field.key === "gameZoneId" ? formData.gameZoneId : formData.gameUserId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.key === "gameZoneId" ? "gameZoneId" : "gameUserId"]: e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className="mt-1.5 bg-[#111613] border-[#243028] text-white placeholder:text-zinc-600 focus-visible:ring-[#00b869] focus-visible:border-[#00b869]"
                    />
                    {field.helperText && (
                      <p className="mt-1 text-xs text-zinc-400">{field.helperText}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              gameConfig.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key} className="block text-sm font-medium text-zinc-200">
                    {field.label} <span className="text-[#00b869]">*</span>
                  </label>
                  <Input
                    id={field.key}
                    type={field.type || "text"}
                    required={field.required}
                    value={field.key === "gameZoneId" ? formData.gameZoneId : formData.gameUserId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field.key === "gameZoneId" ? "gameZoneId" : "gameUserId"]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="mt-1.5 bg-[#111613] border-[#243028] text-white placeholder:text-zinc-600 focus-visible:ring-[#00b869] focus-visible:border-[#00b869]"
                  />
                  {field.helperText && (
                    <p className="mt-1 text-xs text-zinc-400">{field.helperText}</p>
                  )}
                </div>
              ))
            )}

            {/* Account Validation Status Banner */}
            {validation.state === "loading" && (
              <div className="flex items-center gap-2 rounded-xl border border-[#243028] bg-[#111613] p-3 text-xs text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin text-[#00b869] shrink-0" />
                <span>Memeriksa data akun...</span>
              </div>
            )}

            {validation.state === "valid" && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  {validation.avatarUrl ? (
                    <img
                      src={validation.avatarUrl}
                      alt={validation.nickname || "Avatar"}
                      className="h-9 w-9 rounded-full border border-emerald-500/50 bg-[#161c18] object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-[#00b869] shrink-0">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white truncate text-sm">
                        {validation.nickname}
                      </span>
                      {validation.username && validation.username !== validation.nickname && (
                        <span className="text-[11px] text-zinc-400 font-mono">
                          (@{validation.username})
                        </span>
                      )}
                      {validation.region && (
                        <span className="rounded bg-emerald-900/60 px-1.5 py-0.2 text-[10px] text-emerald-300 font-semibold uppercase">
                          dari {validation.region}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check className="h-3 w-3" /> Akun terverifikasi
                    </span>
                  </div>
                </div>
              </div>
            )}

            {validation.state === "not_found" && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-300">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="truncate">{validation.message || "Akun tidak ditemukan. Periksa kembali ID Anda."}</span>
                </div>
                {validation.source !== "official" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRetryKey((k) => k + 1)}
                    className="h-7 px-2 text-xs text-red-300 hover:text-white hover:bg-red-900/40 shrink-0"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Cek ulang
                  </Button>
                )}
              </div>
            )}

            {validation.state === "unavailable" && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200">
                <div className="flex items-center gap-2 min-w-0">
                  <Info className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="truncate">{validation.message || "Server verifikasi sedang tidak merespons. Anda tetap dapat melanjutkan order."}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="h-7 px-2 text-xs text-amber-300 hover:text-white hover:bg-amber-900/40 shrink-0"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Cek ulang
                </Button>
              </div>
            )}

            {validation.state === "format_only" && (
              <div className="flex items-center gap-2 rounded-xl border border-[#243028] bg-[#111613] p-2.5 text-xs text-zinc-300">
                <Check className="h-3.5 w-3.5 text-[#00b869] shrink-0" />
                <span>{validation.message || "Format ID valid."}</span>
              </div>
            )}

            {/* Buyer Contact Fields */}
            <div>
              <label htmlFor="buyerName" className="block text-sm font-medium text-zinc-200">
                Nama Pemesan <span className="text-[#00b869]">*</span>
              </label>
              <Input
                id="buyerName"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Budi Santoso"
                className="mt-1.5 bg-[#111613] border-[#243028] text-white placeholder:text-zinc-600 focus-visible:ring-[#00b869] focus-visible:border-[#00b869]"
              />
            </div>

            <div>
              <label htmlFor="waNumber" className="block text-sm font-medium text-zinc-200">
                Nomor WhatsApp Aktif <span className="text-[#00b869]">*</span>
              </label>
              <Input
                id="waNumber"
                type="tel"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="Contoh: 081234567890"
                className="mt-1.5 bg-[#111613] border-[#243028] text-white placeholder:text-zinc-600 focus-visible:ring-[#00b869] focus-visible:border-[#00b869]"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Digunakan untuk notifikasi status pesanan atau jika ada kendala akun.
              </p>
            </div>
          </div>

          {/* Selected Summary Card */}
          <div className="mt-6 rounded-xl border border-[#243028] bg-[#111613] p-3.5 flex items-center justify-between text-sm">
            <div>
              <span className="text-xs text-zinc-400 block">Paket Terpilih:</span>
              <span className="font-semibold text-white">{selectedPackage.name}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 block">Harga:</span>
              <span className="font-bold text-[#00b869]">{formatRupiah(selectedPackage.price)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="border-[#243028] bg-[#111613] text-zinc-300 hover:bg-[#1a231e] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Ganti Paket
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#00b869] hover:bg-[#009e5a] text-[#08100b] font-bold shadow-md shadow-[#00b869]/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                </>
              ) : (
                "Lanjut ke Pembayaran"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Payment Details */}
      {step === 3 && createdOrder && (
        <Step3Payment
          order={createdOrder}
          rekeningList={rekeningList}
          qrImageUrl={qrImageUrl}
          onNext={() => setStep(4)}
        />
      )}

      {/* Step 4: Upload Payment Proof */}
      {step === 4 && createdOrder && (
        <Step4UploadProof
          orderId={createdOrder.orderId}
          proofToken={proofToken}
          onSubmitProof={async (orderId, _proofUrl, token) => {
            const res = await submitPaymentProofAction(orderId, token || proofToken);
            return { ok: res.success, error: res.error };
          }}
          onSuccess={() => setStep(5)}
        />
      )}

      {/* Step 5: Success Summary */}
      {step === 5 && createdOrder && (
        <Step5Success order={createdOrder} adminWhatsapp={adminWhatsapp} />
      )}
    </Card>
  );
}
