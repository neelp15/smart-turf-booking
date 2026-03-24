import { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { 
  Calendar, MapPin, Clock, Heart, Loader2, XCircle, Star, MessageSquare,
  IndianRupee, Activity, TrendingUp, Flame, QrCode, RotateCcw, Share2, PlusCircle, ArrowRight, Users, 
  Settings, User, Phone, Save
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUserBookings, updateBookingStatus, getUserFavorites, hasUserReviewedTurf, getAllTurfs } from "../../services/firebase/turfService";
import { updateUserProfile } from "../../services/firebase/userService";
import ReviewModal from "../../components/common/ReviewModal";
import BookingQRModal from "../../components/player/BookingQRModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function StatBox({ label, value, icon: Icon, color }) {
  return (
    <div className="p-4 bg-card border border-border rounded-2xl hover:border-primary/20 transition-all group">
      <div className={`p-2 rounded-xl bg-white/5 w-fit mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <h4 className="text-xl font-display font-bold text-foreground truncate">{value}</h4>
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const ref = useScrollReveal();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewedTurfs, setReviewedTurfs] = useState(new Set());
  const [reviewModal, setReviewModal] = useState(null); // { turfId, turfName, bookingId }
  const [qrModal, setQrModal] = useState(null); // booking
  const [recommendedTurf, setRecommendedTurf] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [bookingsData, favoritesData, allTurfs] = await Promise.all([
          getUserBookings(user.uid),
          getUserFavorites(user.uid),
          getAllTurfs()
        ]);
        setBookings(bookingsData);
        setFavorites(favoritesData);

        // Find a recommendation based on favorite sport
        if (allTurfs.length > 0 && bookingsData.length > 0) {
          const sports = bookingsData.map(b => b.sport).filter(Boolean);
          const favSport = sports.sort((a,b) =>
            sports.filter(v => v===a).length - sports.filter(v => v===b).length
          ).pop();
          
          const reco = allTurfs.find(t => t.sport === favSport && !bookingsData.some(b => b.turfId === t.id)) 
                     || allTurfs[Math.floor(Math.random() * allTurfs.length)];
          setRecommendedTurf(reco);
        } else if (allTurfs.length > 0) {
          setRecommendedTurf(allTurfs[0]);
        }

        // Check which turfs user has already reviewed
        const reviewed = new Set();
        for (const booking of bookingsData) {
          if (booking.status !== "confirmed") {
            const hasReviewed = await hasUserReviewedTurf(user.uid, booking.turfId);
            if (hasReviewed) reviewed.add(booking.turfId);
          }
        }
        setReviewedTurfs(reviewed);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      await updateBookingStatus(bookingId, "cancelled");
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b));
      toast.success("Booking cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  const handleReviewSuccess = (turfId) => {
    setReviewedTurfs(prev => new Set([...prev, turfId]));
  };

  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const history = bookings.filter((b) => b.status !== "confirmed");

  // --- Part A: Enhanced Stats & Gamification ---
  const stats = useMemo(() => {
    if (bookings.length === 0) return null;
    
    const totalSpent = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
    
    const sports = bookings.map(b => b.sport).filter(Boolean);
    const favSport = sports.sort((a,b) =>
      sports.filter(v => v===a).length - sports.filter(v => v===b).length
    ).pop() || "None";

    const turfsVisited = bookings.map(b => b.turfName).filter(Boolean);
    const mostVisited = turfsVisited.sort((a,b) =>
      turfsVisited.filter(v => v===a).length - turfsVisited.filter(v => v===b).length
    ).pop() || "None";

    return {
      totalSessions: bookings.length,
      totalSpent,
      favSport,
      mostVisited
    };
  }, [bookings]);

  const streak = useMemo(() => {
    if (bookings.length === 0) return 0;
    
    // Simple streak calculation: consecutive weeks with at least one booking
    const weeks = [...new Set(bookings.map(b => {
      const d = new Date(b.date);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
    }))].sort((a, b) => b - a);
    
    let currentStreak = 0;
    let lastWeek = null;
    
    // Check if the most recent booking was this week or last week to start counting
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const currentWeekNum = Math.ceil((((today - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
    
    if (weeks[0] < currentWeekNum - 1) return 0;

    for (const w of weeks) {
      if (lastWeek === null || lastWeek - w === 1) {
        currentStreak++;
        lastWeek = w;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [bookings]);



  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground">
      <Navbar />
      {qrModal && (
        <BookingQRModal
          booking={qrModal}
          onClose={() => setQrModal(null)}
        />
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-medium">Loading your dashboard...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="scroll-reveal bg-card rounded-2xl border border-border p-5 sticky top-20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-display font-bold text-lg">
                      {user?.displayName?.charAt(0) || user?.name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground truncate max-w-[150px]">
                      {user?.displayName || user?.name || "User"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</p>
                    {streak > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                          <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {streak} Week Streak</span>
                          <span>Level {Math.floor(streak/4) + 1}</span>
                        </div>
                        <div className="h-1.5 w-full bg-amber-500/10 rounded-full overflow-hidden border border-amber-500/20">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                            style={{ width: `${(streak % 4) * 25 || 100}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground italic">Keep playing to reach the next level!</p>
                      </div>
                    )}
                  </div>
                </div>

                <nav className="space-y-1">
                  <SidebarItem 
                    icon={Calendar} 
                    label="Upcoming" 
                    count={upcoming.length} 
                    active={activeTab === "upcoming"} 
                    onClick={() => setActiveTab("upcoming")}
                  />
                  <SidebarItem 
                    icon={Clock} 
                    label="History" 
                    count={history.length} 
                    active={activeTab === "history"}
                    onClick={() => setActiveTab("history")}
                  />
                  <SidebarItem 
                    icon={Heart} 
                    label="Favorites" 
                    count={favorites.length} 
                    active={activeTab === "favorites"}
                    onClick={() => setActiveTab("favorites")}
                  />
                  <SidebarItem 
                    icon={Settings} 
                    label="Settings" 
                    active={activeTab === "settings"}
                    onClick={() => setActiveTab("settings")}
                  />
                </nav>
              </div>
            </aside>

            {/* Main */}
            <main className="lg:col-span-3 space-y-8">
              {/* Part A: Personal Stats strip */}
              {stats && (
                <div className="scroll-reveal grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatBox label="Total Sessions" value={stats.totalSessions} icon={Calendar} color="text-blue-500" />
                  <StatBox label="Total Spent" value={`₹${stats.totalSpent}`} icon={IndianRupee} color="text-emerald-500" />
                  <StatBox label="Favorite Sport" value={stats.favSport} icon={Activity} color="text-accent" />
                  <StatBox label="Top Turf" value={stats.mostVisited} icon={MapPin} color="text-primary" />
                </div>
              )}

              {/* Recommendations & Dynamic Content Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="scroll-reveal glass-card p-6 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-accent/20 text-accent group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground mb-0.5">Recommended for You</h3>
                      {recommendedTurf ? (
                        <p className="text-xs text-muted-foreground">Based on your love for <span className="text-accent font-bold">{recommendedTurf.sport}</span></p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Exploring new venues near you</p>
                      )}
                    </div>
                  </div>
                  {recommendedTurf && (
                    <Link to={`/turf/${recommendedTurf.id}`} className="p-2 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all">
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>

                {/* Matchmaking / Find a Game */}
                <div className="scroll-reveal glass-card p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                       <Users className="w-4 h-4 text-primary" /> Find a Team
                     </h3>
                     <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold animate-pulse">3 Live</span>
                   </div>
                   <div className="space-y-3">
                     {[
                       { id: 1, host: "Karan", sport: "Football", time: "06:00 PM", needed: 2 },
                       { id: 2, host: "Sarah", sport: "Tennis", time: "07:30 PM", needed: 1 }
                     ].map(match => (
                       <div key={match.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                             {match.host.charAt(0)}
                           </div>
                           <div>
                             <p className="text-xs font-bold text-foreground">{match.host}'s Match</p>
                             <p className="text-[10px] text-muted-foreground">{match.sport} • {match.time}</p>
                           </div>
                         </div>
                         <button 
                           onClick={() => toast.success(`Request sent to ${match.host}!`)}
                           className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all"
                         >
                           Join (+{match.needed})
                         </button>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
              {activeTab === "upcoming" && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="scroll-reveal font-display text-xl font-bold text-foreground">Upcoming Bookings</h2>
                    <span className="text-xs text-muted-foreground">{upcoming.length} active</span>
                  </div>
                  {upcoming.length === 0 ? (
                    <EmptyState message="No upcoming bookings" action="Book a turf" link="/turfs" />
                  ) : (
                    <div className="space-y-3">
                      {upcoming.map((b, i) => (
                        <BookingCard 
                          key={b.id} 
                          booking={b} 
                          index={i} 
                          onCancel={handleCancel}
                          onShowQR={() => setQrModal(b)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "history" && (
                <section>
                  <h2 className="scroll-reveal font-display text-xl font-bold text-foreground mb-4">Booking History</h2>
                  {history.length === 0 ? (
                    <EmptyState message="No past bookings found" action="Explore Turfs" link="/turfs" />
                  ) : (
                    <div className="space-y-3">
                      {history.map((b, i) => (
                        <BookingCard 
                          key={b.id} 
                          booking={b} 
                          index={i}
                          isReviewed={reviewedTurfs.has(b.turfId)}
                          onReview={() => setReviewModal({ turfId: b.turfId, turfName: b.turfName, bookingId: b.id })}
                          onPlayAgain={() => navigate(`/turf/${b.turfId}`)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "favorites" && (
                <section>
                  <h2 className="scroll-reveal font-display text-xl font-bold text-foreground mb-4">Favorite Turfs</h2>
                  {favorites.length === 0 ? (
                    <EmptyState message="You haven't favorited any turfs yet" action="Browse Turfs" link="/turfs" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {favorites.map((turf) => (
                        <Link 
                          key={turf.id} 
                          to={`/turf/${turf.id}`}
                          className="flex gap-4 p-4 bg-card rounded-xl border border-border hover:shadow-card-hover transition-shadow"
                        >
                          <img 
                            src={turf.images?.[0] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop"} 
                            className="w-20 h-20 rounded-lg object-cover bg-muted" alt={turf.name} 
                          />
                          <div>
                            <h4 className="font-semibold text-foreground">{turf.name}</h4>
                            <p className="text-xs text-muted-foreground mb-2">{turf.location}</p>
                            <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase">{turf.sport}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "settings" && (
                <section className="scroll-reveal glass-card p-6 md:p-8 rounded-3xl border border-border">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-2xl bg-secondary text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">Profile Settings</h2>
                      <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
                    </div>
                  </div>

                  <ProfileSettingsForm user={user} />
                </section>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSettingsForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || user?.name || "",
    phone: user?.phone || "",
    favSport: user?.favSport || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile(user.uid, formData, "players");
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Your Name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="+91 00000 00000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Favorite Sport</label>
          <select 
            value={formData.favSport}
            onChange={(e) => setFormData({ ...formData, favSport: e.target.value })}
            className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
          >
            <option value="">Select a sport</option>
            <option value="Football">Football</option>
            <option value="Cricket">Cricket</option>
            <option value="Tennis">Tennis</option>
            <option value="Badminton">Badminton</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Save Changes
      </button>
    </form>
  );
}

function BookingCard({ booking, index, onCancel, onReview, isReviewed, onShowQR, onPlayAgain }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (booking.status !== "confirmed") return;

    const timer = setInterval(() => {
      const [hour, minute] = (booking.slots?.[0] || booking.slot || "12:00 PM").split(/:| /);
      const isPM = (booking.slots?.[0] || booking.slot || "").includes("PM");
      let h = parseInt(hour);
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;

      const bookingDate = new Date(booking.date);
      bookingDate.setHours(h, parseInt(minute), 0);

      const now = new Date();
      const diff = bookingDate - now;

      if (diff <= 0) {
        setTimeLeft("Started");
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(`${hours}h ${mins}m`);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [booking]);

  const statusStyles = {
    confirmed: "bg-turf-green-light text-primary border-primary/20",
    completed: "bg-secondary text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className={`scroll-reveal stagger-${(index % 5) + 1} flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-xl border border-border hover:shadow-sm transition-all relative group`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <h4 className="font-semibold text-foreground">{booking.turfName}</h4>
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${statusStyles[booking.status]}`}>
            {booking.status}
          </span>
          {/* Reviewed badge */}
          {isReviewed && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase">
              <Star className="w-2.5 h-2.5 fill-accent" /> Reviewed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5" /> {booking.location}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5" /> {booking.date}
          </span>
          <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5" /> {booking.slot || (Array.isArray(booking.slots) ? booking.slots.join(", ") : "N/A")}
          </span>
          {booking.duration && (
            <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">
              {booking.duration} hr
            </span>
          )}
          {booking.status === "confirmed" && (
            <button 
              onClick={() => toast.success("Your game is now open for other players to join!")}
              className="flex items-center gap-1.5 bg-accent/10 text-accent px-2 py-1 rounded-md font-bold hover:bg-accent/20 transition-all border border-accent/20"
            >
              <Users className="w-3.5 h-3.5" /> Open for Players?
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-3">
        <div className="text-right">
          <span className="block font-display font-bold text-foreground text-lg">₹{booking.price}</span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase opacity-60">ID: {booking.customId || booking.id.slice(0, 8)}</span>
        </div>
        
        {booking.status === "confirmed" && onCancel && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const text = `Join me for a game of ${booking.sport} at ${booking.turfName} on ${booking.date} at ${booking.slot}!`;
                if (navigator.share) {
                  navigator.share({ title: 'Join my Turf Booking', text, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(text);
                  toast.success("Invite message copied!");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
            >
              <Share2 className="w-3.5 h-3.5" /> Invite
            </button>
            <button 
              onClick={onShowQR}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"
            >
              <QrCode className="w-3.5 h-3.5" /> Pass
            </button>
            <button 
              onClick={() => onCancel(booking.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}

        {/* Rate & Review + Play Again for completed/past bookings */}
        {booking.status !== "confirmed" && (
          <div className="flex items-center gap-2">
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Play Again
              </button>
            )}
            {onReview && !isReviewed && (
              <button
                onClick={onReview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/10 rounded-lg transition-colors border border-transparent hover:border-accent/20"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Rate
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Live Countdown Badge */}
      {booking.status === "confirmed" && timeLeft && timeLeft !== "Started" && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary text-primary-foreground text-[9px] font-black rounded-lg shadow-lg animate-bounce">
          {timeLeft}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon: Icon, label, count, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} /> {label}
      </span>
      {count >= 0 && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ message, action, link }) {
  return (
    <div className="scroll-reveal text-center py-16 bg-card rounded-2xl border border-dashed border-border">
      <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
      </div>
      <p className="text-foreground font-medium mb-1">{message}</p>
      <p className="text-muted-foreground text-xs mb-6 max-w-[200px] mx-auto">Looks like there's nothing here yet. Start your journey today!</p>
      <Link to={link} className="inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-primary/20">
        {action}
      </Link>
    </div>
  );
}
