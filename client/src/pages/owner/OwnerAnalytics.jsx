import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import { useAuth } from "../../context/AuthContext";
import {
  getOwnerTurfs,
  subscribeToOwnerBookings,
  getTurfReviews,
} from "../../services/firebase/turfService";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  Users,
  Star,
  Download,
  ArrowLeft,
  BarChart2,
  Activity,
  Clock,
  Target,
  Trophy,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CHART_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

const COLOR_MAP = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20"    },
  purple:  { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20"  },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"   },
  pink:    { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20"    },
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
      <p className="text-white/50 text-xs font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color || "#10b981" }}>
          {prefix}
          {typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 opacity-40">
    <Icon className="w-10 h-10 text-muted-foreground mb-3" />
    <p className="text-sm italic text-muted-foreground">{message}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OwnerAnalytics() {
  const { user } = useAuth();

  const [activeTab, setActiveTab]   = useState("overview");
  const [timeRange, setTimeRange]   = useState("7d");
  const [sortField, setSortField]   = useState("revenue");
  const [bookings,  setBookings]    = useState([]);
  const [turfs,     setTurfs]       = useState([]);
  const [reviews,   setReviews]     = useState([]);
  const [loading,   setLoading]     = useState(true);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchStaticData = async () => {
      try {
        const ownerTurfs = await getOwnerTurfs(user.uid);
        setTurfs(ownerTurfs);
        if (ownerTurfs.length > 0) {
          const nested = await Promise.all(ownerTurfs.map((t) => getTurfReviews(t.id)));
          setReviews(nested.flat());
        }
      } catch (e) {
        console.error("Analytics fetch error:", e);
      }
    };

    fetchStaticData();

    const unsub = subscribeToOwnerBookings(user.uid, (b) => {
      setBookings(b);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalRevenue     = useMemo(() => bookings.reduce((s, b) => s + (b.price || 0), 0), [bookings]);
  const totalBookings    = bookings.length;
  const avgBookingValue  = totalBookings ? Math.round(totalRevenue / totalBookings) : 0;
  const uniqueCustomers  = useMemo(() => new Set(bookings.map((b) => b.userUid)).size, [bookings]);
  const avgRating        = useMemo(() => {
    if (!reviews.length) return "0.0";
    return (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  // ── Revenue Trend (time-range aware) ─────────────────────────────────────────
  const revenueTrendData = useMemo(() => {
    const today = new Date();
    const days  = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const map   = {};

    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label =
        timeRange === "7d"
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]
          : `${d.getDate()}/${d.getMonth() + 1}`;
      map[key] = { name: label, revenue: 0, bookings: 0 };
    }

    bookings.forEach((b) => {
      if (map[b.date]) {
        map[b.date].revenue  += b.price || 0;
        map[b.date].bookings += 1;
      }
    });

    return Object.values(map);
  }, [bookings, timeRange]);

  // ── Monthly Revenue (last 6 months) ──────────────────────────────────────────
  const monthlyRevenueData = useMemo(() => {
    const today  = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d   = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        name:     d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        key,
        revenue:  0,
        bookings: 0,
      });
    }

    bookings.forEach((b) => {
      if (!b.date) return;
      const monthKey = b.date.substring(0, 7);
      const m        = months.find((m) => m.key === monthKey);
      if (m) {
        m.revenue  += b.price || 0;
        m.bookings += 1;
      }
    });

    return months;
  }, [bookings]);

  // ── Revenue by Turf ───────────────────────────────────────────────────────────
  const revenueByTurf = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const name = b.turfName || "Unknown";
      if (!map[name]) map[name] = { name, revenue: 0, bookings: 0 };
      map[name].revenue  += b.price || 0;
      map[name].bookings += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // ── Booking Status Donut ──────────────────────────────────────────────────────
  const bookingStatusData = useMemo(() => {
    const paid    = bookings.filter((b) => b.paymentStatus === "paid").length;
    const pending = bookings.length - paid;
    return [
      { name: "Paid",    value: paid,    color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [bookings]);

  // ── Day-of-Week Distribution ──────────────────────────────────────────────────
  const dayOfWeekData = useMemo(() => {
    const days   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array(7).fill(0);
    bookings.forEach((b) => {
      if (!b.date) return;
      counts[new Date(b.date).getDay()]++;
    });
    return days.map((name, i) => ({ name, bookings: counts[i] }));
  }, [bookings]);

  // ── Peak Time Slots ───────────────────────────────────────────────────────────
  const peakSlotsData = useMemo(() => {
    const slotCount = {};
    bookings.forEach((b) => {
      const slots = b.slots || (b.slot ? [b.slot] : []);
      slots.forEach((s) => {
        slotCount[s] = (slotCount[s] || 0) + 1;
      });
    });
    return Object.entries(slotCount)
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bookings]);

  // ── Cumulative Booking Growth ─────────────────────────────────────────────────
  const cumulativeData = useMemo(() => {
    const sorted = [...bookings]
      .filter((b) => b.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    const map = {};
    sorted.forEach((b) => {
      cum++;
      map[b.date] = { date: b.date, total: cum };
    });
    return Object.values(map).slice(-30);
  }, [bookings]);

  // ── Per-Turf Performance Table ────────────────────────────────────────────────
  const turfPerformance = useMemo(() => {
    return turfs
      .map((turf) => {
        const tb  = bookings.filter((b) => b.turfId === turf.id);
        const tr  = reviews.filter((r) => r.turfId === turf.id);
        const rev = tb.reduce((s, b) => s + (b.price || 0), 0);
        const avg = tr.length
          ? (tr.reduce((s, r) => s + r.rating, 0) / tr.length).toFixed(1)
          : "—";
        return {
          id: turf.id,
          name: turf.turfName || "Unnamed",
          bookings: tb.length,
          revenue: rev,
          avgRating: avg,
          reviews: tr.length,
        };
      })
      .sort((a, b) => {
        if (sortField === "bookings") return b.bookings - a.bookings;
        if (sortField === "rating")   return parseFloat(b.avgRating) - parseFloat(a.avgRating);
        return b.revenue - a.revenue;
      });
  }, [turfs, bookings, reviews, sortField]);

  // ── Rating Distribution ───────────────────────────────────────────────────────
  const ratingDistribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((star) => ({
        star:  `${star}★`,
        count: reviews.filter((r) => r.rating === star).length,
      })),
    [reviews]
  );

  // ── Top Customers ─────────────────────────────────────────────────────────────
  const topCustomers = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (!b.userUid) return;
      if (!map[b.userUid]) map[b.userUid] = { name: b.userName || "Unknown", bookings: 0, spent: 0 };
      map[b.userUid].bookings++;
      map[b.userUid].spent += b.price || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [bookings]);

  // ── CSV Export ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Date", "Turf", "Customer", "Slots", "Price (Rs)", "Payment Status"];
    const rows    = bookings.map((b) => [
      b.date             || "",
      b.turfName         || "",
      b.userName         || "",
      (b.slots || (b.slot ? [b.slot] : [])).join(" | "),
      b.price            || 0,
      b.paymentStatus    || "pending",
    ]);
    const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `turf_analytics_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Tab config ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview",  label: "Overview",        icon: BarChart2    },
    { id: "revenue",   label: "Revenue",          icon: IndianRupee  },
    { id: "bookings",  label: "Bookings",         icon: Calendar     },
    { id: "turfs",     label: "Turfs & Reviews",  icon: Star         },
  ];

  const KPIS = [
    { label: "Total Revenue",    value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "emerald", sub: "All time"              },
    { label: "Total Bookings",   value: totalBookings,                               icon: Calendar,    color: "blue",    sub: `${uniqueCustomers} customers` },
    { label: "Avg Booking Value",value: `₹${avgBookingValue.toLocaleString("en-IN")}`,icon: Target,    color: "purple",  sub: "Per booking"           },
    { label: "Unique Customers", value: uniqueCustomers,                             icon: Users,       color: "amber",   sub: "All time"              },
    { label: "Avg Rating",       value: avgRating,                                   icon: Star,        color: "pink",    sub: `${reviews.length} reviews` },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5  blur-[120px]" />
        <div className="absolute top-[40%] -left-[5%]  w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      <Navbar />

      {loading ? (
        <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center relative z-10">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin mb-6" />
          <p className="text-foreground/60 font-medium animate-pulse">Crunching your numbers…</p>
        </div>
      ) : (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
            <div>
              <Link
                to="/owner/dashboard"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
              </Link>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground flex items-center gap-3">
                Analytics <BarChart2 className="w-8 h-8 text-primary" />
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Deep insights into every dimension of your business.
              </p>
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* ── Tab Bar ─────────────────────────────────────────────────── */}
          <div className="flex gap-1.5 mb-8 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit max-w-full overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1 — OVERVIEW
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-8">

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {KPIS.map((kpi, i) => {
                  const c = COLOR_MAP[kpi.color];
                  return (
                    <div
                      key={i}
                      className={`glass-card p-5 rounded-3xl border ${c.border} hover:shadow-xl hover:-translate-y-0.5 transition-all group`}
                    >
                      <div className={`w-10 h-10 rounded-2xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <kpi.icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                      <h3 className="text-2xl font-bold text-foreground mt-1">{kpi.value}</h3>
                      <p className={`text-[10px] font-semibold mt-1 ${c.text}`}>{kpi.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Revenue Trend + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue Trend */}
                <div className="lg:col-span-2 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-display font-bold text-xl text-foreground">Revenue Trend</h3>
                      <p className="text-xs text-muted-foreground mt-1">Earnings over selected period</p>
                    </div>
                    <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                      {["7d", "30d", "3m"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimeRange(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            timeRange === r
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData}>
                        <defs>
                          <linearGradient id="revGradOv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip content={<CustomTooltip prefix="₹" />} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#revGradOv)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Payment Status Donut */}
                <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
                  <h3 className="font-display font-bold text-xl text-foreground">Payment Status</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Paid vs Pending split</p>

                  {bookingStatusData.length > 0 ? (
                    <>
                      <div className="flex-1 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bookingStatusData}
                              cx="50%" cy="50%"
                              innerRadius={58} outerRadius={82}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {bookingStatusData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} stroke="transparent" />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(15,23,42,0.95)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                color: "#fff",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-3">
                        {bookingStatusData.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {d.name}: <span className="text-foreground font-bold">{d.value}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState icon={Activity} message="No booking data yet" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2 — REVENUE
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "revenue" && (
            <div className="space-y-6">

              {/* Monthly Revenue Bar Chart */}
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-display font-bold text-xl text-foreground">Monthly Revenue</h3>
                    <p className="text-xs text-muted-foreground mt-1">Last 6 months earnings comparison</p>
                  </div>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenueData} barSize={40}>
                      <defs>
                        <linearGradient id="monthBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip content={<CustomTooltip prefix="₹" />} />
                      <Bar dataKey="revenue" fill="url(#monthBarGrad)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue by Turf */}
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                <h3 className="font-display font-bold text-xl text-foreground mb-1">Revenue by Turf</h3>
                <p className="text-xs text-muted-foreground mb-6">Which turf earns the most</p>

                {revenueByTurf.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByTurf} layout="vertical" barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={110} />
                        <Tooltip content={<CustomTooltip prefix="₹" />} />
                        <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                          {revenueByTurf.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={IndianRupee} message="No revenue data yet" />
                )}
              </div>

              {/* Monthly Summary Table */}
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 overflow-x-auto">
                <h3 className="font-display font-bold text-xl text-foreground mb-6">Monthly Summary Table</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Month", "Bookings", "Revenue", "Avg / Booking"].map((h) => (
                        <th key={h} className={`py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${h === "Month" ? "text-left" : "text-right"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRevenueData.map((m, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 font-semibold text-foreground">{m.name}</td>
                        <td className="py-3 text-right text-muted-foreground">{m.bookings}</td>
                        <td className="py-3 text-right font-bold text-emerald-400">₹{m.revenue.toLocaleString("en-IN")}</td>
                        <td className="py-3 text-right text-muted-foreground">
                          {m.bookings ? `₹${Math.round(m.revenue / m.bookings).toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3 — BOOKINGS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "bookings" && (
            <div className="space-y-6">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Day-of-Week Bar Chart */}
                <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                  <h3 className="font-display font-bold text-xl text-foreground mb-1">Busiest Days</h3>
                  <p className="text-xs text-muted-foreground mb-6">Booking frequency per day of week</p>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dayOfWeekData} barSize={34}>
                        <defs>
                          <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="bookings" fill="url(#dayGrad)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Peak Time Slots */}
                <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                  <h3 className="font-display font-bold text-xl text-foreground mb-1">Peak Time Slots</h3>
                  <p className="text-xs text-muted-foreground mb-6">Most popular booking hours across all turfs</p>

                  {peakSlotsData.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {peakSlotsData.map(({ slot, count }, i) => {
                        const maxCount  = peakSlotsData[0]?.count || 1;
                        const intensity = count / maxCount;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-28 shrink-0 truncate">{slot}</span>
                            <div className="flex-1 h-7 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                              <div
                                className="h-full rounded-xl flex items-center justify-end pr-2 transition-all duration-700"
                                style={{
                                  width: `${Math.max(intensity * 100, 6)}%`,
                                  background: `rgba(99,102,241,${0.25 + intensity * 0.7})`,
                                }}
                              >
                                <span className="text-[9px] font-black text-white/80">{count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Clock} message="No slot data yet" />
                  )}
                </div>
              </div>

              {/* Cumulative Growth */}
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                <h3 className="font-display font-bold text-xl text-foreground mb-1">Booking Growth</h3>
                <p className="text-xs text-muted-foreground mb-6">Cumulative total bookings over time</p>

                {cumulativeData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeData}>
                        <defs>
                          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#cumGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={TrendingUp} message="No booking history yet" />
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 4 — TURFS & REVIEWS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "turfs" && (
            <div className="space-y-6">

              {/* Per-Turf Performance Table */}
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 overflow-x-auto">
                <div className="mb-6">
                  <h3 className="font-display font-bold text-xl text-foreground">Turf Performance</h3>
                  <p className="text-xs text-muted-foreground mt-1">Click column headers to sort the table</p>
                </div>

                {turfPerformance.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Turf Name
                        </th>
                        {[
                          { label: "Bookings", field: "bookings" },
                          { label: "Revenue",  field: "revenue"  },
                          { label: "Rating",   field: "rating"   },
                        ].map(({ label, field }) => (
                          <th
                            key={field}
                            onClick={() => setSortField(field)}
                            className="text-right py-3 text-[10px] uppercase tracking-widest font-bold cursor-pointer select-none"
                          >
                            <span className={sortField === field ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
                              {label} ↕
                            </span>
                          </th>
                        ))}
                        <th className="text-right py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Reviews
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {turfPerformance.map((t, i) => (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-muted-foreground w-5">{i + 1}</span>
                              <span className="font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right font-semibold text-foreground">{t.bookings}</td>
                          <td className="py-3 text-right font-bold text-emerald-400">₹{t.revenue.toLocaleString("en-IN")}</td>
                          <td className="py-3 text-right">
                            <span className="flex items-center justify-end gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-amber-400">{t.avgRating}</span>
                            </span>
                          </td>
                          <td className="py-3 text-right text-muted-foreground">{t.reviews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState icon={Activity} message="No turf data available yet" />
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Rating Distribution */}
                <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                  <h3 className="font-display font-bold text-xl text-foreground mb-1">Rating Distribution</h3>
                  <p className="text-xs text-muted-foreground mb-6">Breakdown of all player reviews by star rating</p>

                  {reviews.length > 0 ? (
                    <div className="space-y-3">
                      {ratingDistribution.map(({ star, count }, i) => {
                        const pct        = reviews.length ? (count / reviews.length) * 100 : 0;
                        const starColors = ["#10b981", "#6ee7b7", "#fbbf24", "#f97316", "#ef4444"];
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground w-8 shrink-0">{star}</span>
                            <div className="flex-1 h-7 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                              <div
                                className="h-full rounded-xl flex items-center justify-end pr-2 transition-all duration-700"
                                style={{ width: `${Math.max(pct, 4)}%`, background: `${starColors[i]}60` }}
                              >
                                <span className="text-[9px] font-black text-white/80">{count}</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(pct)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Star} message="No reviews received yet" />
                  )}
                </div>

                {/* Top Customers */}
                <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="font-display font-bold text-xl text-foreground">Top Customers</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">Your highest-value regulars, ranked by spend</p>

                  {topCustomers.length > 0 ? (
                    <div className="space-y-3">
                      {topCustomers.map((c, i) => {
                        const medals = ["🥇", "🥈", "🥉"];
                        return (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                            <span className="text-lg w-7 text-center">{medals[i] || `#${i + 1}`}</span>
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.bookings} booking{c.bookings !== 1 ? "s" : ""}</p>
                            </div>
                            <span className="text-sm font-black text-emerald-400 shrink-0">
                              ₹{c.spent.toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Users} message="No customer data yet" />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
