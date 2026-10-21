import { XMLParser } from "fast-xml-parser";
import { NextRequest, NextResponse } from "next/server";
import { parseBggGame } from "@/lib/bggMapping";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bggId = Number(id);
  if (!Number.isInteger(bggId) || bggId <= 0) return NextResponse.json({ error: "Invalid BGG game ID" }, { status: 400 });
  const token = process.env.BGG_API_TOKEN;
  if (!token) return NextResponse.json({ error: "BGG API token is not configured. Add BGG_API_TOKEN to your .env file." }, { status: 503 });

  try {
    const url = new URL("https://boardgamegeek.com/xmlapi2/thing");
    url.searchParams.set("id", String(bggId));
    url.searchParams.set("stats", "1");
    const response = await fetch(url, { headers: { Accept: "application/xml", Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000), next: { revalidate: 3600 } });
    if (response.status === 202) return NextResponse.json({ error: "BGG is preparing game details. Please retry shortly." }, { status: 503 });
    if (response.status === 429) return NextResponse.json({ error: "Too many requests, please wait" }, { status: 429 });
    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: "BGG rejected the API token. Check BGG_API_TOKEN in your .env file." }, { status: 503 });
    if (!response.ok) throw new Error(`BGG returned ${response.status}`);

    const details = parseBggGame(await response.text(), bggId);
    if (!details) return NextResponse.json({ error: "Game not found on BGG" }, { status: 404 });
    return NextResponse.json({ game: details }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("BGG details lookup failed", error);
    return NextResponse.json({ error: "BGG service unavailable, try later" }, { status: 503 });
  }
}
