import type { Game } from "@/db/schema";

export const COLLECTION_KEY = "my-board-games.collection.v1";

export function validateGameTitle(title: string): string | null {
  const clean = title.trim();
  if (!clean) return "Please enter a game title";
  if (clean.length > 120 || /[<>]/.test(clean)) return "Invalid game title";
  return null;
}

export function addGameToCollection(games: Game[], game: Game): Game[] {
  if (game.bggId && games.some((existing) => existing.bggId === game.bggId)) {
    throw new Error("Game already in your collection");
  }
  if (games.some((existing) => existing.title.trim().toLowerCase() === game.title.trim().toLowerCase())) {
    throw new Error("A game with this title is already in your collection");
  }
  return [game, ...games];
}
