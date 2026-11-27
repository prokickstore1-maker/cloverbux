import { NextRequest, NextResponse } from "next/server";

export interface GameValidationResponse {
  status: "valid" | "not_found" | "format_only" | "unavailable";
  nickname?: string;
  username?: string;
  region?: string;
  avatarUrl?: string;
  message?: string;
  source: "official" | "community" | "format";
}

// In-memory rate limiter (30 req / 60 detik per IP)
const WINDOW_MS = 60_000;
const MAX_REQ = 30;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || rec.reset <= now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_REQ;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "Terlalu banyak permintaan validasi. Coba lagi sebentar.",
        source: "format",
      } satisfies GameValidationResponse,
      { status: 429 }
    );
  }

  let body: { game?: string; userId?: string; zoneId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        status: "not_found",
        message: "Payload tidak valid",
        source: "format",
      } satisfies GameValidationResponse,
      { status: 400 }
    );
  }

  const { game, userId, zoneId } = body;
  const cleanId = String(userId ?? "").trim();
  const cleanZone = String(zoneId ?? "").trim();

  if (!game || !cleanId) {
    return NextResponse.json(
      {
        status: "not_found",
        message: "Game dan ID Akun wajib diisi",
        source: "format",
      } satisfies GameValidationResponse,
      { status: 400 }
    );
  }

  // 1. Roblox (source: official)
  if (game === "roblox") {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanId)) {
      return NextResponse.json({
        status: "not_found",
        message: "Username Roblox tidak valid (3–20 karakter, huruf/angka/_).",
        source: "official",
      } satisfies GameValidationResponse);
    }

    try {
      const res = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [cleanId],
          excludeBannedUsers: false,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return NextResponse.json({
          status: "unavailable",
          message: "Server verifikasi Roblox sedang sibuk.",
          source: "official",
        } satisfies GameValidationResponse);
      }

      const json = await res.json();
      const userData = json?.data?.[0];

      if (!userData) {
        return NextResponse.json({
          status: "not_found",
          message: "Akun Roblox tidak ditemukan. Periksa kembali username Anda.",
          source: "official",
        } satisfies GameValidationResponse);
      }

      let avatarUrl: string | undefined;
      try {
        const thumbRes = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png&isCircular=false`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (thumbRes.ok) {
          const thumbJson = await thumbRes.json();
          avatarUrl = thumbJson?.data?.[0]?.imageUrl || undefined;
        }
      } catch {
        // Thumbnail failure is non-blocking
      }

      return NextResponse.json({
        status: "valid",
        nickname: userData.displayName || userData.name,
        username: userData.name,
        avatarUrl,
        source: "official",
      } satisfies GameValidationResponse);
    } catch {
      return NextResponse.json({
        status: "unavailable",
        message: "Server verifikasi Roblox sedang tidak merespons.",
        source: "official",
      } satisfies GameValidationResponse);
    }
  }

  // 2. Mobile Legends (source: community)
  if (game === "mlbb") {
    if (!/^\d{5,20}$/.test(cleanId) || !/^\d{3,10}$/.test(cleanZone)) {
      return NextResponse.json({
        status: "not_found",
        message: "User ID (5–20 digit) atau Zone ID (3–10 digit) tidak sesuai format.",
        source: "community",
      } satisfies GameValidationResponse);
    }

    try {
      const res = await fetch(
        `https://api.isan.eu.org/nickname/ml?id=${encodeURIComponent(cleanId)}&zone=${encodeURIComponent(cleanZone)}`,
        { signal: AbortSignal.timeout(6000) }
      );

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Worker threw exception or HTML 500
        parsed = null;
      }

      if (parsed?.success === true && parsed?.name) {
        return NextResponse.json({
          status: "valid",
          nickname: String(parsed.name),
          region: parsed.country ? String(parsed.country) : undefined,
          source: "community",
        } satisfies GameValidationResponse);
      }

      if (parsed?.success === false) {
        return NextResponse.json({
          status: "not_found",
          message: "Akun Mobile Legends tidak ditemukan. Periksa kembali User ID dan Zone ID.",
          source: "community",
        } satisfies GameValidationResponse);
      }

      return NextResponse.json({
        status: "unavailable",
        message: "Server verifikasi MLBB sedang tidak merespons.",
        source: "community",
      } satisfies GameValidationResponse);
    } catch {
      return NextResponse.json({
        status: "unavailable",
        message: "Server verifikasi MLBB timeout/gangguan.",
        source: "community",
      } satisfies GameValidationResponse);
    }
  }

  // 3. Free Fire (source: community)
  if (game === "freefire") {
    if (!/^\d{5,20}$/.test(cleanId)) {
      return NextResponse.json({
        status: "not_found",
        message: "ID Free Fire harus berupa 5–20 digit angka.",
        source: "community",
      } satisfies GameValidationResponse);
    }

    try {
      const res = await fetch(
        `https://api-cek-id-game-ten.vercel.app/api/check-id-game?type_name=free_fire&userId=${encodeURIComponent(cleanId)}`,
        { signal: AbortSignal.timeout(6000) }
      );

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      const nickname =
        parsed?.result?.username ||
        parsed?.result?.nickname ||
        parsed?.result?.name ||
        parsed?.nickname ||
        parsed?.name;

      if (nickname) {
        return NextResponse.json({
          status: "valid",
          nickname: String(nickname),
          source: "community",
        } satisfies GameValidationResponse);
      }

      if (parsed?.status === false || parsed?.message?.toLowerCase()?.includes("not found")) {
        return NextResponse.json({
          status: "not_found",
          message: parsed?.message || "Akun Free Fire tidak ditemukan. Periksa User ID Anda.",
          source: "community",
        } satisfies GameValidationResponse);
      }

      return NextResponse.json({
        status: "unavailable",
        message: "Server verifikasi Free Fire sedang tidak merespons.",
        source: "community",
      } satisfies GameValidationResponse);
    } catch {
      return NextResponse.json({
        status: "unavailable",
        message: "Server verifikasi Free Fire timeout/gangguan.",
        source: "community",
      } satisfies GameValidationResponse);
    }
  }

  // 4. PUBG Mobile (source: format)
  if (game === "pubg") {
    if (/^\d{6,20}$/.test(cleanId)) {
      return NextResponse.json({
        status: "format_only",
        message: "Format ID PUBG Mobile valid.",
        source: "format",
      } satisfies GameValidationResponse);
    }
    return NextResponse.json({
      status: "not_found",
      message: "ID PUBG Mobile harus berupa 6–20 digit angka.",
      source: "format",
    } satisfies GameValidationResponse);
  }

  // 5. FC Mobile (source: format)
  if (game === "fcmobile") {
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(cleanId)) {
      return NextResponse.json({
        status: "format_only",
        message: "Format UID FC Mobile valid.",
        source: "format",
      } satisfies GameValidationResponse);
    }
    return NextResponse.json({
      status: "not_found",
      message: "UID FC Mobile harus berupa 5–30 karakter alfanumerik.",
      source: "format",
    } satisfies GameValidationResponse);
  }

  // Default fallback
  return NextResponse.json({
    status: "format_only",
    message: "Format ID tersimpan.",
    source: "format",
  } satisfies GameValidationResponse);
}
