import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { isAfter, startOfDay, parseISO, differenceInDays, format, isBefore } from 'date-fns';

export function UpcomingTrips() {
  const { user, isAuthenticated, loading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchBookings = () => {
    if (user?.id) {
      const q = query(collection(db, 'bookings'), where('user_id', '==', user.id));
      getDocs(q).then(snapshot => {
        const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookings(bookingsData);
      }).catch(err => {
        handleFirestoreError(err, OperationType.LIST, 'bookings');
      });
    }
  };

  useEffect(() => {
    if (!loading) fetchBookings();
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0A2540] border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <div className="p-8 text-center bg-gray-50 flex-1 min-h-screen">Please log in to view this page.</div>;
  }

  const today = startOfDay(new Date());
  const upcomingTrips = bookings.filter(b => isAfter(parseISO(b.check_out_date), today) || isAfter(parseISO(b.check_in_date), today))
    .sort((a, b) => parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime());

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) return;
    try {
      const bookingToCancel = bookings.find(b => b.id === bookingId);
      await deleteDoc(doc(db, 'bookings', bookingId));
      
      if (bookingToCancel) {
        auth.currentUser?.getIdToken().then(token => {
          fetch('/api/emails/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'cancel',
              checkInDate: format(parseISO(bookingToCancel.check_in_date), 'yyyy-MM-dd'),
              checkOutDate: format(parseISO(bookingToCancel.check_out_date), 'yyyy-MM-dd')
            })
          }).catch(err => console.error("Could not dispatch email notification", err));
        });
      }

      fetchBookings();
      window.dispatchEvent(new Event('bookingsUpdated'));
    } catch (err) {
      console.error("Cancel Error:", err);
      alert("Failed to cancel reservation.");
    }
  };

  return (
    <div className="flex-1 bg-gray-50 py-8 px-4 sm:px-6 pb-32 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Link to="/me" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Profile
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-8 font-serif">All Upcoming Trips</h1>
        
        <div className="space-y-4">
          {upcomingTrips.length > 0 ? (
            upcomingTrips.map(trip => {
              const daysUntil = differenceInDays(parseISO(trip.check_in_date), today);
              return (
                <div key={trip.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden gap-4">
                   <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                   <div className="pl-2">
                      <p className="text-gray-900 font-bold mb-1">{format(parseISO(trip.check_in_date), 'MMMM d, yyyy')} - {format(parseISO(trip.check_out_date), 'MMMM d, yyyy')}</p>
                   </div>
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                     <span className="inline-block px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs sm:text-sm font-bold tracking-wide text-center">
                        {daysUntil > 0 ? `Arriving in ${daysUntil} days` : 'Trip Active'}
                     </span>
                     <button onClick={() => handleCancelBooking(trip.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Cancel Reservation">
                        <Trash2 className="w-5 h-5" />
                     </button>
                   </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm">
               <p className="text-gray-500 mb-4">You have no upcoming trips.</p>
               <Link to="/" className="inline-block px-4 py-2 bg-[#0A2540] text-white font-medium rounded-lg hover:bg-[#0A2540]/90 transition-colors">
                  Book a Stay
               </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
