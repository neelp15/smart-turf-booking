import { useState } from "react";
import { X, User, Phone, Save, Loader2, Building2, KeyRound } from "lucide-react";
import { updateUserProfile } from "../../services/firebase/userService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export default function ProfileSettingsModal({ user, onClose }) {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || user?.name || "",
    phone: user?.phone || "",
    businessName: user?.businessName || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile(user.uid, formData, "owners");
      toast.success("Profile updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      await resetPassword(user.email);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <User className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Profile Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Owner Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-foreground"
                  placeholder="Your Full Name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Business Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-foreground"
                  placeholder="Turf Connect Arena"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-foreground"
                  placeholder="+91 00000 00000"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-all text-foreground text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>

          <div className="pt-6 border-t border-white/5">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 mb-3">Security</p>
             <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full px-6 py-3 bg-white/5 border border-white/10 text-foreground rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <KeyRound className="w-4 h-4 text-primary" /> Reset Password Via Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
