import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { getTurfById, createBooking } from "../../services/firebase/turfService";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { Check, MapPin, Clock, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export default function BookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState("");
  
  const date = searchParams.get("date");
  const slotsParam = searchParams.get("slots");
  const slots = slotsParam ? slotsParam.split(",") : [];
  const ref = useScrollReveal();

  useEffect(() => {
    const fetchTurf = async () => {
      try {
        const data = await getTurfById(id);
        setTurf(data);
      } catch (error) {
        console.error("Error fetching turf:", error);
        toast.error("Failed to load turf details");
      } finally {
        setLoading(false);
      }
    };
    fetchTurf();
  }, [id]);

  const handleConfirm = async () => {
    if (!user) {
      toast.error("Please login to book a turf");
      return;
    }

    setBookingLoading(true);
    try {
      const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalPrice = turf.price * slots.length;

      const bookingData = {
        userUid: user.uid,
        userName: user.displayName || user.name || "User",
        userEmail: user.email,
        turfId: id,
        turfName: turf.name,
        location: turf.location,
        ownerUid: turf.ownerUid,
        date: date,
        slots: slots,
        duration: slots.length,
        price: totalPrice,
        customId: bookingId,
        paymentStatus: "paid", // All successful bookings through this flow are considered paid
        status: "confirmed",
      };

      await createBooking(bookingData);
      setConfirmedBookingId(bookingId);
      setConfirmed(true);
      toast.success("Booking confirmed!");
    } catch (error) {
      console.error("Booking error:", error);
      if (error.message === "SLOT_TAKEN") {
        toast.error("One or more selected slots were just booked by someone else. Please choose different slots.");
        // Optional: Redirect back to turf detail to refresh slots
        setTimeout(() => navigate(`/turf/${id}`), 3000);
      } else {
        toast.error("Failed to confirm booking. Please try again.");
      }
    } finally {
      setBookingLoading(false);
    }
  };



  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (confirmed) {
    return (
      <div ref={ref} className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <div className="scroll-reveal text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-turf-green-light flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground mb-6">Your booking ID is <span className="font-mono font-semibold text-foreground">{confirmedBookingId}</span></p>

            <div className="bg-card rounded-xl border border-border p-5 text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Turf</span>
                <span className="font-medium text-foreground">{turf.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{formattedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slot</span>
                <span className="font-medium text-foreground">{slots.join(", ")}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-sm">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display font-bold text-foreground">₹{turf.price * slots.length}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Link
                to="/user/dashboard"
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
              >
                My Bookings
              </Link>
              <Link
                to="/turfs"
                className="px-5 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium"
              >
                Explore More
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen bg-background">
      <Navbar />

      {loading ? (
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Loading details...</p>
        </div>
      ) : !turf || !date || slots.length === 0 ? (
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🤔</div>
          <h2 className="font-display text-xl font-bold mb-2 text-foreground">Invalid booking session</h2>
          <p className="text-muted-foreground text-sm mb-6">We couldn't find your booking details. Please try selecting slots again.</p>
          <Link to="/turfs" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Browse turfs</Link>
        </div>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
          <button
            onClick={() => navigate(-1)}
            className="scroll-reveal flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="scroll-reveal font-display text-2xl font-bold text-foreground mb-6">Confirm Booking</h1>

          <div className="scroll-reveal stagger-1 bg-card rounded-2xl border border-border overflow-hidden mb-6">
            <div className="flex gap-4 p-5">
              <img 
                src={turf.images?.[0] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop"} 
                alt={turf.name} 
                className="w-24 h-24 rounded-xl object-cover shrink-0 bg-muted" 
              />
              <div>
                <h3 className="font-display font-semibold text-foreground">{turf.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {turf.location}
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground uppercase">
                  {turf.sport}
                </span>
              </div>
            </div>

            <div className="border-t border-border p-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{slots.join(", ")} ({slots.length} {slots.length === 1 ? "hour" : "hours"})</span>
              </div>
            </div>

            <div className="border-t border-border p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Hourly rate</span>
                <span className="text-foreground">₹{turf.price}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{slots.length} {slots.length === 1 ? "hour" : "hours"}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="text-foreground">₹0</span>
              </div>
              <div className="border-t border-border pt-3 mt-3 flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-xl font-bold text-foreground">₹{turf.price * slots.length}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={bookingLoading}
            className="scroll-reveal stagger-2 w-full py-3.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {bookingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm & Pay ₹{turf.price * slots.length}
          </button>
        </div>
      )}
    </div>
  );
}
