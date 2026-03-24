import { Link } from "react-router-dom";
import { Star, MapPin, Heart, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toggleFavorite } from "../../services/firebase/turfService";
import { useState } from "react";
import { toast } from "sonner";

export default function TurfCard({ turf, className = "" }) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(user?.favorites?.includes(turf.id) || false);
  const [favLoading, setFavLoading] = useState(false);

  const imageUrl = turf.images?.[0] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop";

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to favorite turfs");
      return;
    }
    setFavLoading(true);
    try {
      await toggleFavorite(user.uid, turf.id, isFavorite);
      setIsFavorite(!isFavorite);
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <Link
      to={`/turf/${turf.id}`}
      className={`group block bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 h-full flex flex-col ${className}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={turf.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-card/90 backdrop-blur-sm text-foreground uppercase tracking-wider">
            {turf.sport}
          </span>
        </div>
        
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={handleFavorite}
            disabled={favLoading}
            className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
              isFavorite 
                ? "bg-destructive/80 text-white" 
                : "bg-card/70 text-foreground hover:bg-card hover:text-destructive"
            }`}
          >
            {favLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-white" : ""}`} />
            )}
          </button>
          
          {turf.featured && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent text-accent-foreground uppercase tracking-wider">
              Featured
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1">
            {turf.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            <span className="text-sm font-bold">{turf.rating || "N/A"}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground mb-4">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs line-clamp-1">{turf.location}</span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-lg font-display font-bold text-foreground">₹{turf.price}</span>
            <span className="text-[10px] text-muted-foreground ml-0.5">/hr</span>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground group-hover:opacity-90 transition-opacity">
            Details
          </span>
        </div>
      </div>
    </Link>
  );
}
