import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";
import { Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { sendOTP, verifyOTP } from "../../services/authService";
import { toast } from "sonner";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOTP, setShowOTP] = useState(false); // New state for OTP step
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const { signup, isAuthenticated, role, setIsVerified } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(role === "owner" ? "/owner/dashboard" : "/");
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    let interval;
    if (showOTP && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showOTP, timer]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !phone) { setError("Please fill all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    
    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least one uppercase, one lowercase, one number, and one special character.");
      return;
    }

    if (phone.length < 10) { setError("Please enter a valid 10-digit phone number"); return; }
    
    setLoading(true);
    try {
      await sendOTP(email, "signup");
      setShowOTP(true);
      setTimer(60);
      setCanResend(false);
      toast.success("Verification code sent to your email!");
    } catch (err) {
      setError(err.message || "Failed to send verification code");
      toast.error(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (!otp) { setError("Please enter the OTP"); return; }

    setLoading(true);
    try {
      // 1. Verify OTP with our backend
      await verifyOTP(email.trim(), otp, "signup");
      
      // 2. Mark as verified in context
      setIsVerified(true);
      
      // 3. If valid, proceed with Firebase signup
      await signup(name.trim(), email.trim(), password, selectedRole, phone.trim());
      toast.success("Account created successfully!");
    } catch (err) {
      setError(err.message || "Failed to verify OTP or create account");
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      await sendOTP(email.trim(), "signup");
      setTimer(60);
      setCanResend(false);
      toast.success("New verification code sent!");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to resend code");
      toast.error("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {showOTP ? "Verify Email" : "Create account"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {showOTP ? `Enter the code sent to ${email}` : "Start booking turfs in seconds"}
            </p>
          </div>

          {!showOTP ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="flex bg-secondary rounded-xl p-1">
                {["user", "owner"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      selectedRole === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {r === "user" ? "Player" : "Turf Owner"}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="UCase, LCase, 123, @#$"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1 leading-relaxed">
                  Must include: <span className="text-foreground/70">Uppercase, Lowercase, Number, and Special Symbol.</span> (Min 6 chars)
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSignup} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">OTP Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-10 tracking-[0.5em] text-center font-bold"
                  />
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowOTP(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-border bg-card text-foreground hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Verify & Signup"}
                </button>
              </div>
              
              <button 
                type="button"
                disabled={loading || !canResend}
                onClick={handleResendOTP}
                className="w-full text-center text-xs text-primary hover:underline mt-2 disabled:opacity-50 disabled:no-underline"
              >
                {canResend ? "Didn't receive the code? Resend OTP" : `Resend code in ${timer}s`}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
