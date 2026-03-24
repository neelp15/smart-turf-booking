import { Link } from "react-router-dom";
import { Search, MapPin, ArrowRight, Star, TrendingUp, Loader2, Mail, Phone, Send, MessageSquare } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getAllTurfs } from "../../services/firebase/turfService";
import { sports, cities } from "../../services/mockData";
import TurfCard from "../../components/turf/TurfCard";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import heroImage from "../../assets/hero-turf.jpg";
import { toast } from "sonner";

export default function Home() {
  const [searchCity, setSearchCity] = useState("");
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useScrollReveal();

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const data = await getAllTurfs();
        setTurfs(data);
      } catch (error) {
        console.error("Error fetching turfs for home:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTurfs();
  }, []);

  const featuredTurfs = useMemo(() => turfs.filter((t) => t.featured).slice(0, 4), [turfs]);
  const topRated = useMemo(() => [...turfs].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4), [turfs]);

  // Dynamically count turfs per sport if needed, or stick to mock sports list for UI
  const displaySports = useMemo(() => {
    return sports.map(s => {
      const count = turfs.filter(t => t.sport === s.name).length;
      return { ...s, count: count || 0 };
    });
  }, [turfs]);

  return (
    <div ref={sectionRef} className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-2xl">
            <p className="scroll-reveal text-accent font-semibold text-sm tracking-wide uppercase mb-4">
              Book your game in seconds
            </p>
            <h1 className="scroll-reveal stagger-1 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-card leading-[1.1] mb-6" style={{ textWrap: "balance" }}>
              Find & Book the Best Turfs Near You
            </h1>
            <p className="scroll-reveal stagger-2 text-lg text-card/70 mb-8 max-w-lg" style={{ textWrap: "pretty" }}>
              Discover premium sports facilities, compare prices, and book your perfect slot — all in one place.
            </p>

            {/* Search Bar */}
            <div className="scroll-reveal stagger-3 flex flex-col sm:flex-row gap-3 p-2 bg-card/10 backdrop-blur-md rounded-2xl border border-card/20 max-w-lg">
              <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-card rounded-xl">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search city or area..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <Link
                to={`/turfs${searchCity ? `?city=${searchCity}` : ""}`}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.97] shrink-0"
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
            </div>

            {/* Quick cities */}
            <div className="scroll-reveal stagger-4 flex flex-wrap gap-2 mt-5">
              {cities.slice(0, 4).map((city) => (
                <Link
                  key={city}
                  to={`/turfs?city=${city}`}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-card/15 text-card border border-card/20 hover:bg-card/25 transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending Sports */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="scroll-reveal flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Trending Sports</h2>
            <p className="text-muted-foreground text-sm mt-1">Pick your game, we'll find the turf</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {displaySports.map((sport, i) => (
            <Link
              key={sport.name}
              to={`/turfs?sport=${sport.name}`}
              className={`scroll-reveal stagger-${i + 1} group flex flex-col items-center gap-2 p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-card-hover transition-all duration-300`}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{sport.icon}</span>
              <span className="font-semibold text-sm text-foreground">{sport.name}</span>
              <span className="text-xs text-muted-foreground">{sport.count} turfs</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Turfs */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="scroll-reveal flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Featured Turfs</h2>
            <p className="text-muted-foreground text-sm mt-1">Hand-picked premium venues</p>
          </div>
          <Link
            to="/turfs"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-xl" />
            ))
          ) : featuredTurfs.length > 0 ? (
            featuredTurfs.map((turf, i) => (
              <div key={turf.id} className={`scroll-reveal stagger-${i + 1}`}>
                <TurfCard turf={turf} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-muted-foreground">
              No featured turfs available right now.
            </div>
          )}
        </div>
      </section>

      {/* Top Rated */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="scroll-reveal flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Top Rated</h2>
              <p className="text-muted-foreground text-sm mt-1">Loved by players like you</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-xl" />
              ))
            ) : topRated.length > 0 ? (
              topRated.map((turf, i) => (
                <div key={turf.id} className={`scroll-reveal stagger-${i + 1}`}>
                  <TurfCard turf={turf} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                Stay tuned for rated turfs!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="scroll-reveal relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-primary" />
          <div className="relative px-8 py-14 sm:px-14 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-4" style={{ textWrap: "balance" }}>
              Own a Turf? List it for Free
            </h2>
            <p className="text-primary-foreground/70 max-w-md mx-auto mb-8">
              Reach thousands of sports enthusiasts. Manage bookings, track earnings, and grow your business.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity active:scale-[0.97]"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-secondary/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="scroll-reveal">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Have questions about listing your turf or booking a slot? Our team is here to help you 24/7.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Us</p>
                  <p className="text-foreground font-medium">support@smartturf.com</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Call Us</p>
                  <p className="text-foreground font-medium">+91 98765 43210</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Office</p>
                  <p className="text-foreground font-medium">123, Sports Arena, Surat, Gujarat</p>
                </div>
              </div>
            </div>
          </div>

          <div className="scroll-reveal stagger-1 glass-card p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl" />
            <form className="space-y-4 relative z-10" onSubmit={(e) => { e.preventDefault(); toast.success("Message sent! We'll get back to you soon."); }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Your Name</label>
                  <input type="text" placeholder="John Doe" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                  <input type="email" placeholder="john@example.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Subject</label>
                <input type="text" placeholder="How can we help?" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Message</label>
                <textarea rows="4" placeholder="Type your message here..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none" required></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                <Send className="w-4 h-4" /> Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xs">T</span>
              </div>
              <span className="font-display font-semibold text-foreground">Smart Turf Booking</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 SmartTurfBooking. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
