import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import {
  Plus, LayoutDashboard, TrendingUp, Users, Calendar, IndianRupee,
  ArrowRight, ChevronRight, Clock, CheckCircle2, AlertCircle, Activity,
  Star, MessageSquare, ShieldCheck, Settings, Download, Trophy, Target
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { getOwnerTurfs, subscribeToOwnerBookings, getTurfReviews } from "../../services/firebase/turfService";
import ProfileSettingsModal from "../../components/owner/ProfileSettingsModal";
import ManualBookingModal from "../../components/owner/ManualBookingModal";
import BroadcastModal from "../../components/owner/BroadcastModal";
import VerificationModal from "../../components/owner/VerificationModal";

const COLORS = ["#10b981","#6366f1","#f59e0b","#8b5cf6","#ec4899","#14b8a6"];

const ChartTip = ({ active, payload, label, prefix="" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
      <p className="text-white/50 text-xs font-semibold mb-2">{label}</p>
      {payload.map((p,i) => (
        <p key={i} className="text-sm font-bold" style={{color:p.color||"#10b981"}}>
          {prefix}{typeof p.value==="number" ? p.value.toLocaleString("en-IN") : p.value}
        </p>
      ))}
    </div>
  );
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const ref = useScrollReveal();
  const { user } = useAuth();

  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");
  const [sortField, setSortField] = useState("revenue");

  const [showManualBooking, setShowManualBooking] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchTurfsAndReviews = async () => {
      try {
        const ownerTurfs = await getOwnerTurfs(user.uid);
        setTurfs(ownerTurfs);
        if (ownerTurfs.length > 0) {
          const nested = await Promise.all(ownerTurfs.map(t => getTurfReviews(t.id)));
          const flat = nested.flat().sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
          setReviews(flat);
        }
      } catch (e) { console.error(e); }
    };
    fetchTurfsAndReviews();
    const unsub = subscribeToOwnerBookings(user.uid, (b) => {
      setBookings(b.sort((a,b) => {
        const ta = a.createdAt?.seconds ? a.createdAt.seconds*1000 : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
        const tb2 = b.createdAt?.seconds ? b.createdAt.seconds*1000 : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
        return tb2-ta;
      }));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const today = new Date().toISOString().split("T")[0];

  // ─── KPIs ───────────────────────────────────────────────────────────────────
  const totalRevenue    = useMemo(() => bookings.reduce((s,b)=>s+(b.price||0),0), [bookings]);
  const uniqueCustomers = useMemo(() => new Set(bookings.map(b=>b.userUid)).size, [bookings]);
  const avgRatingGlobal = useMemo(() => {
    if (!reviews.length) return "0.0";
    return (reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1);
  }, [reviews]);

  const stats = [
    { label:"Total Revenue",   value:`₹${totalRevenue.toLocaleString("en-IN")}`, icon:IndianRupee, trend:"+12.5%", color:"from-emerald-500/20 to-emerald-500/0", ic:"text-emerald-500" },
    { label:"Total Bookings",  value:bookings.length.toString(),                  icon:Calendar,    trend:"+8.2%",  color:"from-blue-500/20 to-blue-500/0",    ic:"text-blue-500"    },
    { label:"Active Turfs",    value:turfs.length.toString(),                     icon:Activity,    trend:"0%",     color:"from-amber-500/20 to-amber-500/0",  ic:"text-amber-500"   },
    { label:"Customers",       value:uniqueCustomers.toString(),                  icon:Users,       trend:"+5.4%",  color:"from-primary/20 to-primary/0",      ic:"text-primary"     },
    { label:"Avg Rating",      value:avgRatingGlobal,                             icon:Star,        trend:"Top 5%", color:"from-accent/20 to-accent/0",        ic:"text-accent"      },
  ];

  // ─── Revenue Trend ──────────────────────────────────────────────────────────
  const revenueTrendData = useMemo(() => {
    const now = new Date();
    const days = timeRange==="7d"?7:timeRange==="30d"?30:90;
    const map = {};
    for (let i=days-1;i>=0;i--) {
      const d=new Date(now); d.setDate(d.getDate()-i);
      const key=d.toISOString().split("T")[0];
      const label=timeRange==="7d"?["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]:`${d.getDate()}/${d.getMonth()+1}`;
      map[key]={name:label,revenue:0};
    }
    bookings.forEach(b=>{ if(map[b.date]) map[b.date].revenue+=b.price||0; });
    return Object.values(map);
  }, [bookings, timeRange]);

  // ─── Monthly Revenue ────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now=new Date(); const months=[];
    for (let i=5;i>=0;i--) {
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      months.push({name:d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"}),key,revenue:0,bookings:0});
    }
    bookings.forEach(b=>{ if(!b.date) return; const m=months.find(m=>m.key===b.date.substring(0,7)); if(m){m.revenue+=b.price||0;m.bookings+=1;} });
    return months;
  }, [bookings]);

  // ─── Revenue by Turf ────────────────────────────────────────────────────────
  const revenueByTurf = useMemo(() => {
    const map={};
    bookings.forEach(b=>{ const n=b.turfName||"Unknown"; if(!map[n]) map[n]={name:n,revenue:0}; map[n].revenue+=b.price||0; });
    return Object.values(map).sort((a,b)=>b.revenue-a.revenue);
  }, [bookings]);

  // ─── Payment Donut ──────────────────────────────────────────────────────────
  const donutData = useMemo(() => {
    const paid=bookings.filter(b=>b.paymentStatus==="paid").length;
    const pending=bookings.length-paid;
    return [{name:"Paid",value:paid,color:"#10b981"},{name:"Pending",value:pending,color:"#f59e0b"}].filter(d=>d.value>0);
  }, [bookings]);

  // ─── Today's Bookings ───────────────────────────────────────────────────────
  const todaysBookings = useMemo(() =>
    bookings.filter(b=>b.date===today).sort((a,b)=>((a.slots?.[0]||a.slot||"")).localeCompare((b.slots?.[0]||b.slot||""))),
  [bookings, today]);

  // ─── Day of Week ────────────────────────────────────────────────────────────
  const dowData = useMemo(() => {
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; const c=Array(7).fill(0);
    bookings.forEach(b=>{ if(b.date) c[new Date(b.date).getDay()]++; });
    return days.map((name,i)=>({name,bookings:c[i]}));
  }, [bookings]);

  // ─── Peak Hours ─────────────────────────────────────────────────────────────
  const peakHoursData = useMemo(() => {
    const sc={};
    bookings.forEach(b=>{ (b.slots||(b.slot?[b.slot]:[])).forEach(s=>{ sc[s]=(sc[s]||0)+1; }); });
    const max=Math.max(...Object.values(sc),1);
    return Object.entries(sc).map(([slot,count])=>({slot,count,intensity:count/max})).sort((a,b)=>b.count-a.count).slice(0,10);
  }, [bookings]);

  // ─── Cumulative Growth ──────────────────────────────────────────────────────
  const cumulativeData = useMemo(() => {
    const sorted=[...bookings].filter(b=>b.date).sort((a,b)=>a.date.localeCompare(b.date));
    let c=0; const map={};
    sorted.forEach(b=>{ c++; map[b.date]={date:b.date,total:c}; });
    return Object.values(map).slice(-30);
  }, [bookings]);

  // ─── Turf Performance ───────────────────────────────────────────────────────
  const turfPerf = useMemo(() => turfs.map(turf=>{
    const tb=bookings.filter(b=>b.turfId===turf.id);
    const tr=reviews.filter(r=>r.turfId===turf.id);
    const rev=tb.reduce((s,b)=>s+(b.price||0),0);
    const avg=tr.length?(tr.reduce((s,r)=>s+r.rating,0)/tr.length).toFixed(1):"—";
    return {id:turf.id,name:turf.turfName||"Unnamed",bookings:tb.length,revenue:rev,avgRating:avg,reviews:tr.length};
  }).sort((a,b)=>sortField==="bookings"?b.bookings-a.bookings:sortField==="rating"?parseFloat(b.avgRating)-parseFloat(a.avgRating):b.revenue-a.revenue),
  [turfs,bookings,reviews,sortField]);

  // ─── Rating Distribution ────────────────────────────────────────────────────
  const ratingDist = useMemo(() =>
    [5,4,3,2,1].map(star=>({star:`${star}★`,count:reviews.filter(r=>r.rating===star).length})),
  [reviews]);

  // ─── Top Customers ──────────────────────────────────────────────────────────
  const topCustomers = useMemo(() => {
    const map={};
    bookings.forEach(b=>{ if(!b.userUid) return; if(!map[b.userUid]) map[b.userUid]={name:b.userName||"Unknown",bookings:0,spent:0}; map[b.userUid].bookings++; map[b.userUid].spent+=b.price||0; });
    return Object.values(map).sort((a,b)=>b.spent-a.spent).slice(0,5);
  }, [bookings]);

  // ─── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const h=["Date","Turf","Customer","Slots","Price","Status"];
    const r=bookings.map(b=>[b.date||"",b.turfName||"",b.userName||"",(b.slots||(b.slot?[b.slot]:[])).join("|"),b.price||0,b.paymentStatus||"pending"]);
    const csv=[h,...r].map(row=>row.map(c=>`"${c}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;"});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement("a"),{href:url,download:`turf_${today}.csv`});
    a.click(); URL.revokeObjectURL(url);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
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
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10 space-y-10">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="scroll-reveal">
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-2 flex items-center gap-3">
                Dashboard <LayoutDashboard className="w-8 h-8 text-primary" />
              </h1>
              <p className="text-muted-foreground text-base max-w-md italic font-medium">
                Welcome back, {user?.displayName || "Partner"}. Here's everything at a glance.
              </p>
            </div>
            <div className="flex items-center gap-3 scroll-reveal flex-wrap">
              <button onClick={exportCSV} className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-foreground font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" /> Export CSV
              </button>
              <Link to="/owner/my-turfs" className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-foreground font-bold hover:bg-white/10 transition-all">My Turfs</Link>
              <button onClick={() => navigate("/owner/add-turf")} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <Plus className="w-5 h-5" /> Add New Turf
              </button>
            </div>
          </div>

          {/* ── Stats Grid ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {stats.map((s,i) => (
              <div key={s.label} className={`scroll-reveal stagger-${i+1} glass-card p-6 rounded-3xl border border-white/10 group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden relative`}>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.color} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                <div className="flex items-start justify-between relative z-10">
                  <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${s.ic}`}><s.icon className="w-6 h-6" /></div>
                  <span className="text-[10px] font-black font-mono px-2 py-1 rounded-full bg-primary/10 text-primary">{s.trend}</span>
                </div>
                <div className="mt-4 relative z-10">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <h3 className="text-3xl font-display font-bold text-foreground mt-1 group-hover:tracking-tight transition-all duration-500">{s.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* ── Revenue Trend + Payment Donut ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Revenue Insights</h3>
                  <p className="text-xs text-muted-foreground mt-1">Earnings over selected period</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                    {["7d","30d","3m"].map(r => (
                      <button key={r} onClick={()=>setTimeRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange===r?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>{r}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Live
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:12}} dx={-10} tickFormatter={v=>`₹${v}`} />
                    <Tooltip content={<ChartTip prefix="₹" />} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
              <h3 className="font-display font-bold text-xl text-foreground">Payment Status</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Paid vs Pending split</p>
              {donutData.length > 0 ? (
                <>
                  <div className="flex-1 min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                          {donutData.map((e,i)=><Cell key={i} fill={e.color} stroke="transparent"/>)}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor:"rgba(15,23,42,0.95)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#fff"}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2">
                    {donutData.map((d,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.color}}/>
                        <span className="text-xs font-semibold text-muted-foreground">{d.name}: <span className="text-foreground font-bold">{d.value}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 opacity-50">
                  <Activity className="w-10 h-10 text-muted-foreground mb-3"/>
                  <p className="text-sm italic text-muted-foreground">No booking data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly Revenue + Revenue by Turf ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Monthly Revenue</h3>
              <p className="text-xs text-muted-foreground mb-6">Last 6 months earnings comparison</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barSize={36}>
                    <defs><linearGradient id="mBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:12}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:12}} tickFormatter={v=>`₹${v}`}/>
                    <Tooltip content={<ChartTip prefix="₹"/>}/>
                    <Bar dataKey="revenue" fill="url(#mBar)" radius={[8,8,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Revenue by Turf</h3>
              <p className="text-xs text-muted-foreground mb-6">Which turf earns the most</p>
              {revenueByTurf.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByTurf} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)"/>
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:11}} tickFormatter={v=>`₹${v}`}/>
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.5)",fontSize:11}} width={100}/>
                      <Tooltip content={<ChartTip prefix="₹"/>}/>
                      <Bar dataKey="revenue" radius={[0,8,8,0]}>{revenueByTurf.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="flex flex-col items-center py-12 opacity-50"><Activity className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm italic text-muted-foreground">No data yet</p></div>}
            </div>
          </div>

          {/* ── Today's Schedule + Notice Board ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Today's Schedule</h3>
                  <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">{todaysBookings.length} bookings</span>
              </div>
              {todaysBookings.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center opacity-50"><Calendar className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm text-muted-foreground italic">No bookings for today</p></div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {todaysBookings.map(b => (
                    <div key={b.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                      <div className="flex-shrink-0 text-center min-w-[60px]"><p className="text-[10px] font-black text-primary uppercase tracking-widest">{b.slots?.[0]||b.slot}</p></div>
                      <div className="w-px h-8 bg-white/10"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{b.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{b.turfName} • ₹{b.price}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${b.paymentStatus==="paid"?"bg-emerald-500/10 text-emerald-500":"bg-amber-500/10 text-amber-500"}`}>{b.paymentStatus||"Pending"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-2 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div><h3 className="font-display font-bold text-xl text-foreground">Notice Board</h3><p className="text-xs text-muted-foreground mt-1">Real-time booking notifications</p></div>
                <Link to="/owner/bookings" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group">View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"/></Link>
              </div>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {bookings.length > 0 ? bookings.slice(0,5).map(bk => (
                  <div key={bk.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">{bk.userName?.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{bk.userName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5"><Clock className="w-3 h-3"/>{bk.date} • {bk.slots?.[0]}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 mb-1 ${bk.paymentStatus==="paid"?"bg-emerald-500/10 text-emerald-500":"bg-amber-500/10 text-amber-500"}`}>
                        {bk.paymentStatus==="paid"?<CheckCircle2 className="w-2.5 h-2.5"/>:<AlertCircle className="w-2.5 h-2.5"/>}{bk.paymentStatus||"Pending"}
                      </span>
                      <p className="text-xs font-black text-foreground">₹{bk.price}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center py-10 text-center opacity-50"><Activity className="w-10 h-10 text-muted-foreground mb-4"/><p className="text-sm font-medium italic">No recent activity.</p></div>
                )}
              </div>
            </div>
          </div>

          {/* ── Busiest Days + Peak Hours ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Busiest Days</h3>
              <p className="text-xs text-muted-foreground mb-6">Booking frequency per day of the week</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dowData} barSize={34}>
                    <defs><linearGradient id="dayG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:12}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.4)",fontSize:12}} allowDecimals={false}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Bar dataKey="bookings" fill="url(#dayG)" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Peak Hours</h3>
              <p className="text-xs text-muted-foreground mb-6">Most popular booking slots across all turfs</p>
              {peakHoursData.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center opacity-50"><Activity className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm text-muted-foreground italic">Not enough data yet</p></div>
              ) : (
                <div className="space-y-3">
                  {peakHoursData.map(({slot,count,intensity}) => (
                    <div key={slot} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-muted-foreground w-20 shrink-0 text-right">{slot}</span>
                      <div className="flex-1 h-7 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div className="h-full rounded-xl transition-all duration-700 flex items-center justify-end pr-2" style={{width:`${Math.max(intensity*100,5)}%`,background:`rgba(16,185,129,${0.2+intensity*0.8})`}}>
                          <span className="text-[9px] font-black text-white/80">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Booking Growth ───────────────────────────────────────────────── */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
            <h3 className="font-display font-bold text-xl text-foreground mb-1">Booking Growth</h3>
            <p className="text-xs text-muted-foreground mb-6">Cumulative total bookings over time</p>
            {cumulativeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <defs><linearGradient id="cumG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.35)",fontSize:11}} allowDecimals={false}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#cumG)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="flex flex-col items-center py-10 opacity-50"><TrendingUp className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm italic text-muted-foreground">No booking history yet</p></div>}
          </div>

          {/* ── Turf Performance Table ───────────────────────────────────────── */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 overflow-x-auto">
            <div className="mb-6">
              <h3 className="font-display font-bold text-xl text-foreground">Turf Performance</h3>
              <p className="text-xs text-muted-foreground mt-1">Click column headers to sort</p>
            </div>
            {turfPerf.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Turf Name</th>
                    {[{label:"Bookings",field:"bookings"},{label:"Revenue",field:"revenue"},{label:"Rating",field:"rating"}].map(({label,field})=>(
                      <th key={field} onClick={()=>setSortField(field)} className="text-right py-3 text-[10px] uppercase tracking-widest font-bold cursor-pointer select-none">
                        <span className={sortField===field?"text-primary":"text-muted-foreground hover:text-foreground"}>{label} ↕</span>
                      </th>
                    ))}
                    <th className="text-right py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {turfPerf.map((t,i)=>(
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-3"><div className="flex items-center gap-3"><span className="text-xs font-black text-muted-foreground w-5">{i+1}</span><span className="font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</span></div></td>
                      <td className="py-3 text-right font-semibold text-foreground">{t.bookings}</td>
                      <td className="py-3 text-right font-bold text-emerald-400">₹{t.revenue.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right"><span className="flex items-center justify-end gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/><span className="font-bold text-amber-400">{t.avgRating}</span></span></td>
                      <td className="py-3 text-right text-muted-foreground">{t.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="flex flex-col items-center py-10 opacity-50"><Activity className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm italic text-muted-foreground">No turf data yet</p></div>}
          </div>

          {/* ── Reviews + Rating Distribution + Top Customers ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Reviews */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div><h3 className="font-display font-bold text-xl text-foreground">Recent Reviews</h3><p className="text-xs text-muted-foreground mt-1">What players are saying</p></div>
                <div className="flex items-center gap-1 text-accent"><Star className="w-4 h-4 fill-accent"/><span className="text-sm font-bold">{avgRatingGlobal}</span></div>
              </div>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {reviews.length > 0 ? reviews.map(rv=>(
                  <div key={rv.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">{(rv.userName||"?").charAt(0).toUpperCase()}</div>
                        <div><span className="text-sm font-bold text-foreground block">{rv.userName||"Anonymous"}</span><span className="text-[10px] text-muted-foreground block truncate max-w-[120px]">{rv.turfName||"Turf"}</span></div>
                      </div>
                      <div className="flex gap-0.5 mt-1">{[...Array(5)].map((_,i)=><Star key={i} className={`w-3 h-3 ${i<rv.rating?"fill-accent text-accent":"text-muted-foreground/30"}`}/>)}</div>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-3">"{rv.comment}"</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">{rv.createdAt?.seconds?new Date(rv.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Recently"}</p>
                  </div>
                )) : <div className="flex flex-col items-center py-10 text-center opacity-50"><MessageSquare className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm text-muted-foreground italic">No reviews yet</p></div>}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Rating Distribution</h3>
              <p className="text-xs text-muted-foreground mb-6">Breakdown by star rating</p>
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {ratingDist.map(({star,count},i)=>{
                    const pct=reviews.length?(count/reviews.length)*100:0;
                    const sc=["#10b981","#6ee7b7","#fbbf24","#f97316","#ef4444"];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-8 shrink-0">{star}</span>
                        <div className="flex-1 h-7 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                          <div className="h-full rounded-xl flex items-center justify-end pr-2 transition-all duration-700" style={{width:`${Math.max(pct,4)}%`,background:`${sc[i]}60`}}>
                            <span className="text-[9px] font-black text-white/80">{count}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="flex flex-col items-center py-12 opacity-50"><Star className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm italic text-muted-foreground">No reviews yet</p></div>}
            </div>

            {/* Top Customers */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center gap-2.5 mb-1"><Trophy className="w-5 h-5 text-amber-400"/><h3 className="font-display font-bold text-xl text-foreground">Top Customers</h3></div>
              <p className="text-xs text-muted-foreground mb-6">Your highest-value regulars</p>
              {topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {topCustomers.map((c,i)=>{
                    const medals=["🥇","🥈","🥉"];
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                        <span className="text-lg w-7 text-center">{medals[i]||`#${i+1}`}</span>
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-bold text-foreground truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.bookings} bookings</p></div>
                        <span className="text-sm font-black text-emerald-400 shrink-0">₹{c.spent.toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="flex flex-col items-center py-12 opacity-50"><Users className="w-10 h-10 text-muted-foreground mb-3"/><p className="text-sm italic text-muted-foreground">No customers yet</p></div>}
            </div>
          </div>

          {/* ── Quick Actions ────────────────────────────────────────────────── */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10">
            <div className="mb-8"><h3 className="font-display font-bold text-xl text-foreground">Quick Actions</h3><p className="text-xs text-muted-foreground mt-1">Manage your business operations instantly</p></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button onClick={() => setShowManualBooking(true)} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all group">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform"><Plus className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-foreground">New Booking</span>
              </button>
              <button onClick={() => setShowBroadcast(true)} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all group">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground group-hover:scale-110 transition-transform"><MessageSquare className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-foreground">Broadcast</span>
              </button>
              <button onClick={() => setShowVerification(true)} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform"><ShieldCheck className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-foreground">Verification</span>
              </button>
              <button onClick={()=>setShowSettings(true)} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform"><Settings className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-foreground">Settings</span>
              </button>
            </div>
          </div>

          {/* ── Action Suggestion ────────────────────────────────────────────── */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30"><TrendingUp className="w-6 h-6"/></div>
              <div>
                <h4 className="font-display font-bold text-lg text-foreground">Boost your visibility</h4>
                <p className="text-sm text-muted-foreground">Add high-quality photos to your turfs to increase rankings by up to 40%.</p>
              </div>
            </div>
            <button onClick={()=>navigate("/owner/my-turfs")} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center gap-2 group whitespace-nowrap">
              Manage Photos <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </button>
          </div>
        </main>
      )}

      {showSettings && <ProfileSettingsModal user={user} onClose={()=>setShowSettings(false)}/>}
      {showManualBooking && <ManualBookingModal user={user} onClose={()=>setShowManualBooking(false)}/>}
      {showBroadcast && <BroadcastModal user={user} onClose={()=>setShowBroadcast(false)}/>}
      {showVerification && <VerificationModal user={user} onClose={()=>setShowVerification(false)}/>}
    </div>
  );
}
