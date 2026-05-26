/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfileDashboard } from './pages/ProfileDashboard';
import { AboutDashboard } from './pages/AboutDashboard';
import { PastTrips } from './pages/PastTrips';
import { UpcomingTrips } from './pages/UpcomingTrips';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { BookingProvider } from './context/BookingContext';

function AppContent() {
  const [showCheckoutTest, setShowCheckoutTest] = useState(false);

  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-white flex flex-col font-sans text-[#0A2540] relative">
        <Navbar />
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/about" element={<AboutDashboard />} />
          <Route path="/me" element={<ProfileDashboard />} />
          <Route path="/past-trips" element={<PastTrips />} />
          <Route path="/upcoming-trips" element={<UpcomingTrips />} />
        </Routes>

        {showCheckoutTest && (
          <CheckoutModal onComplete={() => setShowCheckoutTest(false)} />
        )}

        {/* Floating Debug Button to trigger the checkout modal manually for UI review */}
        <button 
          onClick={() => setShowCheckoutTest(true)}
          className="fixed bottom-24 md:bottom-6 right-6 bg-[#0A2540] text-white px-6 py-4 rounded-full font-bold shadow-2xl opacity-40 hover:opacity-100 hover:scale-105 active:scale-95 transition-all outline-none z-50 text-lg hidden md:block" // Hidden on mobile for now as it covers bottom nav
        >
          [Debug] Show Checkout Checklists
        </button>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <AppContent />
      </BookingProvider>
    </AuthProvider>
  );
}
