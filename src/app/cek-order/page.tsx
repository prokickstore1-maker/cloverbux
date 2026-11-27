import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderTracker } from "@/components/tracking/OrderTracker";
import { getConfigValue } from "@/services/config";
import { DEFAULT_ADMIN_WHATSAPP } from "@/services/defaults";
import { findHardcodedOrder } from "@/lib/hardcoded-orders";

export const dynamic = "force-dynamic";

interface CekOrderPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function CekOrderPage({ searchParams }: CekOrderPageProps) {
  const params = await searchParams;
  const adminWhatsapp = await getConfigValue<string>("admin_whatsapp", DEFAULT_ADMIN_WHATSAPP);
  const qrImageUrl = await getConfigValue<string>("qr_image_url", "");

  const initialOrder = params.code ? findHardcodedOrder(params.code) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-14 px-4">
        <OrderTracker
          initialCode={params.code}
          initialOrder={initialOrder}
          adminWhatsapp={adminWhatsapp}
          qrImageUrl={qrImageUrl}
        />
      </main>
      <Footer />
    </div>
  );
}
