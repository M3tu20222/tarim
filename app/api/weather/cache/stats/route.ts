import { NextResponse } from "next/server";
import { weatherCache } from "@/lib/weather/cache";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin erişimi gerekli" }, { status: 403 });
    }

    const stats = weatherCache.getCacheStats();

    return NextResponse.json({
      cache: stats,
      actions: {
        cleanup: '/api/weather/cache/cleanup',
        clear: '/api/weather/cache/clear'
      }
    });
  } catch (error) {
    console.error("Cache stats API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Cache istatistikleri getirilemedi", detail: message },
      { status: 500 }
    );
  }
}

// Cache temizleme
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin erişimi gerekli" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'cleanup') {
      const cleaned = weatherCache.cleanExpired();
      return NextResponse.json({ cleaned, message: `${cleaned} expired entries cleaned` });
    } else if (action === 'clear') {
      weatherCache.clear();
      return NextResponse.json({ message: 'Cache cleared completely' });
    } else if (action === 'pattern') {
      const pattern = searchParams.get('pattern');
      if (!pattern) {
        return NextResponse.json({ error: "Pattern required" }, { status: 400 });
      }
      const cleared = weatherCache.clearByPattern(pattern);
      return NextResponse.json({ cleared, message: `${cleared} entries with pattern '${pattern}' cleared` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Cache cleanup API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Cache temizleme hatası", detail: message },
      { status: 500 }
    );
  }
}