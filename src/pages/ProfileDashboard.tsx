/**
 * @file ProfileDashboard.tsx
 * @description The "Me" section representing the user's profile, trips, and account settings.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronRight, Upload, LogOut, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { isAfter, isBefore, startOfDay, parseISO, differenceInDays, format } from 'date-fns';

export function ProfileDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBookings = () => {
    if (user?.id) {
      const q = query(collection(db, 'bookings'), where('user_id', '==', user.id));
      getDocs(q).then(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        data.sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime());
        setBookings(data);
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
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0A2540] border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Login onSuccess={() => {}}/>;
  }

  const today = startOfDay(new Date());
  
  const upcomingTrips = bookings.filter(b => isAfter(parseISO(b.check_out_date), today) || isAfter(parseISO(b.check_in_date), today))
    .sort((a, b) => parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime());
  const pastTrips = bookings.filter(b => isBefore(parseISO(b.check_out_date), today));
  const soonestTrip = upcomingTrips[0];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1048576) {
       alert("Image is too large. Please select an image under 1MB.");
       return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
         const base64Avatar = reader.result as string;
         await setDoc(doc(db, 'profiles', user.id), { avatar: base64Avatar }, { merge: true });
         window.location.reload();
      } catch (err) {
         console.error("Failed to upload avatar", err);
      }
    };
    reader.readAsDataURL(file);
  };

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
    <div className="flex-1 bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6 pb-32">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

        {/* Profile Card (Paystub Style) */}
        <div className="bg-white rounded-3xl shadow-[0_6px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-8 mb-6 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-[#0A2540] flex items-center justify-center text-white text-5xl font-bold shadow-inner mb-4 relative overflow-hidden">
               {user.avatar ? (
                 <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
               ) : (
                 <span>{user.name.substring(0, 2).toUpperCase()}</span>
               )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">{user.name}</h2>
            {user.is_admin && <span className="text-red-500 text-xs font-bold uppercase tracking-wider mt-1">Admin</span>}
          </div>

          <div className="flex-1 w-full flex flex-col justify-center mt-2 md:mt-0">
             <div className="border-b border-gray-200 pb-4 mb-4 flex items-center justify-between">
                <span className="text-4xl font-bold text-gray-900">{bookings.length}</span>
                <span className="text-gray-500 font-medium">Total Trips</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-gray-900">
                  {bookings.filter(b => parseISO(b.check_in_date).getFullYear() === new Date().getFullYear()).length}
                </span>
                <span className="text-gray-500 font-medium">Trips this year</span>
             </div>
          </div>
        </div>

        {/* Settings Toggle / List */}
        {!showSettings ? (
          <div className="space-y-4">
             <button 
               onClick={() => setShowSettings(true)}
               className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
             >
               <div className="flex items-center gap-4">
                 <Settings className="w-6 h-6 text-gray-700" />
                 <span className="text-lg font-medium text-gray-900">Account settings</span>
               </div>
               <ChevronRight className="w-5 h-5 text-gray-400" />
             </button>

             {/* Upcoming and Past Trips Cards */}
             <div className="flex flex-col gap-4 mt-8">
                {soonestTrip ? (
                  <div className="flex flex-col gap-3">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center hover:shadow-md transition-shadow relative overflow-hidden gap-4 sm:gap-6">
                       <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                       <div className="pl-2 flex-grow">
                           <h3 className="text-lg font-bold text-gray-900 mb-1">Upcoming trip</h3>
                          <p className="text-gray-500 text-sm whitespace-nowrap">{format(parseISO(soonestTrip.check_in_date), 'MMM d')} - {format(parseISO(soonestTrip.check_out_date), 'MMM d, yyyy')}</p>
                       </div>
                       <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                         <span className="inline-block px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs sm:text-sm font-bold tracking-wide text-center whitespace-nowrap">
                            {differenceInDays(parseISO(soonestTrip.check_in_date), today) > 0 ? `Arriving in ${differenceInDays(parseISO(soonestTrip.check_in_date), today)} days` : 'Trip Active'}
                         </span>
                         <button onClick={() => handleCancelBooking(soonestTrip.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0" title="Cancel Reservation">
                            <Trash2 className="w-5 h-5" />
                         </button>
                       </div>
                    </div>
                    {upcomingTrips.length > 1 && (
                      <Link to="/upcoming-trips" className="text-sm font-bold text-blue-600 hover:underline px-2 self-start flex items-center gap-1">
                        See {upcomingTrips.length - 1} more upcoming {upcomingTrips.length - 1 === 1 ? 'trip' : 'trips'} <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <p className="text-gray-500 text-sm">No upcoming trips booked.</p>
                  </div>
                )}

                <Link to="/past-trips" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-row items-center justify-between hover:shadow-md transition-shadow">
                   <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Past trips</h3>
                      <p className="text-gray-500 text-sm">View your previous stays</p>
                   </div>
                   <div>
                     <span className="text-gray-400 font-medium text-sm">{pastTrips.length} trips completed</span>
                   </div>
                </Link>
             </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_6px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-bold text-gray-900">Account settings</h2>
               <button 
                 onClick={() => setShowSettings(false)}
                 className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-colors text-sm"
               >
                 Go back
               </button>
             </div>

             <div className="space-y-6">
                <div>
                   <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4">Profile Info</h3>
                   <div className="space-y-4">
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                         <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-gray-900">Upload profile picture</span>
                         </div>
                      </button>
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                   <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4">Security</h3>
                   <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <label className="block text-sm text-gray-500 font-medium mb-1">Email address</label>
                         <input type="email" disabled defaultValue={user.email} className="w-full bg-transparent border-b border-gray-300 py-2 text-gray-900 focus:outline-none focus:border-[#0A2540]" />
                      </div>
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                   <button 
                     onClick={logout}
                     className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-bold"
                   >
                     <LogOut className="w-5 h-5" />
                     Log out
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
