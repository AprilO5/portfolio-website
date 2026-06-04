const { useEffect, useMemo, useState } = React;

const API_BASE = "https://api.tvmaze.com";
const DEFAULT_QUERY = "Stranger Things";
const fallbackImage =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80";

function stripHtml(value) {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").trim();
}

function normalizeShow(result) {
  const show = result.show ?? result;
  return {
    id: show.id,
    name: show.name,
    genres: show.genres ?? [],
    status: show.status ?? "Unknown",
    language: show.language ?? "Unknown",
    rating: show.rating?.average ?? "NR",
    premiered: show.premiered ?? "Unknown",
    image: show.image?.medium ?? show.image?.original ?? "",
    summary: stripHtml(show.summary) || "No summary is available for this title yet.",
    url: show.url,
    network: show.webChannel?.name ?? show.network?.name ?? "Streaming / TV",
  };
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function Header({ route, setRoute, savedCount }) {
  const tabs = [
    ["search", "Search"],
    ["watchlist", `Watchlist (${savedCount})`],
    ["about", "About"],
  ];

  return (
    <header className="site-header">
      <button className="brand" onClick={() => setRoute("search")} aria-label="Go to search">
        <span className="brand-mark">S</span>
        <span>StreamScout</span>
      </button>
      <nav className="nav-tabs" aria-label="Primary views">
        {tabs.map(([id, label]) => (
          <button key={id} className={route === id ? "active" : ""} onClick={() => setRoute(id)}>
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Hero({ featured, total }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">External API React Project</p>
        <h1>Find your next stream.</h1>
        <p>
          Search live TV and streaming data, compare ratings and genres, open title details, and save
          a personal watchlist. The app is built with React state, conditional rendering, and
          asynchronous fetch calls to a public entertainment API.
        </p>
        <div className="hero-stats" aria-label="Project highlights">
          <div className="stat">
            <strong>{total}</strong>
            <span>live API results</span>
          </div>
          <div className="stat">
            <strong>3</strong>
            <span>app views</span>
          </div>
          <div className="stat">
            <strong>0</strong>
            <span>API keys required</span>
          </div>
        </div>
      </div>
      <aside className="spotlight" aria-label="Featured title">
        <img src={featured?.image || fallbackImage} alt={featured?.name || "Movie theater seats"} />
        <div className="spotlight-info">
          <h2>{featured?.name || "Live title explorer"}</h2>
          <p>{featured?.summary || "Search for a series to see real results from the API."}</p>
        </div>
      </aside>
    </section>
  );
}

function SearchView({ savedShows, onToggleSave }) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("relevance");
  const [shows, setShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchShows() {
      setStatus("loading");
      setError("");
      try {
        const response = await fetch(`${API_BASE}/search/shows?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("The API did not return results. Please try another search.");
        }
        const data = await response.json();
        setShows(data.map(normalizeShow));
        setStatus("success");
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message);
          setStatus("error");
        }
      }
    }

    fetchShows();
    return () => controller.abort();
  }, [query]);

  const genres = useMemo(() => {
    const uniqueGenres = new Set(shows.flatMap((show) => show.genres));
    return ["All", ...Array.from(uniqueGenres).sort()];
  }, [shows]);

  const filteredShows = useMemo(() => {
    const results = genre === "All" ? shows : shows.filter((show) => show.genres.includes(genre));
    return [...results].sort((a, b) => {
      if (sort === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sort === "newest") return String(b.premiered).localeCompare(String(a.premiered));
      return 0;
    });
  }, [genre, shows, sort]);

  const featured = filteredShows.find((show) => show.image) ?? filteredShows[0];

  return (
    <>
      <Hero featured={featured} total={filteredShows.length} />
      <main className="main-content">
        <SearchControls
          query={query}
          setQuery={setQuery}
          genre={genre}
          setGenre={setGenre}
          genres={genres}
          sort={sort}
          setSort={setSort}
        />
        <div className="status-row">
          <span className="status-pill">{status === "loading" ? "Fetching live data..." : "TVmaze API"}</span>
          <span>{filteredShows.length} matching titles</span>
        </div>
        {status === "loading" && <SkeletonGrid />}
        {status === "error" && <div className="error-state">{error}</div>}
        {status === "success" && filteredShows.length === 0 && (
          <div className="empty-state">No matches yet. Try a broader search like comedy, drama, or adventure.</div>
        )}
        {status === "success" && filteredShows.length > 0 && (
          <ShowGrid
            shows={filteredShows}
            savedShows={savedShows}
            onToggleSave={onToggleSave}
            onSelect={setSelectedShow}
          />
        )}
      </main>
      {selectedShow && (
        <ShowModal
          show={selectedShow}
          isSaved={savedShows.some((saved) => saved.id === selectedShow.id)}
          onToggleSave={onToggleSave}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </>
  );
}

function SearchControls({ query, setQuery, genre, setGenre, genres, sort, setSort }) {
  const [draft, setDraft] = useState(query);

  function handleSubmit(event) {
    event.preventDefault();
    setQuery(draft.trim() || DEFAULT_QUERY);
  }

  return (
    <form className="toolbar" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="search">Search titles</label>
        <input
          id="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Try Stranger Things, comedy, drama..."
        />
      </div>
      <div className="field">
        <label htmlFor="genre">Genre</label>
        <select id="genre" value={genre} onChange={(event) => setGenre(event.target.value)}>
          {genres.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sort">Sort</label>
        <select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="relevance">Relevance</option>
          <option value="rating">Rating</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <button className="primary-button" type="submit">
        Search
      </button>
    </form>
  );
}

function ShowGrid({ shows, savedShows, onToggleSave, onSelect }) {
  return (
    <section className="results-grid" aria-label="Search results">
      {shows.map((show) => (
        <ShowCard
          key={show.id}
          show={show}
          isSaved={savedShows.some((saved) => saved.id === show.id)}
          onToggleSave={onToggleSave}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}

function ShowCard({ show, isSaved, onToggleSave, onSelect }) {
  return (
    <article className="show-card">
      <button className="poster-button" onClick={() => onSelect(show)} aria-label={`View ${show.name} details`}>
        {show.image ? (
          <img className="poster" src={show.image} alt={`${show.name} poster`} />
        ) : (
          <div className="poster-placeholder">{show.name}</div>
        )}
      </button>
      <div className="show-body">
        <h3>{show.name}</h3>
        <div className="meta">
          <span className="chip">{show.rating}/10</span>
          <span className="chip">{show.premiered}</span>
          <span className="chip">{show.network}</span>
        </div>
        <div className="card-actions">
          <button className="ghost-button" onClick={() => onSelect(show)}>
            Details
          </button>
          <button className="primary-button" onClick={() => onToggleSave(show)}>
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}

function WatchlistView({ savedShows, onToggleSave }) {
  const [selectedShow, setSelectedShow] = useState(null);

  return (
    <main className="main-content">
      <div className="watchlist-header">
        <div>
          <h2>Your Watchlist</h2>
          <p>Saved titles stay in local browser storage so the list is still here when you refresh.</p>
        </div>
        <span className="status-pill">{savedShows.length} saved</span>
      </div>
      {savedShows.length === 0 ? (
        <div className="empty-state">No saved titles yet. Search for a show and tap Save.</div>
      ) : (
        <ShowGrid
          shows={savedShows}
          savedShows={savedShows}
          onToggleSave={onToggleSave}
          onSelect={setSelectedShow}
        />
      )}
      {selectedShow && (
        <ShowModal
          show={selectedShow}
          isSaved={savedShows.some((saved) => saved.id === selectedShow.id)}
          onToggleSave={onToggleSave}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </main>
  );
}

function AboutView() {
  return (
    <main className="main-content">
      <section className="about-section">
        <h2>Project Notes</h2>
        <p>
          StreamScout is a Netflix-inspired title discovery app. The Netflix API listing found during
          research points to internal/open-source Netflix services, so this project uses TVmaze instead:
          a public entertainment API that works in the browser without an API key.
        </p>
      </section>
      <section className="about-grid" aria-label="Project planning answers">
        <div className="about-section">
          <h3>Problem</h3>
          <p>Users want a quick way to search shows, compare basic details, and save ideas for later.</p>
        </div>
        <div className="about-section">
          <h3>User</h3>
          <p>The app is for viewers deciding what to watch next or collecting possible streaming picks.</p>
        </div>
        <div className="about-section">
          <h3>Interaction</h3>
          <p>Users search, filter by genre, sort results, open details, and maintain a watchlist.</p>
        </div>
      </section>
      <section className="about-section">
        <h2>API Used</h2>
        <ul>
          <li>Search endpoint: https://api.tvmaze.com/search/shows?q=Stranger%20Things</li>
          <li>Data displayed: title, poster, summary, network, genres, premiere date, status, and rating.</li>
          <li>States handled: loading, success, empty search results, and API errors.</li>
        </ul>
      </section>
    </main>
  );
}

function ShowModal({ show, isSaved, onToggleSave, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        {show.image ? (
          <img className="poster" src={show.image} alt={`${show.name} poster`} />
        ) : (
          <div className="poster-placeholder">{show.name}</div>
        )}
        <div className="modal-content">
          <button className="close-button" onClick={onClose} aria-label="Close details">
            X
          </button>
          <h2 id="modal-title">{show.name}</h2>
          <div className="meta">
            <span className="chip">{show.rating}/10</span>
            <span className="chip">{show.status}</span>
            <span className="chip">{show.language}</span>
            <span className="chip">{show.network}</span>
          </div>
          <p className="summary">{show.summary}</p>
          <div className="card-actions">
            <button className="primary-button" onClick={() => onToggleSave(show)}>
              {isSaved ? "Remove from list" : "Save title"}
            </button>
            <a className="ghost-button" href={show.url} target="_blank" rel="noreferrer">
              Open source
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="skeleton-grid" aria-label="Loading results">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="skeleton" key={index} />
      ))}
    </div>
  );
}

function App() {
  const [route, setRoute] = useState("search");
  const [savedShows, setSavedShows] = useLocalStorage("streamscout-watchlist", []);

  function toggleSave(show) {
    setSavedShows((current) => {
      const exists = current.some((saved) => saved.id === show.id);
      return exists ? current.filter((saved) => saved.id !== show.id) : [show, ...current];
    });
  }

  return (
    <div className="app-shell">
      <Header route={route} setRoute={setRoute} savedCount={savedShows.length} />
      {route === "search" && <SearchView savedShows={savedShows} onToggleSave={toggleSave} />}
      {route === "watchlist" && <WatchlistView savedShows={savedShows} onToggleSave={toggleSave} />}
      {route === "about" && <AboutView />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
