import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft,
  MapPin,
  User,
  MoreVertical,
  Download
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { subscribeToOwnerBookings, updateBookingPaymentStatus } from "../../services/firebase/turfService";
import { toast } from "sonner";

export default function OwnerBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useScrollReveal();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (!user) return;

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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.turfName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || booking.paymentStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleTogglePayment = async (bookingId, currentStatus) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    try {
      await updateBookingPaymentStatus(bookingId, newStatus);
      toast.success(`Payment marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }
    const headers = ["Booking ID", "Customer", "Turf", "Date", "Slots", "Duration (hr)", "Amount (₹)", "Payment Status"];
    const rows = filteredBookings.map(b => [
      b.customId || b.id.slice(0, 8),
      b.userName || "",
      b.turfName || "",
      b.date || "",
      (b.slots || [b.slot]).join(" | "),
      b.duration || 1,
      b.price || 0,
      b.paymentStatus || "pending",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `turf-bookings-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredBookings.length} bookings to CSV`);
  };

  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[5%] -right-[5%] w-[35%] h-[35%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-[15%] -left-[10%] w-[25%] h-[25%] rounded-full bg-accent/5 blur-[80px]" />
      </div>

      <Navbar />

      {loading ? (
        <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center relative z-10 text-center">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin mb-6" />
          <p className="text-foreground/60 font-medium animate-pulse">Fetching your booking records...</p>
        </div>
      ) : (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
          {/* Breadcrumb & Title */}
          <div className="mb-10">
            <Link 
              to="/owner/dashboard" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="scroll-reveal">
                <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-2">Booking Management</h1>
                <p className="text-muted-foreground text-base max-w-md italic font-medium">
                  Track appointments, manage slots, and verify payment records.
                </p>
              </div>
              <button 
                onClick={handleExportCSV}
                className="scroll-reveal px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-foreground font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="scroll-reveal stagger-1 flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search by customer name, turf, or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-11 pr-10 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer min-w-[160px]"
                >
                  <option value="all" className="bg-slate-900 border-none">All Status</option>
                  <option value="paid" className="bg-slate-900 border-none">Paid</option>
                  <option value="pending" className="bg-slate-900 border-none">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking, i) => (
                <div 
                  key={booking.id} 
                  className={`scroll-reveal stagger-${(i % 5) + 1} glass-card p-5 md:p-6 rounded-3xl border border-white/10 hover:border-primary/20 transition-all group overflow-hidden relative`}
                >
                  {/* Visual accent based on status */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    booking.paymentStatus === 'paid' ? 'bg-emerald-500/50' : 'bg-amber-500/50'
                  }`} />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* User Info */}
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                          <User className="w-5 h-5 opacity-60" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {booking.userName}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-tighter uppercase mt-1">
                            ID: {booking.customId || booking.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>

                      <div className="h-10 w-[1px] bg-white/5 hidden md:block" />

                      {/* Venue & Time */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground/90">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {booking.turfName}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Calendar className="w-3 h-3" />
                            {booking.date}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium border-l border-white/5 pl-4">
                            <Clock className="w-3 h-3" />
                            {booking.slots?.join(", ")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Status & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-white/5 pt-4 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Amount & Status</p>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-foreground">₹{booking.price}</span>
                          <button
                            onClick={() => handleTogglePayment(booking.id, booking.paymentStatus)}
                            title="Click to toggle payment status"
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              booking.paymentStatus === 'paid' 
                                ? 'bg-emerald-500/10 text-emerald-500 shadow-sm shadow-emerald-500/5 hover:bg-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 shadow-sm shadow-amber-500/5 hover:bg-amber-500/20'
                            }`}
                          >
                            {booking.paymentStatus === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {booking.paymentStatus || 'Pending'}
                          </button>
                        </div>
                      </div>
                      <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="scroll-reveal py-20 flex flex-col items-center justify-center glass-card rounded-3xl border border-white/10 bg-white/5 opacity-60">
                <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
                <p className="text-lg font-bold text-foreground/50">No matching bookings found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
                <button 
                  onClick={() => {setSearchTerm(""); setFilterStatus("all");}}
                  className="mt-6 text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
