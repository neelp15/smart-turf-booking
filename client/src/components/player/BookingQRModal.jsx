import { QRCodeSVG } from "qrcode.react";
import { X, Calendar, MapPin, Clock } from "lucide-react";

export default function BookingQRModal({ booking, onClose }) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 h-[100dvh]">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between">
          <h3 className="font-display font-bold text-xl text-foreground">Booking Pass</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 text-muted-foreground transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Section */}
        <div className="p-8 flex flex-col items-center">
          <div className="p-4 bg-white rounded-3xl shadow-inner mb-6">
            <QRCodeSVG 
              value={booking.id} 
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: "/favicon.ico",
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
          
          <p className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Verification ID
          </p>
          <p className="font-mono text-sm font-bold text-primary">
            {booking.customId || booking.id.slice(0, 12)}
          </p>
        </div>

        {/* Details Footer */}
        <div className="bg-white/5 border-t border-white/5 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Venue</p>
              <p className="text-sm font-bold text-foreground">{booking.turfName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Date</p>
                <p className="text-sm font-bold text-foreground">{booking.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Slot</p>
                <p className="text-sm font-bold text-foreground">{(booking.slots || [booking.slot])[0]}</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => window.print()}
          className="w-full py-4 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          Download Ticket
        </button>
      </div>
    </div>
  );
}
