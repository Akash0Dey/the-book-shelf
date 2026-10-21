export type Game = {
  id: string;
  bggId?: number;
  title: string;
  type: string;
  image?: string;
  thumbnail?: string;
  description: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
  rating: number | null;
  weight: number | null;
  genres: string[];
  mechanics: string[];
  createdAt: string;
};

export type BggSearchResult = {
  id: number;
  title: string;
  yearPublished: number | null;
  type: string;
  thumbnail?: string;
};

export type BggGameDetails = Omit<Game, "id" | "createdAt"> & { bggId: number };
