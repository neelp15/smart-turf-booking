import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { 
  Plus, 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Calendar, 
  IndianRupee, 
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Star,
  MessageSquare,
  ShieldCheck,
  Settings
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { getOwnerTurfs, subscribeToOwnerBookings, getTurfReviews } from "../../services/firebase/turfService";
import ProfileSettingsModal from "../../components/owner/ProfileSettingsModal";



export default function OwnerDashboard() {
  const navigate = useNavigate();
  const ref = useScrollReveal();
  const { user } = useAuth();
  
  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch static data (turfs and their reviews)
    const fetchTurfsAndReviews = async () => {
      try {
        const ownerTurfs = await getOwnerTurfs(user.uid);
        setTurfs(ownerTurfs);

        if (ownerTurfs.length > 0) {
          // Fetch reviews for all of the owner's turfs
          const reviewsPromiseArray = ownerTurfs.map(t => getTurfReviews(t.id));
          const allReviewsNested = await Promise.all(reviewsPromiseArray);
          const allReveiwsFlat = allReviewsNested.flat();
          
          // Sort reviews by date descending
          const sortedReviews = allReveiwsFlat.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
            return timeB - timeA;
          });
          
          setReviews(sortedReviews);
        }
      } catch (error) {
        console.error("Error fetching turfs or reviews:", error);
      }
    };
    fetchTurfsAndReviews();

    // Subscribe to real-time bookings
    const unsubscribe = subscribeToOwnerBookings(user.uid, (ownerBookings) => {
      const sortedBookings = ownerBookings.sort((a, b) => {
        // Handle potential null timestamps (serverTimestamp hasn't reached server yet)
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
        return timeB - timeA;
      });
      setBookings(sortedBookings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const today = new Date().toISOString().split("T")[0];

  // Compute last-7-days revenue from real bookings
  const chartData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const revenueMap = {};
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      revenueMap[key] = { name: days[d.getDay()], revenue: 0, date: key };
    }
    bookings.forEach(b => {
      if (revenueMap[b.date] !== undefined) {
        revenueMap[b.date].revenue += b.price || 0;
      }
    });
    return Object.values(revenueMap);
  }, [bookings]);

  // Peak hours heatmap data
  const peakHoursData = useMemo(() => {
    const slotCount = {};
    bookings.forEach(b => {
      const slots = b.slots || (b.slot ? [b.slot] : []);
      slots.forEach(s => {
        slotCount[s] = (slotCount[s] || 0) + 1;
      });
    });
    const maxCount = Math.max(...Object.values(slotCount), 1);
    return Object.entries(slotCount)
      .map(([slot, count]) => ({ slot, count, intensity: count / maxCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [bookings]);

  // Today's bookings
  const todaysBookings = useMemo(() => {
    return bookings
      .filter(b => b.date === today)
      .sort((a, b) => {
        const slotA = (a.slots?.[0] || a.slot || "");
        const slotB = (b.slots?.[0] || b.slot || "");
        return slotA.localeCompare(slotB);
      });
  }, [bookings, today]);

  const avgRatingGlobal = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const stats = [
    { 
      label: "Total Revenue", 
      value: `₹${bookings.reduce((sum, b) => sum + (b.price || 0), 0).toLocaleString()}`, 
      icon: IndianRupee, 
      trend: "+12.5%", 
      color: "from-emerald-500/20 to-emerald-500/0",
      iconColor: "text-emerald-500"
    },
    { 
      label: "Total Bookings", 
      value: bookings.length.toString(), 
      icon: Calendar, 
      trend: "+8.2%", 
      color: "from-blue-500/20 to-blue-500/0",
      iconColor: "text-blue-500"
    },
    { 
      label: "Active Turfs", 
      value: turfs.length.toString(), 
      icon: Activity, 
      trend: "0%", 
      color: "from-amber-500/20 to-amber-500/0",
      iconColor: "text-amber-500"
    },
    { 
      label: "Total Customers", 
      value: [...new Set(bookings.map(b => b.userUid))].length.toString(), 
      icon: Users, 
      trend: "+5.4%", 
      color: "from-primary/20 to-primary/0",
      iconColor: "text-primary"
    },
    { 
      label: "Avg Rating", 
      value: avgRatingGlobal, 
      icon: Star, 
      trend: "Top 5%", 
      color: "from-accent/20 to-accent/0",
      iconColor: "text-accent"
    },
  ];

  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <Navbar />

      {loading ? (
        <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center relative z-10">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin mb-6" />
          <p className="text-foreground/60 font-medium animate-pulse">Syncing dashboard data...</p>
        </div>
      ) : (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="scroll-reveal">
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-2 flex items-center gap-3">
                Dashboard <LayoutDashboard className="w-8 h-8 text-primary" />
              </h1>
              <p className="text-muted-foreground text-base max-w-md italic font-medium">
                Welcome back, {user?.displayName || "Partner"}. Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center gap-3 scroll-reveal">
              <Link 
                to="/owner/my-turfs"
                className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-foreground font-bold hover:bg-white/10 transition-all flex items-center gap-2"
              >
                My Turfs
              </Link>
              <button 
                onClick={() => navigate("/owner/add-turf")}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Add New Turf
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat, i) => (
              <div 
                key={stat.label} 
                className={`scroll-reveal stagger-${i+1} glass-card p-6 rounded-3xl border border-white/10 group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden relative`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                <div className="flex items-start justify-between relative z-10">
                  <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${stat.iconColor}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black font-mono px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-4 relative z-10">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-3xl font-display font-bold text-foreground mt-1 group-hover:tracking-tight transition-all duration-500">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Charts & Notice Board */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
            {/* Revenue Chart — live data */}
            <div className="lg:col-span-3 glass-card p-6 md:p-8 rounded-3xl border border-white/10 h-[450px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Revenue Insights</h3>
                  <p className="text-xs text-muted-foreground mt-1">Earnings from the last 7 days</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  Live Data
                </div>
              </div>
              <div className="h-full pb-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} dx={-10} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: '#fff' }}
                      formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Notice Board */}
            <div className="lg:col-span-2 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Notice Board</h3>
                  <p className="text-xs text-muted-foreground mt-1">Real-time booking notifications</p>
                </div>
                <Link to="/owner/bookings" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group">
                  View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {bookings.length > 0 ? (
                  bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {booking.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{booking.userName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            {booking.date} • {booking.slots?.[0]}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 mb-1 ${
                          booking.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {booking.paymentStatus === 'paid' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                          {booking.paymentStatus || 'Pending'}
                        </span>
                        <p className="text-xs font-black text-foreground">₹{booking.price}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                    <Activity className="w-10 h-10 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium italic">No recent activity found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reviews & Business Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Reviews Management */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Recent Reviews</h3>
                  <p className="text-xs text-muted-foreground mt-1">What players are saying about your turfs</p>
                </div>
                <div className="flex items-center gap-1 text-accent">
                  <Star className="w-4 h-4 fill-accent" />
                  <span className="text-sm font-bold">{avgRatingGlobal}</span>
                </div>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">
                            {(review.userName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-foreground block">{review.userName || "Anonymous"}</span>
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[120px]">
                              {review.turfName || Object.values(turfs).find(t => t.id === review.turfId)?.name || "Turf"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-3">"{review.comment}"</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">
                        {review.createdAt?.seconds 
                           ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) 
                           : "Recently"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                    <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground italic">No reviews received yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Management Actions */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="mb-8">
                <h3 className="font-display font-bold text-xl text-foreground">Quick Actions</h3>
                <p className="text-xs text-muted-foreground mt-1">Manage your business operations instantly</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">New Booking</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">Broadcast</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">Verification</span>
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Today's Schedule + Peak Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Today's Schedule */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Today's Schedule</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                  {todaysBookings.length} bookings
                </span>
              </div>

              {todaysBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                  <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground italic">No bookings for today</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {todaysBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                      <div className="flex-shrink-0 text-center min-w-[60px]">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{b.slots?.[0] || b.slot}</p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{b.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{b.turfName} • ₹{b.price}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                        b.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {b.paymentStatus || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Peak Hours Heatmap */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="mb-6">
                <h3 className="font-display font-bold text-xl text-foreground">Peak Hours</h3>
                <p className="text-xs text-muted-foreground mt-1">Most popular booking slots across all turfs</p>
              </div>

              {peakHoursData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                  <Activity className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground italic">Not enough data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {peakHoursData.map(({ slot, count, intensity }) => (
                    <div key={slot} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-muted-foreground w-20 shrink-0 text-right">{slot}</span>
                      <div className="flex-1 h-7 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-xl transition-all duration-700 flex items-center justify-end pr-2"
                          style={{
                            width: `${Math.max(intensity * 100, 5)}%`,
                            background: `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`,
                          }}
                        >
                          <span className="text-[9px] font-black text-white/80">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Suggestion */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-foreground">Boost your visibility</h4>
                <p className="text-sm text-muted-foreground">Add high-quality photos to your turfs to increase rankings by up to 40%.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate("/owner/my-turfs")}
              className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center gap-2 group whitespace-nowrap"
            >
              Manage Photos <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </main>
      )}

      {showSettings && (
        <ProfileSettingsModal 
          user={user} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
}
