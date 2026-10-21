"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ArrowRight, Bell, BookOpen, Check, ChevronDown, CircleHelp, Clock3, Dice5, Filter, Grid2X2, Heart, Library, List, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Star, Users, X } from "lucide-react";
import type { BggGameDetails, BggSearchResult, Game } from "@/db/schema";
import { COLLECTION_KEY, addGameToCollection } from "@/lib/collection";
import { getBggGame, searchBgg } from "@/lib/bggApi";

const emptyDetails = (result: BggSearchResult): BggGameDetails => ({
  bggId: result.id, title: result.title, type: "Board game", image: undefined, thumbnail: result.thumbnail,
  description: "", minPlayers: null, maxPlayers: null, playingTime: null, minPlayTime: null, maxPlayTime: null,
  minAge: null, rating: null, weight: null, genres: [], mechanics: [],
});
const asGame = (details: BggGameDetails): Game => ({ ...details, id: `bgg-${details.bggId}`, createdAt: new Date().toISOString() });
const prettyType = (type: string) => type.replace(/^boardgame/, "Board game").replace(/^Board gameexpansion$/, "Expansion");

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [selected, setSelected] = useState<BggGameDetails | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [sort, setSort] = useState("Recently added");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeNav, setActiveNav] = useState("My collection");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLECTION_KEY);
      if (stored) setGames(JSON.parse(stored) as Game[]);
    } catch { setNotice("Your saved collection could not be read from this browser."); }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(COLLECTION_KEY, JSON.stringify(games));
  }, [games, hydrated]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredGames = useMemo(() => {
    const needle = collectionQuery.trim().toLowerCase();
    const filtered = games.filter((game) => !needle || game.title.toLowerCase().includes(needle) || game.genres.some((genre) => genre.toLowerCase().includes(needle)));
    return [...filtered].sort((a, b) => sort === "Title A–Z" ? a.title.localeCompare(b.title) : sort === "Highest rated" ? (b.rating ?? 0) - (a.rating ?? 0) : b.createdAt.localeCompare(a.createdAt));
  }, [games, collectionQuery, sort]);

  async function runSearch(event?: React.FormEvent) {
    event?.preventDefault();
    setError(""); setResults([]); setSelected(null);
    if (!query.trim()) { setError("Please enter a game title"); return; }
    setSearching(true);
    try {
      setResults(await searchBgg(query));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Network error, please try again"); }
    finally { setSearching(false); }
  }

  async function chooseGame(result: BggSearchResult) {
    setError(""); setLoadingDetails(true); setSelected(emptyDetails(result));
    try { setSelected(await getBggGame(result.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load game details"); }
    finally { setLoadingDetails(false); }
  }

  function updateSelected(field: keyof BggGameDetails, value: string) {
    if (!selected) return;
    const numericFields = ["minPlayers", "maxPlayers", "playingTime", "minPlayTime", "maxPlayTime", "minAge", "rating", "weight"];
    setSelected({ ...selected, [field]: numericFields.includes(field) ? (value === "" ? null : Number(value)) : value });
  }

  function importSelected() {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      setGames((current) => addGameToCollection(current, asGame(selected)));
      setNotice(`${selected.title} added to your collection`);
      closeImport();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save game, please try again"); }
    finally { setSaving(false); }
  }

  function closeImport() {
    setImportOpen(false); setQuery(""); setResults([]); setSelected(null); setError("");
  }

  function removeGame(game: Game) {
    setGames((current) => current.filter((item) => item.id !== game.id));
    setNotice(`${game.title} removed from your collection`);
  }

  const averageRating = games.length ? (games.reduce((sum, game) => sum + (game.rating ?? 0), 0) / games.filter((game) => game.rating).length || 0).toFixed(1) : "—";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand-mark"><Dice5 size={23} strokeWidth={2.2} /></span><span>The Game Shelf<small>YOUR TABLETOP HOME</small></span></a>
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-link ${activeNav === "My collection" ? "active" : ""}`} onClick={() => setActiveNav("My collection")}><Library size={18} />My collection<span className="nav-count">{games.length}</span></button>
          <button className={`nav-link ${activeNav === "Wishlist" ? "active" : ""}`} onClick={() => setActiveNav("Wishlist")}><Heart size={18} />Wishlist</button>
          <button className={`nav-link ${activeNav === "Play history" ? "active" : ""}`} onClick={() => setActiveNav("Play history")}><Clock3 size={18} />Play history</button>
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={16} /><span>Your next game night<br /><b>starts on the shelf.</b></span></div><button className="nav-link"><CircleHelp size={18} />Help & feedback</button><button className="nav-link"><Settings2 size={18} />Settings</button><div className="profile"><div className="avatar">A</div><span><b>Alex Morgan</b><small>Personal collection</small></span><ChevronDown size={15} className="profile-chevron" /></div></div>
      </aside>

      <section className="main-area" id="top">
        <header className="topbar"><div className="breadcrumbs">Your space <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><span className="sync-label"><span className="status-dot" /> Saved on this device</span><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="avatar small-avatar">A</div></div></header>
        <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow">A LITTLE WORLD OF YOUR OWN</div><h1>{activeNav === "My collection" ? "Your game shelf" : activeNav}</h1><p className="welcome-copy">Every great game night starts with a good choice.</p></div><button className="primary-button" onClick={() => setImportOpen(true)}><Plus size={18} /> Add a game</button></section>

          <section className="stat-row" aria-label="Collection overview">
            <div className="stat-card"><span className="stat-icon warm"><Library size={18} /></span><div><span className="stat-label">IN YOUR COLLECTION</span><b>{games.length}</b><small>games on your shelf</small></div></div>
            <div className="stat-card"><span className="stat-icon green"><Users size={18} /></span><div><span className="stat-label">PLAYERS COVERED</span><b>{games.length ? [...new Set(games.flatMap((game) => [game.minPlayers, game.maxPlayers]).filter(Boolean))].length : "—"}</b><small>ways to gather</small></div></div>
            <div className="stat-card"><span className="stat-icon blue"><Star size={18} /></span><div><span className="stat-label">SHELF AVERAGE</span><b>{averageRating}<span className="stat-out-of">{games.length ? " / 10" : ""}</span></b><small>BGG community rating</small></div></div>
            <div className="stat-card accent-stat"><span className="stat-icon lilac"><Sparkles size={18} /></span><div><span className="stat-label">A GOOD REMINDER</span><b className="stat-quote">Make room<br />for one more.</b></div></div>
          </section>

          <section className="collection-section">
            <div className="section-heading"><div><h2>Your collection <span className="heading-count">{games.length}</span></h2><p>A home for the games you love.</p></div><button className="text-button" onClick={() => setImportOpen(true)}>Browse games <ArrowRight size={15} /></button></div>
            <div className="toolbar"><label className="collection-search"><Search size={17} /><input aria-label="Search your collection" placeholder="Search your collection..." value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} /><kbd>⌘ K</kbd></label><div className="toolbar-right"><button className="filter-button"><Filter size={16} /> All games <ChevronDown size={14} /></button><label className="filter-button sort-select"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort games"><option>Recently added</option><option>Title A–Z</option><option>Highest rated</option></select><ChevronDown size={14} /></label><span className="toolbar-divider" /><button className={`view-toggle ${view === "grid" ? "selected" : ""}`} aria-label="Grid view" onClick={() => setView("grid")}><Grid2X2 size={17} /></button><button className={`view-toggle ${view === "list" ? "selected" : ""}`} aria-label="List view" onClick={() => setView("list")}><List size={18} /></button></div></div>

            {filteredGames.length > 0 ? <div className={`game-grid ${view === "list" ? "list-view" : ""}`}>{filteredGames.map((game, index) => <article className="game-card" key={game.id} style={{ "--card-delay": `${index * 45}ms` } as React.CSSProperties}><div className="game-art" style={game.image ? { backgroundImage: `linear-gradient(180deg, transparent 54%, rgba(19,28,24,.68)), url("${game.image}")` } : undefined}><div className={`art-placeholder art-tone-${index % 5}`}><span className="art-decoration">{index % 2 === 0 ? "✳" : "✦"}</span><Dice5 size={39} strokeWidth={1.2} /><span className="art-caption">A GAME FOR<br />GOOD COMPANY</span></div><span className="game-type">{prettyType(game.type)}</span><button className="card-menu" title={`Remove ${game.title}`} aria-label={`Remove ${game.title}`} onClick={() => removeGame(game)}><X size={15} /></button></div><div className="game-card-body"><div className="game-title-row"><h3>{game.title}</h3>{game.rating != null && <span className="rating"><Star size={13} fill="currentColor" />{game.rating.toFixed(1)}</span>}</div><div className="game-meta"><span><Users size={14} />{game.minPlayers ?? "?"}–{game.maxPlayers ?? "?"} players</span><span><Clock3 size={14} />{game.playingTime ?? "?"} min</span></div><div className="game-tags">{game.genres.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}{game.weight != null && <span>Weight {game.weight.toFixed(1)}</span>}</div></div></article>)}
              <button className="add-card" onClick={() => setImportOpen(true)}><span><Plus size={21} /></span><b>Add another game</b><small>Find your next favorite</small></button>
            </div> : <div className="empty-state"><div className="empty-illustration"><span className="empty-spark spark-one">✳</span><span className="empty-spark spark-two">✦</span><div className="empty-die"><Dice5 size={49} strokeWidth={1.25} /></div></div><div className="eyebrow">THE TABLE IS YOURS</div><h3>{collectionQuery ? "No games match that search" : "Your shelf is full of possibility"}</h3><p>{collectionQuery ? "Try another title or clear your search." : "Bring your favorite games together. Search BoardGameGeek and add the first one to your collection."}</p>{!collectionQuery && <button className="primary-button" onClick={() => setImportOpen(true)}><Plus size={17} /> Import from BoardGameGeek</button>}</div>}
          </section>
          <footer className="page-footer"><BookOpen size={14} /> A good collection is always growing. <span>•</span> BGG data provided by BoardGameGeek</footer>
        </div>
      </section>

      {notice && <div className="toast"><span><Check size={15} /></span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button></div>}

      {importOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeImport(); }}><section className={`import-panel ${selected ? "has-preview" : ""}`} role="dialog" aria-modal="true" aria-labelledby="import-title"><header className="modal-header"><div><div className="eyebrow">GROW YOUR COLLECTION</div><h2 id="import-title">Import from BGG</h2><p>Find a game and make it yours.</p></div><button className="icon-button close-button" onClick={closeImport} aria-label="Close import"><X size={19} /></button></header>
        <form className="bgg-search-form" onSubmit={runSearch}><label htmlFor="bgg-query">GAME TITLE</label><div className="bgg-search-field"><Search size={18} /><input id="bgg-query" autoFocus placeholder="Try “Wingspan” or “Catan”" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} /><button className="search-submit" type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button></div><small>Search the BoardGameGeek catalog by title.</small></form>
        {error && <div className="error-banner" role="alert"><CircleHelp size={16} />{error}{error.toLowerCase().includes("network") || error.toLowerCase().includes("unavailable") || error.toLowerCase().includes("token") ? <button onClick={() => runSearch()}>Retry</button> : null}</div>}
        <div className="import-workspace"><div className="results-column"><div className="results-heading">{searching ? "SEARCHING BGG…" : results.length ? `${results.length} MATCH${results.length === 1 ? "" : "ES"}` : "SEARCH RESULTS"}</div>{searching ? <div className="loading-state"><span className="spinner" />Looking through the catalog…</div> : results.length ? <div className="results-list">{results.map((result) => <button key={result.id} className={`result-item ${selected?.bggId === result.id ? "chosen" : ""}`} onClick={() => chooseGame(result)}><span className="result-cover">{result.thumbnail ? <img src={result.thumbnail} alt="" /> : <Dice5 size={22} />}</span><span className="result-copy"><b>{result.title}</b><small>{result.yearPublished ?? "Year unknown"} <span>·</span> {prettyType(result.type)}</small></span><ArrowRight size={16} /></button>)}</div> : <div className="results-placeholder"><Search size={23} /><p>Your search results<br />will appear here.</p></div>}</div>
          {selected ? <div className="preview-column"><div className="preview-heading"><span>GAME PREVIEW</span>{loadingDetails && <span className="mini-spinner" />}</div><div className="preview-summary">{selected.image ? <img className="preview-image" src={selected.image} alt={`${selected.title} cover`} /> : <div className="preview-image preview-art"><Dice5 size={37} /><span>BGG</span></div>}<div><h3>{selected.title}</h3><span className="preview-subtitle">{prettyType(selected.type)} <span>·</span> BGG #{selected.bggId}</span><div className="preview-ratings">{selected.rating != null && <span><Star size={14} fill="currentColor" /> {selected.rating.toFixed(1)}</span>}{selected.weight != null && <span><SlidersHorizontal size={13} /> {selected.weight.toFixed(1)} weight</span>}</div></div></div>
            <div className="editable-note"><Sparkles size={13} /> You can fine-tune details before saving.</div><div className="edit-grid"><label>MIN PLAYERS<input type="number" min="1" value={selected.minPlayers ?? ""} onChange={(e) => updateSelected("minPlayers", e.target.value)} /></label><label>MAX PLAYERS<input type="number" min="1" value={selected.maxPlayers ?? ""} onChange={(e) => updateSelected("maxPlayers", e.target.value)} /></label><label>PLAY TIME (MIN)<input type="number" min="1" value={selected.playingTime ?? ""} onChange={(e) => updateSelected("playingTime", e.target.value)} /></label><label>BGG RATING<input type="number" min="0" max="10" step="0.1" value={selected.rating ?? ""} onChange={(e) => updateSelected("rating", e.target.value)} /></label></div>
            <div className="preview-tags"><b>GENRES & MECHANICS</b><div>{[...selected.genres.slice(0, 3), ...selected.mechanics.slice(0, 3)].length ? [...selected.genres.slice(0, 3), ...selected.mechanics.slice(0, 3)].map((tag) => <span key={tag}>{tag}</span>) : <span className="muted-tag">Loading game details…</span>}</div></div>
            <div className="preview-actions"><button className="cancel-button" onClick={closeImport}>Cancel</button><button className="primary-button" onClick={importSelected} disabled={saving || loadingDetails}><Plus size={16} />{saving ? "Adding…" : "Add to my shelf"}</button></div></div> : <div className="preview-empty"><div className="preview-empty-icon"><Dice5 size={30} /></div><b>Pick a game to preview</b><span>See details before it joins your shelf.</span></div>}</div>
        <div className="modal-footnote"><span className="status-dot" /> Your collection is saved on this device. <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer">About BoardGameGeek <ArrowRight size={12} /></a></div>
      </section></div>}
    </main>
  );
}
