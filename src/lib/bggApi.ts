import type { BggGameDetails, BggSearchResult } from "@/db/schema";

export async function searchBgg(query: string): Promise<BggSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Please enter a game title");
  if (trimmed.length > 100 || /[<>]/.test(trimmed)) throw new Error("Invalid search term");

  const response = await fetch(`/api/bgg/search?q=${encodeURIComponent(trimmed)}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "BGG service unavailable, try later");
  return payload.results as BggSearchResult[];
}

export async function getBggGame(id: number): Promise<BggGameDetails> {
  const response = await fetch(`/api/bgg/${id}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not load game details");
  return payload.game as BggGameDetails;
}
