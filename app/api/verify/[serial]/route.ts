import { NextRequest, NextResponse } from "next/server";
import { DigitalProductPassportEngine } from "@/lib/engine/dpp-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const { serial } = await params;
  const decodedSerial = decodeURIComponent(serial);
  const location = req.headers.get("x-forwarded-for") || "Citizen Web Portal";

  const result = DigitalProductPassportEngine.verifyPassport(decodedSerial, location);

  return NextResponse.json({
    success: true,
    ...result,
  });
}
