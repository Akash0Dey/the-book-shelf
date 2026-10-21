import { XMLParser } from "fast-xml-parser";
import { NextRequest, NextResponse } from "next/server";
import type { BggSearchResult } from "@/db/schema";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });
const cache = new Map<string, { expires: number; results: BggSearchResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ error: "Please enter a game title" }, { status: 400 });
  if (query.length > 100 || /[<>]/.test(query)) return NextResponse.json({ error: "Invalid search term" }, { status: 400 });

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return NextResponse.json({ results: cached.results, cached: true });
  const token = process.env.BGG_API_TOKEN;
  if (!token) return NextResponse.json({ error: "BGG API token is not configured. Add BGG_API_TOKEN to your .env file." }, { status: 503 });

  try {
    const url = new URL("https://boardgamegeek.com/xmlapi2/search");
    url.searchParams.set("query", query);
    url.searchParams.set("type", "boardgame,boardgameexpansion");
    const response = await fetch(url, { headers: { Accept: "application/xml", Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (response.status === 202) return NextResponse.json({ error: "BGG is processing requests. Please try again in a moment." }, { status: 503 });
    if (response.status === 429) return NextResponse.json({ error: "Too many requests, please wait" }, { status: 429 });
    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: "BGG rejected the API token. Check BGG_API_TOKEN in your .env file." }, { status: 503 });
    if (!response.ok) throw new Error(`BGG returned ${response.status}`);

    const parsed = parser.parse(await response.text());
    const items = parsed.items?.item ? (Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item]) : [];
    const results: BggSearchResult[] = items.map((item: Record<string, unknown>) => {
      const names = Array.isArray(item.name) ? item.name : item.name ? [item.name] : [];
      const primary = names.find((name: Record<string, unknown>) => name["@_type"] === "primary") ?? names[0];
      const year = item.yearpublished as Record<string, unknown> | undefined;
      return {
        id: Number(item["@_id"]),
        title: String(primary?.["@_value"] ?? "Untitled game"),
        yearPublished: year?.["@_value"] ? Number(year["@_value"]) : null,
        type: String(item["@_type"] ?? "boardgame"),
      };
    }).filter((item: BggSearchResult) => Number.isFinite(item.id));

    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, results });
    return NextResponse.json({ results, cached: false }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    console.error("BGG search failed", error);
    return NextResponse.json({ error: "BGG service unavailable, try later" }, { status: 503 });
  }
}
