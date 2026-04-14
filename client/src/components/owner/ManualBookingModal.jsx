import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, User, Check, Loader2, ChevronRight } from "lucide-react";
import { getOwnerTurfs, getTurfBookingsByDate, checkAndCreateBooking } from "../../services/firebase/turfService";
import { toast } from "sonner";

export default function ManualBookingModal({ user, onClose }) {
  const [turfs, setTurfs] = useState([]);
  const [selectedTurf, setSelectedTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [step, setStep] = useState(1); // 1: Select Turf, 2: Select Slots, 3: Confirm

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const data = await getOwnerTurfs(user.uid);
        setTurfs(data);
        if (data.length === 1) {
          setSelectedTurf(data[0]);
          setStep(2);
        }
      } catch (error) {
        console.error("Error fetching turfs:", error);
        toast.error("Failed to load your turfs");
      } finally {
        setLoading(false);
      }
    };
    fetchTurfs();
  }, [user.uid]);

  useEffect(() => {
    if (selectedTurf && selectedDate) {
      const fetchBookings = async () => {
        try {
          const bookings = await getTurfBookingsByDate(selectedTurf.id, selectedDate);
          const slots = bookings.reduce((acc, b) => [...acc, ...(b.slots || [])], []);
          setBookedSlots(slots);
          setSelectedSlots(prev => prev.filter(s => !slots.includes(s)));
        } catch (error) {
          console.error("Error fetching bookings:", error);
        }
      };
      fetchBookings();
    }
  }, [selectedTurf, selectedDate]);

  const handleSlotClick = (slot) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(prev => prev.filter(s => s !== slot));
    } else {
      setSelectedSlots(prev => [...prev, slot]);
    }
  };

  const handleConfirm = async () => {
    if (!guestName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    setSubmitting(true);
    try {
      const bookingData = {
        userUid: "manual_booking", // Special ID for manual entries
        userName: guestName + " (Offline)",
        userEmail: "manual@entry.local",
        turfId: selectedTurf.id,
        turfName: selectedTurf.turfName,
        location: selectedTurf.location,
        ownerUid: user.uid,
        date: selectedDate,
        slots: selectedSlots,
        price: selectedTurf.price * selectedSlots.length,
        paymentStatus: "paid", // Assuming owner collected cash
        status: "confirmed",
        isManual: true
      };

      await checkAndCreateBooking(bookingData);
      toast.success("Manual booking confirmed!");
      onClose();
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(error.message === "SLOT_TAKEN" ? "Slots already taken!" : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })
    };
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-2xl font-display font-bold text-white">New Manual Booking</h2>
            <p className="text-xs text-white/50 mt-1">Block slots for walk-in or offline customers</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-6 h-6 text-white/50" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-white/40 text-sm">Fetching turfs...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Step 1: Select Turf */}
              {step >= 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">1</div>
                    Select Turf
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {turfs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTurf(t); setStep(2); }}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedTurf?.id === t.id 
                            ? "bg-primary/20 border-primary text-white" 
                            : "bg-white/5 border-white/5 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <p className="font-bold">{t.turfName}</p>
                        <p className="text-xs opacity-50">{t.location}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Date & Slots */}
              {step >= 2 && selectedTurf && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">2</div>
                      Select Date & Slots
                    </h3>
                    
                    {/* Date Horizontal Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {dates.map(d => (
                        <button
                          key={d.value}
                          onClick={() => setSelectedDate(d.value)}
                          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedDate === d.value ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>

                    {/* Slots Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {(selectedTurf.availableSlots || []).map(slot => {
                        const isBooked = bookedSlots.includes(slot);
                        const isSelected = selectedSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            disabled={isBooked}
                            onClick={() => handleSlotClick(slot)}
                            className={`py-3 rounded-xl text-[10px] font-bold transition-all ${
                              isBooked 
                                ? "bg-white/5 text-white/20 line-through opacity-50 cursor-not-allowed" 
                                : isSelected
                                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/5"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Customer Info */}
                  {selectedSlots.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 pt-4 border-t border-white/5">
                      <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">3</div>
                        Customer Details
                      </h3>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          placeholder="Guest Name (e.g. Rahul Sharma)"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>

                      {/* Summary Card */}
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total to collect</p>
                          <p className="text-2xl font-display font-bold text-white">₹{selectedTurf.price * selectedSlots.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-white/60">{selectedSlots.length} Slots Selected</p>
                          <p className="text-[10px] text-white/40">{selectedDate}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/50">
          <button
            disabled={submitting || selectedSlots.length === 0 || !guestName.trim()}
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Confirm Manual Booking</>}
          </button>
        </div>
      </div>
    </div>
  );
}
