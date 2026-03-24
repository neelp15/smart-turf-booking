import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";

import Home from "./pages/player/Home";
import TurfListing from "./pages/player/TurfListing";
import TurfDetail from "./pages/player/TurfDetail";
import BookingPage from "./pages/player/BookingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import UserDashboard from "./pages/player/UserDashboard";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import AddTurf from "./pages/owner/AddTurf";
import MyTurfs from "./pages/owner/MyTurfs";
import EditTurf from "./pages/owner/EditTurf";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerTurfDetail from "./pages/owner/OwnerTurfDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/turfs" element={<TurfListing />} />
            <Route path="/turf/:id" element={<TurfDetail />} />
            <Route path="/booking/:id" element={
              <ProtectedRoute><BookingPage /></ProtectedRoute>
            } />
            <Route path="/user/dashboard" element={
              <ProtectedRoute allowedRole="user"><UserDashboard /></ProtectedRoute>
            } />
            <Route path="/owner/dashboard" element={
              <ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>
            } />
            <Route path="/owner/add-turf" element={
              <ProtectedRoute allowedRole="owner"><AddTurf /></ProtectedRoute>
            } />
            <Route path="/owner/my-turfs" element={
              <ProtectedRoute allowedRole="owner"><MyTurfs /></ProtectedRoute>
            } />
            <Route path="/owner/edit-turf/:id" element={
              <ProtectedRoute allowedRole="owner"><EditTurf /></ProtectedRoute>
            } />
            <Route path="/owner/bookings" element={
              <ProtectedRoute allowedRole="owner"><OwnerBookings /></ProtectedRoute>
            } />
            <Route path="/owner/turf/:id" element={
              <ProtectedRoute allowedRole="owner"><OwnerTurfDetail /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
