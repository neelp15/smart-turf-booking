import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import {
  ChevronLeft, Edit3, Trash2, MapPin, IndianRupee, Star,
  Calendar, Clock, Users, TrendingUp, CheckCircle2, AlertCircle,
  MessageSquare, Activity, BarChart2, Shield
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import {
  getTurfById,
  subscribeToOwnerBookings,
  getTurfReviews,
  deleteTurf,
  updateBookingPaymentStatus
} from "../../services/firebase/turfService";
import { toast } from "sonner";

export default function OwnerTurfDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useScrollReveal();

  const [turf, setTurf] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings");

  useEffect(() => {
    if (!id) return;
    getTurfById(id)
      .then(setTurf)
      .catch(() => toast.error("Failed to load turf details"))
      .finally(() => setLoading(false));

    getTurfReviews(id)
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        );
        setReviews(sorted);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToOwnerBookings(user.uid, (all) => {
      const turfBookings = all
        .filter(b => b.turfId === id)
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setBookings(turfBookings);
    });
    return () => unsub();
  }, [user, id]);

  // --- Computed analytics ---
  const totalRevenue = useMemo(() => bookings.reduce((s, b) => s + (b.price || 0), 0), [bookings]);
  const uniqueCustomers = useMemo(() => new Set(bookings.map(b => b.userUid)).size, [bookings]);
  const avgRating = useMemo(() =>
    reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "N/A",
    [reviews]
  );
  const paidCount = useMemo(() => bookings.filter(b => b.paymentStatus === "paid").length, [bookings]);

  // Last 7 days revenue chart
  const chartData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      map[key] = { name: days[d.getDay()], revenue: 0 };
    }
    bookings.forEach(b => {
      if (map[b.date] !== undefined) map[b.date].revenue += b.price || 0;
    });
    return Object.values(map);
  }, [bookings]);

  // Peak slots
  const peakSlots = useMemo(() => {
    const count = {};
    bookings.forEach(b => {
      (b.slots || [b.slot]).filter(Boolean).forEach(s => {
        count[s] = (count[s] || 0) + 1;
      });
    });
    const max = Math.max(...Object.values(count), 1);
    return Object.entries(count)
      .map(([slot, c]) => ({ slot, count: c, intensity: c / max }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [bookings]);

  const handleDelete = async () => {
    if (!confirm("Permanently delete this turf? This action cannot be undone.")) return;
    try {
      await deleteTurf(id);
      toast.success("Turf deleted successfully");
      navigate("/owner/my-turfs");
    } catch {
      toast.error("Failed to delete turf");
    }
  };

  const handleTogglePayment = async (bookingId, current) => {
    const next = current === "paid" ? "pending" : "paid";
    try {
      await updateBookingPaymentStatus(bookingId, next);
      toast.success(`Payment marked as ${next}`);
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  const tabs = [
    { id: "bookings", label: "Bookings", icon: Calendar, count: bookings.length },
    { id: "analytics", label: "Analytics", icon: BarChart2, count: null },
    { id: "reviews", label: "Reviews", icon: MessageSquare, count: reviews.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-t-2 border-primary animate-spin" />
      </div>
    );
  }

  if (!turf) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <p>Turf not found.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[30%] -left-[5%] w-[25%] h-[25%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
        {/* Breadcrumb */}
        <Link
          to="/owner/my-turfs"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to My Turfs
        </Link>

        {/* Hero Card */}
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden mb-10">
          <div className="relative h-52 md:h-72">
            <img
              src={turf.images?.[0] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop"}
              alt={turf.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white uppercase tracking-widest mb-3 inline-block">
                  {turf.sport}
                </span>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-white">{turf.name || "Unnamed Turf"}</h1>
                <p className="flex items-center gap-1.5 text-white/70 mt-1">
                  <MapPin className="w-4 h-4" /> {turf.location || "No location provided"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/owner/edit-turf/${id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  <Edit3 className="w-4 h-4" /> Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-destructive/30 border border-destructive/40 text-white font-bold hover:bg-destructive/50 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-t border-white/10">
            {[
              { icon: IndianRupee, label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "text-emerald-400" },
              { icon: Calendar, label: "Total Bookings", value: bookings.length, color: "text-blue-400" },
              { icon: Users, label: "Unique Customers", value: uniqueCustomers, color: "text-amber-400" },
              { icon: Star, label: "Avg Rating", value: avgRating, color: "text-accent" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="p-5 md:p-6 text-center group hover:bg-white/5 transition-colors">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-2 opacity-80`} />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-display font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
          {tabs.map(({ id: tid, label, icon: Icon, count }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tid
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === tid ? "bg-white/20" : "bg-white/10"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* --- Bookings Tab --- */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <EmptyState icon={Calendar} message="No bookings for this turf yet" />
            ) : (
              bookings.map((b, i) => (
                <div
                  key={b.id}
                  className={`scroll-reveal stagger-${(i % 5) + 1} glass-card p-5 rounded-3xl border border-white/10 hover:border-primary/20 transition-all group`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm">
                        {b.userName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{b.userName}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">ID: {b.customId || b.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg">
                        <Calendar className="w-3.5 h-3.5" /> {b.date}
                      </span>
                      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg">
                        <Clock className="w-3.5 h-3.5" /> {(b.slots || [b.slot]).join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-foreground text-lg">₹{b.price}</span>
                      <button
                        onClick={() => handleTogglePayment(b.id, b.paymentStatus)}
                        title="Click to toggle"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95 ${
                          b.paymentStatus === "paid"
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        }`}
                      >
                        {b.paymentStatus === "paid" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {b.paymentStatus || "Pending"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- Analytics Tab --- */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Chart */}
            <div className="scroll-reveal glass-card p-6 md:p-8 rounded-3xl border border-white/10 h-[380px]">
              <div className="mb-6">
                <h3 className="font-display font-bold text-xl text-foreground">Revenue — Last 7 Days</h3>
                <p className="text-xs text-muted-foreground mt-1">Daily earnings for this turf</p>
              </div>
              <div className="h-full pb-14">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="turfRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} dx={-10} tickFormatter={v => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                      formatter={v => [`₹${v.toLocaleString()}`, "Revenue"]}
                      itemStyle={{ color: "#10b981", fontWeight: "bold" }}
                      cursor={{ stroke: "#10b981", strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#turfRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Slots Heatmap */}
            <div className="scroll-reveal glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="mb-6">
                <h3 className="font-display font-bold text-xl text-foreground">Peak Booking Slots</h3>
                <p className="text-xs text-muted-foreground mt-1">Most booked time slots for this turf</p>
              </div>
              {peakSlots.length === 0 ? (
                <EmptyState icon={BarChart2} message="No booking data available yet" />
              ) : (
                <div className="space-y-3">
                  {peakSlots.map(({ slot, count, intensity }) => (
                    <div key={slot} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-muted-foreground w-20 shrink-0 text-right">{slot}</span>
                      <div className="flex-1 h-7 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-xl flex items-center justify-end pr-2 transition-all duration-700"
                          style={{ width: `${Math.max(intensity * 100, 6)}%`, background: `rgba(16,185,129,${0.2 + intensity * 0.8})` }}
                        >
                          <span className="text-[9px] font-black text-white/80">{count}x</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Summary */}
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Paid</p>
                  <p className="text-2xl font-black text-emerald-400">{paidCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Pending</p>
                  <p className="text-2xl font-black text-amber-400">{bookings.length - paidCount}</p>
                </div>
              </div>
            </div>

            {/* Turf Info Card */}
            <div className="scroll-reveal lg:col-span-2 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <h3 className="font-display font-bold text-xl text-foreground mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Turf Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Price/hr", value: `₹${turf.pricePerHour || turf.price || "N/A"}` },
                  { label: "Sport", value: turf.sport || "N/A" },
                  { label: "Status", value: turf.status || "Listed" },
                  { label: "Available Slots", value: turf.availability?.length || turf.slots?.length || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">{label}</p>
                    <p className="text-lg font-black text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              {turf.amenities?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {turf.amenities.map(a => (
                      <span key={a} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-foreground">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {turf.description && (
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3">Description</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{turf.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Reviews Tab --- */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="scroll-reveal glass-card p-6 rounded-3xl border border-white/10 flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-display font-black text-accent">{avgRating}</p>
                <div className="flex gap-0.5 justify-center mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-white/20"}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const cnt = reviews.filter(r => r.rating === star).length;
                  const pct = reviews.length ? (cnt / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4">{star}</span>
                      <Star className="w-3 h-3 fill-accent text-accent shrink-0" />
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-5">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {reviews.length === 0 ? (
              <EmptyState icon={MessageSquare} message="No reviews yet for this turf" />
            ) : (
              reviews.map((r, i) => (
                <div key={r.id} className={`scroll-reveal stagger-${(i % 5) + 1} glass-card p-5 rounded-3xl border border-white/10`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm">
                        {(r.userName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{r.userName || "Anonymous"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.createdAt?.seconds
                            ? new Date(r.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "Recently"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "fill-accent text-accent" : "text-white/20"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed pl-13">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="scroll-reveal py-20 flex flex-col items-center justify-center glass-card rounded-3xl border border-dashed border-white/10 opacity-60">
      <Icon className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
      <p className="text-foreground/50 font-medium">{message}</p>
    </div>
  );
}
