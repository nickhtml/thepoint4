/**
 * @file BookingSidebar.tsx
 * @description The fixed-width action panel displaying property rules and booking actions.
 * Input: None. Placed contextually on the Dashboard viewport.
 */
import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { format, isAfter, parseISO } from 'date-fns';
import { Login } from '../../pages/Login';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, setDoc, query, collection, getDocs, where } from 'firebase/firestore';

export function BookingSidebar() {
  const { checkIn, checkOut, setDates } = useBooking();
  const { isAuthenticated, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBook = async () => {
    if (!checkIn || !checkOut) {
      setErrorMsg("Please select check-in and checkout dates.");
      return;
    }
    
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
    } else {
      await completeBooking();
    }
  };

  const completeBooking = async () => {
    setShowLoginModal(false);
    setErrorMsg('');
    setLoading(true);

    try {
      if (!checkIn || !checkOut || !user) throw new Error("Missing required booking criteria");

      // Verify max 4 active reservations limit
      const userBookingsQ = query(collection(db, 'bookings'), where('user_id', '==', user.id));
      const userBookingsSnap = await getDocs(userBookingsQ);
      const activeBookings = userBookingsSnap.docs.filter(doc => isAfter(parseISO(doc.data().check_out_date), new Date()));
      
      if (activeBookings.length >= 4) {
         throw new Error("You have reached the maximum limit of 4 active/future reservations.");
      }

      const bookingId = crypto.randomUUID();
      const bookingData = {
        id: bookingId,
        user_id: user.id,
        check_in_date: format(checkIn, 'yyyy-MM-dd'),
        check_out_date: format(checkOut, 'yyyy-MM-dd'),
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'bookings', bookingId), bookingData);

      // Trigger email payload off main thread
      auth.currentUser?.getIdToken().then(token => {
        fetch('/api/emails/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'book',
            checkInDate: format(checkIn, 'yyyy-MM-dd'),
            checkOutDate: format(checkOut, 'yyyy-MM-dd')
          })
        }).catch(err => console.error("Could not dispatch email notification", err));
      });

      setBookingConfirmed(true);
      setDates(null, null);
      
      setTimeout(() => {
        setBookingConfirmed(false);
      }, 3000);
      
      // Dispatch custom event to trigger calendar refetch
      window.dispatchEvent(new Event('bookingsUpdated'));

    } catch (err: any) {
      console.error("Booking Error:", err);
      // Fallback for handleFirestoreError if needed, but simple message is fine
      if (err.message && err.message.includes('permission')) {
        setErrorMsg("Missing or insufficient permissions to book dates.");
      } else {
        setErrorMsg(err.message || 'An error occurred during booking');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-gray-200 p-6 flex flex-col gap-6 relative">
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 z-10"
            >
              ✕
            </button>
            <Login onSuccess={completeBooking} />
          </div>
        </div>
      )}

      {/* Booking Initiation Card */}
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-gray-900 flex items-baseline">
           Book stay 
        </h3>
        
        {errorMsg && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {errorMsg}
          </div>
        )}

        <div className="border border-gray-300 rounded-lg overflow-hidden mb-4 grid grid-cols-2 relative focus-within:ring-2 focus-within:ring-black">
           <div 
             className="p-3 border-r border-b border-gray-300 relative group cursor-pointer hover:bg-gray-50 transition-colors"
             onClick={() => document.getElementById('calendar-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
           >
             <div className="text-[10px] font-bold uppercase text-gray-900 block cursor-pointer">Check-in</div>
             <div className="text-sm text-gray-900 mt-1 bg-transparent w-full">
                {checkIn ? format(checkIn, 'MMM d, yyyy') : 'Tap to select'}
             </div>
           </div>
           <div 
             className="p-3 border-b border-gray-300 relative group cursor-pointer hover:bg-gray-50 transition-colors"
             onClick={() => document.getElementById('calendar-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
           >
             <div className="text-[10px] font-bold uppercase text-gray-900 block cursor-pointer">Checkout</div>
             <div className="text-sm text-gray-900 mt-1 bg-transparent w-full">
                {checkOut ? format(checkOut, 'MMM d, yyyy') : 'Tap to select'}
             </div>
           </div>
           <div className="p-3 col-span-2 relative cursor-pointer hover:bg-gray-50 transition-colors">
             <div className="text-[10px] font-bold uppercase text-gray-900">Guests</div>
             <select className="text-sm text-gray-900 mt-1 bg-transparent w-full focus:outline-none cursor-pointer appearance-none">
               <option>1 guest</option>
               <option>2 guests</option>
               <option>3 guests</option>
               <option>4 guests</option>
               <option>5 guests</option>
               <option>6 guests</option>
             </select>
           </div>
        </div>

        {bookingConfirmed ? (
          <div className="w-full h-12 bg-green-500 text-white rounded-lg text-base font-semibold flex items-center justify-center">
            Booking Confirmed!
          </div>
        ) : (checkIn && checkOut) ? (
          <motion.button 
            onClick={handleBook}
            disabled={loading}
            animate={{ scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 15px rgba(225,29,72,0.6)", "0px 0px 0px rgba(0,0,0,0)"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-full h-12 flex items-center justify-center gap-2 bg-rose-600 text-white rounded-lg text-base font-semibold hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing...' : 'Reserve'}
          </motion.button>
        ) : (
          <button 
            onClick={handleBook}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-2 bg-rose-600 text-white rounded-lg text-base font-semibold hover:bg-rose-700 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing...' : 'Reserve'}
          </button>
        )}


      </div>

      <div className="border-t border-gray-200 pt-6">
        <ul className="text-gray-600 space-y-2 text-sm">
          <li className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span>
             Max stay is 7 consecutive nights.
          </li>
          <li className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span>
             Bookings available up to 90 days out.
          </li>
          <li className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span>
             Mandatory 24-hr turnover buffer.
          </li>
        </ul>
      </div>

      {/* Admin Quick Action Link */}
      {user?.is_admin && (
        <div className="border-t border-gray-200 pt-6">
          <Link 
            to="/admin" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Admin Environment
          </Link>
        </div>
      )}
    </div>
  );
}
