import { useState } from "react";
import { X, Megaphone, Send, Loader2, Info } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "sonner";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000/api";

export default function BroadcastModal({ user, onClose }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "broadcasts"), {
        ownerUid: user.uid,
        ownerName: user.displayName || "Partner",
        title: title.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
        type: "announcement"
      });

      // 2. Trigger Email Broadcast to all users via backend
      try {
        await axios.post(`${API_BASE_URL}/broadcasts/notify`, {
          ownerName: user.displayName || "Partner",
          title: title.trim(),
          message: message.trim()
        });
      } catch (emailError) {
        console.error("Failed to send email notifications:", emailError);
        // We don't block the whole process if emails fail, but we log it
      }

      toast.success("Broadcast sent to all users!");
      onClose();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Send Broadcast</h2>
              <p className="text-xs text-white/50 mt-0.5">Reach out to your followers instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-6 h-6 text-white/50" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Announcement Title</label>
              <input
                type="text"
                placeholder="e.g. Weekend Flash Sale! 20% OFF"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Message Content</label>
              <textarea
                placeholder="Write your announcement details here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3 items-start">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/40 leading-relaxed font-medium">
              This broadcast will be visible to all users on their home feed and will also be sent as an **Email Notification** to every registered platform user.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/50">
          <button
            disabled={submitting || !title.trim() || !message.trim()}
            onClick={handleSend}
            className="w-full py-4 rounded-2xl bg-accent text-slate-950 font-bold shadow-xl shadow-accent/20 hover:shadow-accent/40 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Ship Broadcast</>}
          </button>
        </div>
      </div>
    </div>
  );
}
