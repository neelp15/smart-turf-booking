import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getAllTurfs } from "../../services/firebase/turfService";
import TurfCard from "../../components/turf/TurfCard";
import Navbar from "../../components/common/Navbar";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useScrollReveal } from "../../hooks/useScrollReveal";

export default function TurfListing() {
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get("city") || "";
  const sportParam = searchParams.get("sport") || "";

  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(cityParam);
  const [sportFilter, setSportFilter] = useState(sportParam);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);
  const ref = useScrollReveal();

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const data = await getAllTurfs();
        setTurfs(data);
      } catch (error) {
        console.error("Error fetching turfs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTurfs();
  }, []);

  const sportTypes = useMemo(() => [...new Set(turfs.map((t) => t.sport))].filter(Boolean), [turfs]);

  const filtered = useMemo(() => {
    let result = turfs.filter((t) => {
      const matchSearch = !search || 
        t.location?.toLowerCase().includes(search.toLowerCase()) || 
        t.city?.toLowerCase().includes(search.toLowerCase()) || 
        t.name?.toLowerCase().includes(search.toLowerCase());
      const matchSport = !sportFilter || t.sport === sportFilter;
      const matchPrice = t.price >= priceRange[0] && t.price <= priceRange[1];
      const matchRating = (t.rating || 0) >= minRating;
      return matchSearch && matchSport && matchPrice && matchRating;
    });

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return result;
  }, [turfs, search, sportFilter, priceRange, minRating, sortBy]);

  return (
    <div ref={ref} className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="scroll-reveal mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Explore Turfs</h1>
          <p className="text-muted-foreground">{filtered.length} turfs found</p>
        </div>

        {/* Search + Filter bar */}
        <div className="scroll-reveal stagger-1 flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2 flex-1 px-4 py-2.5 bg-card rounded-xl border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, city, or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 bg-card rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors sm:w-auto"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="scroll-reveal mb-6 p-5 bg-card rounded-xl border border-border space-y-4 animate-fade-up">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Sport</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSportFilter("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !sportFilter ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  All
                </button>
                {sportTypes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSportFilter(s === sportFilter ? "" : s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sportFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Min Rating: {minRating}+
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full max-w-xs accent-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Price: ₹{priceRange[0]} — ₹{priceRange[1]}
              </label>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full max-w-xs accent-primary"
              />
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading turfs...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((turf, i) => (
              <div key={turf.id} className={`scroll-reveal stagger-${(i % 5) + 1}`}>
                <TurfCard turf={turf} />
              </div>
            ))}
          </div>
        ) : (
          <div className="scroll-reveal text-center py-20">
            <p className="text-4xl mb-4">🏟️</p>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No turfs found</h3>
            <p className="text-muted-foreground text-sm mb-6">Try adjusting your filters or search terms</p>
            <button
              onClick={() => { setSearch(""); setSportFilter(""); setMinRating(0); setPriceRange([0, 5000]); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
