import { describe, expect, it } from "vitest";
import type { Game } from "@/db/schema";
import { addGameToCollection, validateGameTitle } from "@/lib/collection";
import { parseBggGame } from "@/lib/bggMapping";

const game = (overrides: Partial<Game> = {}): Game => ({
  id: "bgg-13", bggId: 13, title: "Catan", type: "Board game", description: "", minPlayers: 3, maxPlayers: 4,
  playingTime: 60, minPlayTime: 60, maxPlayTime: 60, minAge: 10, rating: 7.1, weight: 2.3, genres: [], mechanics: [], createdAt: "2025-01-01", ...overrides,
});

describe("BGG field mapping", () => {
  it("maps game metadata, categories, mechanics, and ratings from BGG XML", () => {
    const xml = `<items><item type="boardgame" id="13"><name type="alternate" value="The Settlers"/><name type="primary" value="Catan"/><description>A trading game &amp; adventure.</description><thumbnail>https://example.com/thumb.jpg</thumbnail><image>https://example.com/cover.jpg</image><minplayers value="3"/><maxplayers value="4"/><playingtime value="60"/><minplaytime value="60"/><maxplaytime value="60"/><minage value="10"/><link type="boardgamecategory" id="1" value="Negotiation"/><link type="boardgamemechanic" id="2" value="Trading"/><statistics><ratings><average value="7.1"/><averageweight value="2.3"/></ratings></statistics></item></items>`;
    const game = parseBggGame(xml, 13);

    expect(game).toMatchObject({ bggId: 13, title: "Catan", type: "Board game", minPlayers: 3, maxPlayers: 4, playingTime: 60, minAge: 10, rating: 7.1, weight: 2.3, genres: ["Negotiation"], mechanics: ["Trading"], image: "https://example.com/cover.jpg" });
    expect(game?.description).toBe("A trading game & adventure.");
  });

  it("returns null when the requested game is absent", () => {
    expect(parseBggGame("<items></items>", 13)).toBeNull();
  });
});

describe("collection validation", () => {
  it("rejects empty and markup-like titles", () => {
    expect(validateGameTitle("  ")).toBe("Please enter a game title");
    expect(validateGameTitle("<script>")).toBe("Invalid game title");
    expect(validateGameTitle("Catan")).toBeNull();
  });

  it("adds a game to the front of the collection", () => {
    expect(addGameToCollection([], game())).toEqual([game()]);
  });

  it("prevents duplicate BGG IDs", () => {
    expect(() => addGameToCollection([game()], game({ id: "another", title: "Different name" }))).toThrow("Game already in your collection");
  });

  it("prevents duplicate titles case-insensitively", () => {
    expect(() => addGameToCollection([game()], game({ bggId: 999, title: "cAtAn" }))).toThrow("A game with this title is already in your collection");
  });
});
