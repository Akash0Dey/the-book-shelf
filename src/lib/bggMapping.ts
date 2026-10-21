import { XMLParser } from "fast-xml-parser";
import type { BggGameDetails } from "@/db/schema";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });
type XmlNode = Record<string, unknown>;
const one = (value: unknown): XmlNode => (Array.isArray(value) ? value[0] : value ?? {}) as XmlNode;
const numberValue = (node: unknown): number | null => {
  const value = one(node)["@_value"];
  const parsed = value == null ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const linksOfType = (links: unknown, type: string): string[] => {
  const list = Array.isArray(links) ? links : links ? [links] : [];
  return list.filter((link) => (link as XmlNode)["@_type"] === type).map((link) => String((link as XmlNode)["@_value"]));
};
const textValue = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;

export function parseBggGame(xml: string, bggId: number): BggGameDetails | null {
  const item = one(parser.parse(xml).items?.item);
  if (!item["@_id"]) return null;
  const names = Array.isArray(item.name) ? item.name : item.name ? [item.name] : [];
  const primary = names.find((name: XmlNode) => name["@_type"] === "primary") ?? names[0];
  const ratings = one(one(item.statistics).ratings);

  return {
    bggId,
    title: String(primary?.["@_value"] ?? "Untitled game"),
    type: String(item["@_type"] ?? "boardgame").replace(/^boardgame/, "Board game"),
    image: textValue(item.image),
    thumbnail: textValue(item.thumbnail),
    description: String(item.description ?? "").slice(0, 6000),
    minPlayers: numberValue(item.minplayers),
    maxPlayers: numberValue(item.maxplayers),
    playingTime: numberValue(item.playingtime),
    minPlayTime: numberValue(item.minplaytime),
    maxPlayTime: numberValue(item.maxplaytime),
    minAge: numberValue(item.minage),
    rating: numberValue(ratings.average),
    weight: numberValue(ratings.averageweight),
    genres: linksOfType(item.link, "boardgamecategory"),
    mechanics: linksOfType(item.link, "boardgamemechanic"),
  };
}