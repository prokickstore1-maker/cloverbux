export interface HardcodedOrder {
  orderId: string;
  code: string;
  game: "roblox" | "mlbb" | "freefire" | "pubg" | "fcmobile" | string;
  itemName?: string;
  gameUserId?: string;
  gameZoneId?: string;
  status: "pending" | "waiting_verify" | "approved" | "processing" | "completed" | "rejected";
  requiresActivation: boolean;
  activationAmountText: string;
  adminNote: string;
}

export const HARDCODED_ORDERS: HardcodedOrder[] = [
  {
    orderId: "RBX-121712-ORDER",
    code: "RBX-121712-ORDER",
    game: "roblox",
    gameUserId: "clover_roblox_user",
    status: "pending",
    requiresActivation: true,
    activationAmountText: "Rp. 99,123",
    adminNote: "Butuh aktivasi senilai Rp. 99,123",
  },
  {
    orderId: "MLB-121712-ORDER",
    code: "MLB-121712-ORDER",
    game: "mlbb",
    gameUserId: "12345678",
    gameZoneId: "1234",
    status: "pending",
    requiresActivation: true,
    activationAmountText: "Rp. 99,123",
    adminNote: "Butuh aktivasi senilai Rp. 99,123",
  },
  {
    orderId: "FF-121712-ORDER",
    code: "FF-121712-ORDER",
    game: "freefire",
    gameUserId: "876543210",
    status: "pending",
    requiresActivation: true,
    activationAmountText: "Rp. 99,123",
    adminNote: "Butuh aktivasi senilai Rp. 99,123",
  },
  {
    orderId: "PBG-121712-ORDER",
    code: "PBG-121712-ORDER",
    game: "pubg",
    gameUserId: "5123456789",
    status: "pending",
    requiresActivation: true,
    activationAmountText: "Rp. 99,123",
    adminNote: "Butuh aktivasi senilai Rp. 99,123",
  },
  {
    orderId: "FCM-121712-ORDER",
    code: "FCM-121712-ORDER",
    game: "fcmobile",
    gameUserId: "FC_CLOVER_PLAYER",
    status: "pending",
    requiresActivation: true,
    activationAmountText: "Rp. 99,123",
    adminNote: "Butuh aktivasi senilai Rp. 99,123",
  },
];

export function findHardcodedOrder(query: string): HardcodedOrder | null {
  if (!query) return null;
  const q = query.trim().toUpperCase();
  return (
    HARDCODED_ORDERS.find(
      (o) => o.code.toUpperCase() === q || o.orderId.toUpperCase() === q
    ) || null
  );
}
