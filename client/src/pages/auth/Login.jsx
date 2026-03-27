import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { sendOTP, verifyOTP } from "../../services/authService";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { login, isAuthenticated, role, logout, isVerified, setIsVerified, user, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated by Firebase but not yet OTP verified, show OTP step
    if (isAuthenticated && !isVerified) {
      if (!showOTP) setShowOTP(true);
      // Sync email from firebase user if local state is empty
      if (!email && user?.email) {
        setEmail(user.email);
      }
    }
    // Only redirect if authenticated AND OTP is verified
    if (isAuthenticated && isVerified) {
      navigate(role === "owner" ? "/owner/dashboard" : "/");
    }
  }, [isAuthenticated, isVerified, role, navigate, showOTP, email, user]);

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

  const getErrorMessage = (err) => {
    if (err.message && !err.code) return err.message;  
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password. Please try again.";
      default:
        return err.message || "Failed to log in. Please try again.";
    }
  };

  const handleInitialLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill all fields"); return; }
    
    setLoading(true);
    try {
      console.log(`Attempting login for ${email.trim()}`);
      // 1. First authenticate with Firebase (trimming inputs to avoid spacing issues)
      await login(email.trim(), password.trim());
      
      // 2. If successful, request OTP from our server
      await sendOTP(email, "login");
      setShowOTP(true);
      setTimer(60);
      setCanResend(false);
      toast.success("Security code sent to your email!");
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
      // If login failed, no need to logout. 
      // If sendOTP failed, we might be logged into firebase but didn't get OTP.
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) { setError("Please enter the OTP"); return; }

    const emailToVerify = email.trim() || user?.email;
    if (!emailToVerify) {
      setError("Email is missing. Please try logging in again.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP with our backend
      await verifyOTP(emailToVerify, otp, "login");
      
      // 2. Mark as verified in context
      setIsVerified(true);
      
      toast.success("Login verified!");
    } catch (err) {
      setError(err.message || "Invalid or expired OTP");
      toast.error("Invalid security code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const emailToResend = email.trim() || user?.email;
    if (!emailToResend) {
      toast.error("Email is missing. Please try logging in again.");
      return;
    }
    try {
      setLoading(true);
      await sendOTP(emailToResend, "login");
      setTimer(60);
      setCanResend(false);
      toast.success("New security code sent!");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
      toast.error("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToReset = email.trim() || user?.email;
    
    if (!emailToReset) {
      setError("Please enter your email first to reset password.");
      toast.error("Email required");
      return;
    }
    
    try {
      setLoading(true);
      await resetPassword(emailToReset);
      toast.success("Password reset email sent! Please check your inbox.");
      setError("");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.message || "Failed to send reset email");
      toast.error(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    setShowOTP(false);
    setOtp("");
    setTimer(60);
    setCanResend(false);
    setIsVerified(false); // Changed from setIsOTPVerified to setIsVerified
    await logout(); // Sign out from Firebase if they back out of OTP
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {showOTP ? "Security Check" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {showOTP ? `Enter the code sent to ${email}` : "Log in to your Turf Connect account"}
            </p>
          </div>

          {!showOTP ? (
            <form onSubmit={handleInitialLogin} className="space-y-4">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Password</label>
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className="text-[10px] font-bold text-primary hover:underline transition-all"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative group/field">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Security Code</label>
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
                  onClick={handleBack}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-border bg-card text-foreground hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Verify & Log in"}
                </button>
              </div>

              <button 
                type="button"
                disabled={loading || !canResend}
                onClick={handleResendOTP}
                className="w-full text-center text-xs text-primary hover:underline mt-2 disabled:opacity-50 disabled:no-underline"
              >
                {canResend ? "Didn't receive the code? Resend" : `Resend code in ${timer}s`}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
