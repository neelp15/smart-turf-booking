import { useParams, useNavigate } from "react-router-dom";
import { getTurfById, toggleFavorite, getTurfBookingsByDate, getTurfReviews } from "../../services/firebase/turfService";
import Navbar from "../../components/common/Navbar";
import { Star, MapPin, ArrowLeft, ChevronLeft, ChevronRight, Clock, Loader2, Info, Heart, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export default function TurfDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  const ref = useScrollReveal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTurfById(id);
        setTurf(data);

        // Check if favorite
        if (user) {
          setIsFavorite(user.favorites?.includes(id) || false);
        }
      } catch (error) {
        console.error("Error fetching turf data:", error);
        toast.error("Failed to load turf details");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, user]);

  // Fetch reviews whenever turf id changes
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        const data = await getTurfReviews(id);
        // Sort most recent first
        const sorted = data.sort((a, b) => {
          const tA = a.createdAt?.seconds ?? 0;
          const tB = b.createdAt?.seconds ?? 0;
          return tB - tA;
        });
        setReviews(sorted);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };
    fetchReviews();
  }, [id]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!id || !selectedDate) {
        setBookedSlots([]);
        return;
      }
      
      try {
        const bookings = await getTurfBookingsByDate(id, selectedDate);
        // Extract all slots from all bookings
        const slots = bookings.reduce((acc, booking) => {
          if (Array.isArray(booking.slots)) {
            return [...acc, ...booking.slots];
          }
          if (booking.slot) {
            return [...acc, booking.slot];
          }
          return acc;
        }, []);
        setBookedSlots(slots);
        // Clear any selected slots that are now booked
        setSelectedSlots(prev => prev.filter(s => !slots.includes(s)));
      } catch (error) {
        console.error("Error fetching booked slots:", error);
      }
    };
    fetchBookings();
  }, [id, selectedDate]);

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error("Please login to favorite turfs");
      return;
    }
    setFavLoading(true);
    try {
      await toggleFavorite(user.uid, id, isFavorite);
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    } finally {
      setFavLoading(false);
    }
  };



  const turfImages = (turf && Array.isArray(turf.images) && turf.images.length > 0) 
    ? turf.images 
    : ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop"];
  
  const turfSlots = (turf && Array.isArray(turf.availableSlots)) ? turf.availableSlots : [];
  const amenities = (turf && Array.isArray(turf.amenities)) ? turf.amenities : ["Parking", "Water", "Washroom", "Locker"];

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.getDate(),
    };
  });

  const handleBook = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!selectedDate || selectedSlots.length === 0 || !turf) return;
    const sortedSlots = [...selectedSlots].sort((a, b) => turfSlots.indexOf(a) - turfSlots.indexOf(b));
    navigate(`/booking/${turf.id}?date=${selectedDate}&slots=${encodeURIComponent(sortedSlots.join(","))}`);
  };

  const handleSlotClick = (slot) => {
    if (selectedSlots.includes(slot)) {
      // Removing a slot
      const newSlots = selectedSlots.filter(s => s !== slot);
      // Validate they are still consecutive
      if (newSlots.length > 0) {
        const indices = newSlots.map(s => turfSlots.indexOf(s)).sort((a, b) => a - b);
        const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
        if (!isConsecutive) {
          toast.error("Intermediate slots must remain selected");
          return;
        }
      }
      setSelectedSlots(newSlots);
    } else {
      // Adding a slot
      if (selectedSlots.length === 0) {
        setSelectedSlots([slot]);
      } else {
        const indices = [...selectedSlots, slot].map(s => turfSlots.indexOf(s)).sort((a, b) => a - b);
        const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
        
        if (isConsecutive) {
          setSelectedSlots([...selectedSlots, slot]);
        } else {
          // Reset selection if not consecutive or just warn
          toast.info("Slots must be consecutive. Resetting selection.");
          setSelectedSlots([slot]);
        }
      }
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground">
      <Navbar />

      {loading ? (
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Loading turf details...</p>
        </div>
      ) : !turf ? (
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">😕</div>
          <h2 className="font-display text-2xl font-bold mb-2 text-foreground">Turf not found</h2>
          <p className="text-muted-foreground text-sm mb-6">The turf you're looking for might have been removed or doesn't exist.</p>
          <button onClick={() => navigate("/turfs")} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm">
            Browse all turfs
          </button>
        </div>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="scroll-reveal flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left - Images + Details */}
            <div className="lg:col-span-3 space-y-6">
              {/* Image Gallery */}
              <div className="scroll-reveal relative rounded-2xl overflow-hidden aspect-[16/10] bg-muted shadow-lg">
                <img
                  src={turfImages[currentImage]}
                  alt={turf.name}
                  className="w-full h-full object-cover"
                />
                {turfImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImage((p) => (p === 0 ? turfImages.length - 1 : p - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors shadow-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImage((p) => (p === turfImages.length - 1 ? 0 : p + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors shadow-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {turfImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImage(i)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            i === currentImage ? "bg-primary w-4" : "bg-card/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="scroll-reveal stagger-1 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{turf.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{turf.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleFavorite}
                      disabled={favLoading}
                      className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                        isFavorite 
                          ? "bg-destructive/10 border-destructive/20 text-destructive scale-105 shadow-md shadow-destructive/10" 
                          : "bg-card border-border text-muted-foreground hover:text-destructive hover:border-destructive/20"
                      }`}
                    >
                      {favLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Heart className={`w-5 h-5 ${isFavorite ? "fill-destructive" : ""}`} />
                      )}
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary rounded-2xl border border-border">
                      <Star className="w-4 h-4 fill-accent text-accent" />
                      <span className="font-bold text-foreground">{turf.rating || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">({turf.reviews || 0} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                    {turf.sport}
                  </span>
                  {turf.featured && (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent uppercase tracking-wider">
                      Featured
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                    About this Turf
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {turf.description || "No description available for this turf listing."}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-display font-bold text-foreground">Amenities</h3>
                  <div className="flex flex-wrap gap-3">
                    {amenities.map((a) => (
                      <span key={a} className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary/50 text-foreground border border-border hover:bg-secondary transition-colors">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Reviews Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" /> Reviews
                      <span className="text-sm font-normal text-muted-foreground">({reviews.length})</span>
                    </h3>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-secondary/20 rounded-2xl border border-dashed border-border text-center">
                      <Star className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 bg-card rounded-2xl border border-border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {(review.userName || "U").charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{review.userName || "Anonymous"}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {review.createdAt?.seconds
                                    ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                    : "Recently"}
                                </p>
                              </div>
                            </div>
                            {/* Stars */}
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= review.rating ? "fill-accent text-accent" : "fill-transparent text-muted-foreground/20"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Booking Card */}
            <div className="lg:col-span-2">
              <div className="scroll-reveal stagger-2 sticky top-24 bg-card rounded-3xl border border-border p-6 shadow-xl space-y-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-foreground">₹{turf.price}</span>
                    <span className="text-muted-foreground font-medium">/ hour</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Includes all taxes and fees</p>
                </div>

                {/* Date Picker */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground">1. Select Date</h4>
                  <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                    {dates.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => {
                        setSelectedDate(d.value);
                        setSelectedSlots([]);
                      }}
                        className={`shrink-0 flex flex-col items-center min-w-[64px] py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                          selectedDate === d.value
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                            : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                        }`}
                      >
                        <span className="text-[10px] uppercase opacity-70 mb-1">{d.day}</span>
                        <span className="text-lg leading-none">{d.date}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slot Selection */}
                {selectedDate && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-foreground">2. Select Time Slots</h4>
                      {selectedSlots.length > 0 && (
                        <button onClick={() => setSelectedSlots([])} className="text-[10px] text-primary hover:underline font-bold uppercase transition-all">
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {turfSlots.map((slot) => {
                        const isSelected = selectedSlots.includes(slot);
                        const isBooked = bookedSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            onClick={() => !isBooked && handleSlotClick(slot)}
                            disabled={isBooked}
                            className={`py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                              isBooked
                                ? "bg-muted text-muted-foreground cursor-not-allowed border-dashed border-border opacity-50"
                                : isSelected
                                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-[1.02]"
                                  : "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20"
                            }`}
                          >
                            {isBooked ? (
                              <span className="flex items-center justify-center gap-1 opacity-70">
                                <span className="line-through">{slot}</span>
                                <span className="text-[10px] uppercase font-black tracking-tighter">(Sold)</span>
                              </span>
                            ) : (
                              slot
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {turfSlots.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-2xl border border-dashed border-border px-4 text-center">
                        <Info className="w-5 h-5 text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">No available slots for this turf today.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Summary */}
                {selectedDate && selectedSlots.length > 0 && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hourly Rate</span>
                      <span className="font-bold text-foreground">₹{turf.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">{selectedSlots.length} {selectedSlots.length === 1 ? 'Hour' : 'Hours'}</span>
                    </div>
                    <div className="border-t border-primary/10 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">Total to Pay</span>
                      <span className="text-xl font-display font-bold text-primary">₹{turf.price * selectedSlots.length}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleBook}
                    disabled={!selectedDate || selectedSlots.length === 0}
                    className="w-full py-4 rounded-2xl font-bold text-sm bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      {!selectedDate 
                        ? "Select A Date" 
                        : selectedSlots.length === 0 
                          ? "Pick Time Slots" 
                          : `Book Now • ₹${turf.price * selectedSlots.length}`}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase tracking-widest font-bold">
                    Instant Confirmation • Secure Payment
                  </p>
                </div>
              </div>
            </div>
        </div>
      </div>
    )}
  </div>
);
}
