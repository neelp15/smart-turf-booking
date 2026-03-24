import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { Menu, X, MapPin, User, LogOut, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const { user, role, logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const dashboardPath = role === "owner" ? "/owner/dashboard" : "/user/dashboard";

  return (
    <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">T</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground">
            Smart Turf Booking
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavItem to="/" label="Home" current={location.pathname} />
            {role === "user" && (
              <NavItem to="/turfs" label="Explore Turfs" current={location.pathname} />
            )}
            {isAuthenticated && (
              <NavItem to={dashboardPath} label="Dashboard" current={location.pathname} />
            )}
            {role === "owner" && (
              <NavItem to="/owner/my-turfs" label="My Turfs" current={location.pathname} />
            )}
          </div>

          {/* Right */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-semibold">
                      {(user?.name || user?.displayName || user?.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.name || user?.displayName || user?.email.split('@')[0]}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">
                    {role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity active:scale-[0.97]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1 animate-fade-up">
            <MobileNavItem to="/" label="Home" onClick={() => setMobileOpen(false)} />
            {role === "user" && (
              <MobileNavItem to="/turfs" label="Explore Turfs" onClick={() => setMobileOpen(false)} />
            )}
            {isAuthenticated && (
              <MobileNavItem to={dashboardPath} label="Dashboard" onClick={() => setMobileOpen(false)} />
            )}
            {role === "owner" && (
              <MobileNavItem to="/owner/my-turfs" label="My Turfs" onClick={() => setMobileOpen(false)} />
            )}
            <div className="pt-2 border-t border-border mt-2">
              {isAuthenticated ? (
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Log out
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavItem({ to, label, current }) {
  const active = current === to || (to !== "/" && current.startsWith(to));
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </Link>
  );
}

function MobileNavItem({ to, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
    >
      {label}
    </Link>
  );
}
