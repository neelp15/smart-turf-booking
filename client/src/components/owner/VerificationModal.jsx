import { useState } from "react";
import { X, ShieldCheck, Search, Loader2, User, Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "sonner";

export default function VerificationModal({ user, onClose }) {
  const [bookingId, setBookingId] = useState("");
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState(null);
  const [updating, setUpdating] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!bookingId.trim()) return;

    setSearching(true);
    setBooking(null);
    try {
      // Searching by customId (like BK-1234)
      const q = query(
        collection(db, "bookings"), 
        where("ownerUid", "==", user.uid),
        where("customId", "==", bookingId.trim().toUpperCase())
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Fallback search by Firestore Doc ID
        const snap2 = await getDocs(query(collection(db, "bookings"), where("ownerUid", "==", user.uid)));
        const found = snap2.docs.find(d => d.id === bookingId.trim());
        if (found) {
          setBooking({ id: found.id, ...found.data() });
        } else {
          toast.error("Booking not found");
        }
      } else {
        const doc = snapshot.docs[0];
        setBooking({ id: doc.id, ...doc.data() });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search booking");
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;
    setUpdating(true);
    try {
      const docRef = doc(db, "bookings", booking.id);
      await updateDoc(docRef, { 
        checkInStatus: "checked-in",
        checkInTime: new Date().toISOString()
      });
      setBooking(prev => ({ ...prev, checkInStatus: "checked-in" }));
      toast.success("Player checked in successfully!");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to verify check-in");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Verify Booking</h2>
              <p className="text-xs text-white/50 mt-0.5">Check-in players instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-6 h-6 text-white/50" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              placeholder="Enter Booking ID (e.g. BK-1234)"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all uppercase"
            />
            <button 
              type="submit"
              disabled={searching || !bookingId.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-20"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </form>

          {booking ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {booking.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{booking.userName}</p>
                      <p className="text-[10px] text-white/40">{booking.turfName}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${booking.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {booking.paymentStatus || "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium">
                    <Calendar className="w-3 h-3 text-primary" /> {booking.date}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium">
                    <Clock className="w-3 h-3 text-primary" /> {(booking.slots || []).join(", ")}
                  </div>
                </div>

                {booking.checkInStatus === "checked-in" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-center gap-2 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold">Already Checked In</span>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-center gap-2 text-white/40 italic">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">Waiting for check-in</span>
                  </div>
                )}
              </div>

              {booking.checkInStatus !== "checked-in" && (
                <button
                  onClick={handleCheckIn}
                  disabled={updating}
                  className="w-full py-4 rounded-2xl bg-white text-slate-950 font-bold shadow-xl shadow-white/5 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Check-In"}
                </button>
              )}
            </div>
          ) : (
            !searching && (
              <div className="py-10 flex flex-col items-center justify-center opacity-30">
                <ShieldCheck className="w-12 h-12 mb-4" />
                <p className="text-xs font-medium text-center balance-text">Search for a booking ID to verify its status.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
