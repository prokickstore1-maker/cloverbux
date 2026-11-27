import Link from "next/link";
import { CheckCircle, Search, Home, MessageCircle } from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface Step5Props {
  order: {
    orderId: string;
    code: string;
    game?: string;
    itemName?: string;
    gameUserId?: string;
    gameZoneId?: string;
    robuxAmount?: number;
    totalPrice: number;
    robloxUsername?: string;
  };
  adminWhatsapp?: string;
}

export function Step5Success({ order, adminWhatsapp = "" }: Step5Props) {
  const accountText = order.gameZoneId
    ? `${order.gameUserId || order.robloxUsername} (Zone: ${order.gameZoneId})`
    : (order.gameUserId || order.robloxUsername || "-");

  const itemText = order.itemName || (order.robuxAmount ? `${order.robuxAmount.toLocaleString("id-ID")} Robux` : "-");
  const gameLabel = order.game ? order.game.toUpperCase() : "ROBLOX";

  const normalizedWa = adminWhatsapp.replace(/[^\d]/g, "").replace(/^0/, "62");
  const waMessage = [
    "Halo Admin cloverbux, saya mau konfirmasi pembayaran pesanan saya:",
    "",
    `• Order ID: ${order.orderId}`,
    `• Kode Cek: ${order.code}`,
    `• Game: ${gameLabel}`,
    `• ID Akun: ${accountText}`,
    `• Paket: ${itemText}`,
    `• Total Bayar: ${formatRupiah(order.totalPrice)}`,
    "",
    "Bukti transfer sudah saya unggah di website. Mohon segera diproses ya Min, terima kasih!",
  ].join("\n");
  const waHref = normalizedWa
    ? `https://wa.me/${normalizedWa}?text=${encodeURIComponent(waMessage)}`
    : "";

  const rows = [
    { label: "Order ID", value: order.orderId, mono: true },
    { label: "Kode cek status", value: order.code, mono: true, accent: true },
    { label: "Game", value: gameLabel },
    { label: "Akun / Player ID", value: accountText },
    { label: "Paket Item", value: itemText },
    { label: "Total dibayar", value: formatRupiah(order.totalPrice) },
  ];

  return (
    <div className="py-4 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#161c18] border border-[#00b869]/50 text-[#00b869] shadow-lg shadow-[#00b869]/20">
        <CheckCircle className="h-8 w-8" aria-hidden="true" />
      </span>

      <h3 className="mt-4 text-2xl font-bold tracking-tight text-white font-heading">Pesanan Berhasil Dibuat</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Bukti transfer telah diterima tim <span className="text-[#00b869] font-semibold">cloverbux</span> dan sedang diverifikasi.
      </p>

      <dl className="mx-auto mt-6 max-w-md divide-y divide-[#243028] rounded-xl border border-[#243028] bg-[#111613] px-4 text-left shadow-lg">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <dt className="text-zinc-400">{r.label}</dt>
            <dd className={`text-right ${r.accent ? "font-mono font-bold text-[#00b869]" : "font-medium text-white"}`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      {waHref && (
        <div className="mx-auto mt-5 max-w-md rounded-xl border border-[#00b869]/40 bg-emerald-950/25 p-4 text-center">
          <p className="text-sm text-zinc-200 leading-relaxed">
            Silakan chat admin via WhatsApp untuk konfirmasi pembayaran agar pesanan Anda segera diproses.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants(),
              "mt-3 w-full bg-[#00b869] hover:bg-[#009e5a] text-[#08100b] font-bold shadow-md shadow-[#00b869]/20"
            )}
          >
            <MessageCircle className="h-4 w-4" /> Chat Admin via WhatsApp
          </a>
        </div>
      )}

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={`/cek-order?code=${order.code}`}
          className={cn(
            buttonVariants({ variant: waHref ? "outline" : "default" }),
            waHref
              ? "border-[#243028] bg-[#111613] text-zinc-300 hover:bg-[#161c18] hover:text-white"
              : "bg-[#00b869] hover:bg-[#009e5a] text-[#08100b] font-bold shadow-md shadow-[#00b869]/20"
          )}
        >
          <Search className="h-4 w-4" /> Cek status pesanan
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "border-[#243028] bg-[#111613] text-zinc-300 hover:bg-[#161c18] hover:text-white")}
        >
          <Home className="h-4 w-4" /> Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
