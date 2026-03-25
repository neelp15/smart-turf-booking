import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, isVerified, role } = useAuth();

  if (!isAuthenticated) {
    console.log("ProtectedRoute: User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isVerified) {
    console.log("ProtectedRoute: User not OTP-verified, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && role !== allowedRole) {
    console.log(`ProtectedRoute: Role mismatch (expected: ${allowedRole}, got: ${role}), redirecting to home`);
    return <Navigate to="/" replace />;
  }

  return children;
}
