"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloverIcon } from "@/components/ui/CloverLogo";
import { QrisDisplay } from "@/components/ui/QrisDisplay";

interface OrderTrackerProps {
  initialCode?: string;
  initialOrder?: any;
  adminWhatsapp?: string;
  qrImageUrl?: string;
}

const statusMap: Record<string, { label: string; className: string; desc: string }> = {
  pending: {
    label: "Pending",
    className: "border-amber-500/40 bg-amber-950/30 text-amber-300 font-semibold",
    desc: "Pesanan ini membutuhkan aktivasi akun sebelum dapat diproses dan dikirimkan.",
  },
  pending_payment: {
    label: "Menunggu pembayaran",
    className: "border-amber-500/40 bg-amber-950/30 text-amber-300",
    desc: "Silakan selesaikan pembayaran dan unggah bukti transfer.",
  },
  waiting_verify: {
    label: "Menunggu verifikasi",
    className: "border-blue-500/40 bg-blue-950/30 text-blue-300",
    desc: "Bukti transfer diterima. Tim cloverbux sedang memverifikasi pembayaran Anda.",
  },
  approved: {
    label: "Pembayaran disetujui",
    className: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300",
    desc: "Pembayaran terverifikasi. Pesanan masuk antrean pengiriman.",
  },
  processing: {
    label: "Sedang dikirim",
    className: "border-cyan-500/40 bg-cyan-950/30 text-cyan-300",
    desc: "Item pesanan sedang diproses dan dikirim langsung ke akun Anda.",
  },
  completed: {
    label: "Pesanan selesai",
    className: "border-[#00b869]/50 bg-emerald-950/40 text-[#00b869] font-semibold",
    desc: "Pesanan berhasil dikirim ke akun Anda. Terima kasih telah top up di cloverbux!",
  },
  rejected: {
    label: "Pesanan ditolak",
    className: "border-destructive/40 bg-destructive/20 text-destructive-foreground",
    desc: "Pesanan dibatalkan atau bukti transfer tidak valid.",
  },
  expired: {
    label: "Kedaluwarsa",
    className: "border-[#243028] bg-[#111613] text-zinc-400",
    desc: "Batas waktu transfer 24 jam telah habis.",
  },
};

export function OrderTracker({
  initialCode,
  initialOrder,
  adminWhatsapp = "",
  qrImageUrl = "",
}: OrderTrackerProps) {
  const [query, setQuery] = useState(initialCode || "");
  const [order, setOrder] = useState<any>(initialOrder || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/order/check?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || "Pesanan tidak ditemukan. Periksa kembali kode atau Order ID Anda.");
        setOrder(null);
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Gagal menghubungkan ke server.");
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = order ? statusMap[order.status] || statusMap.pending : null;

  const detailRows = order
    ? [
        ["Order ID", order.orderId],
        ["Game", order.game ? String(order.game).toUpperCase() : "ROBLOX"],
        ...(order.gameUserId
          ? [
              [
                "ID Akun",
                order.gameZoneId
                  ? `${order.gameUserId} (Zone: ${order.gameZoneId})`
                  : order.gameUserId,
              ],
            ]
          : []),
      ]
    : [];

  return (
    <Card className="mx-auto max-w-xl p-5 shadow-2xl sm:p-8 bg-[#161c18] border-[#243028] text-white">
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00b869] mb-1">
        <CloverIcon className="h-3.5 w-3.5" />
        <span>Lacak Pesanan cloverbux</span>
      </div>
      <h2 className="text-center text-2xl font-bold tracking-tight text-white font-heading">
        Status Pesanan
      </h2>
      <p className="mt-1 text-center text-sm text-zinc-400">
        Masukkan kode unik 8 karakter atau nomor Order ID Anda.
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="Masukkan kode atau Order ID"
          aria-label="Kode cek atau Order ID"
          className="min-w-0 uppercase bg-[#111613] border-[#243028] text-white placeholder:text-zinc-600 focus-visible:ring-[#00b869]"
        />
        <Button
          type="submit"
          disabled={loading}
          className="bg-[#00b869] hover:bg-[#009e5a] text-[#08100b] font-bold shadow-sm shadow-[#00b869]/20"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Cari
        </Button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/20 p-3 text-sm text-destructive-foreground" role="alert">
          {error}
        </p>
      )}

      {order && currentStatus ? (
        <div className="mt-6 border-t border-[#243028] pt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">Status pesanan</span>
            <Badge variant="outline" className={currentStatus.className}>
              {currentStatus.label}
            </Badge>
          </div>
          <p className="mt-3 rounded-xl bg-[#111613] border border-[#243028] p-3.5 text-sm leading-6 text-zinc-300">
            {currentStatus.desc}
          </p>

          {order.adminNote && (
            <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-sm text-amber-200">
              <strong className="text-amber-400">Catatan admin:</strong> {order.adminNote}
            </p>
          )}

          {/* Render QRIS jika butuh aktivasi dan QR tersedia */}
          {order.requiresActivation && qrImageUrl && (
            <QrisDisplay
              src={qrImageUrl}
              alt="QRIS Aktivasi Pesanan"
              title="QRIS Aktivasi Akun"
              subtitle="Scan QRIS di atas untuk menyelesaikan aktivasi pesanan Anda."
              className="mt-4"
            />
          )}

          {/* Baris detail: hanya Order ID, Game, dan ID Akun */}
          <dl className="mt-4 divide-y divide-[#243028] rounded-xl border border-[#243028] bg-[#111613] px-4 text-sm">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-zinc-400">{label}</dt>
                <dd className="text-right font-medium text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 text-center">
            {adminWhatsapp && (
              <a
                href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(
                  `Halo Admin cloverbux, saya ingin menanyakan status pesanan saya dengan Order ID: ${order.orderId}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-[#00b869] underline underline-offset-4 transition-colors duration-150 hover:text-emerald-300"
              >
                Butuh bantuan? Hubungi admin via WhatsApp
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-[#111613] border border-[#243028] p-3 text-sm text-zinc-400">
          Setelah membuat pesanan, masukkan kode cek atau Order ID di atas untuk melihat status pembayaran dan pengiriman secara real-time.
        </p>
      )}
    </Card>
  );
}
