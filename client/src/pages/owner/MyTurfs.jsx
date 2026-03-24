import { useState, useEffect } from "react";
import Navbar from "../../components/common/Navbar";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Star, 
  MapPin, 
  Loader2, 
  Info,
  ChevronRight,
  Trophy,
  History
} from "lucide-react";
import { toast } from "sonner";
import { getOwnerTurfs, deleteTurf } from "../../services/firebase/turfService";
import { useAuth } from "../../context/AuthContext";

export default function MyTurfs() {
  const { user } = useAuth();
  const [ownerTurfs, setOwnerTurfs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTurfs = async () => {
    if (!user) return;
    try {
      const data = await getOwnerTurfs(user.uid);
      setOwnerTurfs(data);
    } catch (error) {
      console.error("Error fetching turfs:", error);
      toast.error("Failed to load your turfs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurfs();
  }, [user]);

  const handleDelete = async (turfId) => {
    if (!window.confirm("Are you sure you want to delete this turf?")) return;

    try {
      await deleteTurf(turfId);
      toast.success("Turf deleted successfully");
      fetchTurfs(); // Refresh the list
    } catch (error) {
      console.error("Error deleting turf:", error);
      toast.error("Failed to delete turf");
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">My Turfs</h1>
            <p className="text-muted-foreground text-base max-w-md">
              {loading ? "Syncing your listings..." : `You currently have ${ownerTurfs.length} active venue${ownerTurfs.length !== 1 ? "s" : ""}.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Link
              to="/owner/dashboard"
              className="px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-accent/5 text-foreground font-medium transition-all flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Stats
            </Link>
            <Link
              to="/owner/add-turf"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" /> Add New Turf
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin" />
              <Loader2 className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="mt-6 font-medium animate-pulse text-foreground/60">Loading your listings...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && ownerTurfs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 glass-card rounded-3xl border border-dashed border-white/20 text-muted-foreground max-w-2xl mx-auto text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Trophy className="w-10 h-10 text-primary opacity-40" />
            </div>
            <p className="text-2xl font-bold text-foreground">No turfs listed yet</p>
            <p className="text-muted-foreground mt-2 mb-8 max-w-sm">
              Your venue will be visible to thousands of potential customers once you list it.
            </p>
            <Link
              to="/owner/add-turf"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.05] transition-transform"
            >
              Create Your First Listing
            </Link>
          </div>
        )}

        {/* Turf Cards */}
        {!loading && ownerTurfs.length > 0 && (
          <div className="grid gap-6">
            {ownerTurfs.map((turf) => (
              <div
                key={turf.id}
                className="group flex flex-col md:flex-row gap-6 glass-card p-4 rounded-3xl border border-white/10 overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
              >
                {/* Image Section */}
                <div className="relative md:w-64 h-56 md:h-auto shrink-0 overflow-hidden rounded-2xl">
                  <img
                    src={
                      turf.images?.[0] ||
                      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop"
                    }
                    alt={turf.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  <div className="absolute top-3 left-3">
                    {turf.sport && (
                      <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
                        {turf.sport}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col justify-between py-2 pr-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-display font-bold text-foreground text-2xl group-hover:text-primary transition-colors duration-300">
                          {turf.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3.5 h-3.5 text-primary/60" />
                          <span>{turf.location}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-accent/10 px-2.5 py-1 rounded-lg">
                           <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                           <span className="font-bold text-accent text-sm">{turf.rating || "N/A"}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Player Rated</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Price Point</p>
                        <p className="font-display font-black text-foreground text-xl">
                          ₹{turf.price}<span className="text-muted-foreground font-normal text-sm">/hr</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Status</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                          <span className="text-sm font-bold text-foreground/80 lowercase italic font-serif">Listed</span>
                        </div>
                      </div>
                    </div>

                    {turf.description && (
                      <p className="text-sm text-muted-foreground mt-4 line-clamp-2 italic leading-relaxed">
                        "{turf.description}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                      to={`/owner/edit-turf/${turf.id}`}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-foreground transition-all group/btn"
                    >
                      <Edit2 className="w-4 h-4 text-primary group-hover/btn:rotate-12 transition-transform" /> 
                      Manage Details
                    </Link>
                    <button
                      onClick={() => handleDelete(turf.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-destructive/5 hover:bg-destructive/10 border border-destructive/10 rounded-xl text-sm font-bold text-destructive transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/owner/turf/${turf.id}`}
                      className="ml-auto p-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground rounded-xl transition-all"
                      title="View Turf Details"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
