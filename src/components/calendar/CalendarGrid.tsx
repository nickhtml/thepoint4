/**
 * @file CalendarGrid.tsx
 * @description Visually renders the strict structural view of the monthly breakdown and availability status.
 * Input: None required presently.
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  isWithinInterval,
  isAfter,
  parseISO,
} from 'date-fns';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';

interface BookingData {
  id: string;
  user_id: string;
  check_in_date: string;
  check_out_date: string;
  created_at: string;
  profiles?: any;
}

const COLORS = [
  'bg-blue-500', 
  'bg-emerald-500', 
  'bg-amber-500', 
  'bg-purple-500', 
  'bg-pink-500', 
  'bg-indigo-500',
  'bg-teal-500'
];

const getColorByUserId = (userId?: string) => {
  if (!userId) return 'bg-gray-500';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

export function CalendarGrid() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { checkIn, checkOut, setDates } = useBooking();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [selectedBookingModal, setSelectedBookingModal] = useState<BookingData | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        
        const profilesMap: Record<string, any> = {};
        profilesSnap.forEach(doc => {
          profilesMap[doc.id] = doc.data();
        });

        const bookingsData = bookingsSnap.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            profiles: profilesMap[data.user_id] || { first_name: 'Unknown', avatar: null }
          };
        }) as BookingData[];
        setBookings(bookingsData);
      } catch (err) {
        console.error("Failed to load calendars:", err);
      }
    };

    fetchBookings();

    const handleUpdate = () => fetchBookings();
    window.addEventListener('bookingsUpdated', handleUpdate);
    return () => window.removeEventListener('bookingsUpdated', handleUpdate);
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const daysInMonth = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getBookingForDay = (day: Date) => {
    return bookings.find(b => {
      const inDate = parseISO(b.check_in_date);
      const outDate = parseISO(b.check_out_date);
      return !isBefore(day, startOfDay(inDate)) && !isAfter(day, startOfDay(outDate));
    });
  };

  const handleDateClick = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) return; 
    const blockedBooking = getBookingForDay(day);
    if (blockedBooking) {
        setSelectedBookingModal(blockedBooking);
        return;
    }

    if (!checkIn || (checkIn && checkOut)) {
      setDates(day, null);
    } else if (isBefore(day, checkIn)) {
      setDates(day, null);
    } else {
      const interval = eachDayOfInterval({ start: checkIn, end: day });
      const hasConflict = interval.some(d => getBookingForDay(d));
      if (hasConflict) {
        setDates(day, null);
      } else {
        setDates(checkIn, day);
      }
    }
  };

  const isSelected = (day: Date) => {
    if (checkIn && isSameDay(day, checkIn)) return true;
    if (checkOut && isSameDay(day, checkOut)) return true;
    return false;
  };

  const isInRange = (day: Date) => {
    if (checkIn && checkOut) {
      if (isAfter(day, checkIn) && isBefore(day, checkOut)) return true;
    }
    return false;
  };

  return (
    <>
    <div id="calendar-grid" className="w-full bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 sm:px-3 sm:py-1.5 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors focus:ring-2 focus:ring-black outline-none"
          >
            <ChevronLeft className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:block text-sm font-medium">Prev</span>
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 sm:px-3 sm:py-1.5 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors focus:ring-2 focus:ring-black outline-none"
          >
            <span className="hidden sm:block text-sm font-medium">Next</span>
            <ChevronRight className="w-4 h-4 sm:hidden" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl min-h-[300px]">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="bg-white py-2 text-center text-xs font-semibold text-gray-500">
            {day}
          </div>
        ))}
        
        {daysInMonth.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPast = isBefore(day, startOfDay(new Date()));
          const selected = isSelected(day);
          const inRange = isInRange(day);
          const blockedBooking = getBookingForDay(day);
          
          let bgClass = "bg-white";
          if (!isCurrentMonth) bgClass = "bg-gray-50";
          if (inRange) bgClass = "bg-rose-50";
          if (selected) bgClass = "bg-rose-600";
          else if (isPast) bgClass += " opacity-50 cursor-not-allowed";

          const isStart = blockedBooking && isSameDay(day, parseISO(blockedBooking.check_in_date));
          const isEnd = blockedBooking && isSameDay(day, parseISO(blockedBooking.check_out_date));
          const profileName = blockedBooking?.profiles?.first_name || 'Family';
          const blockColor = getColorByUserId(blockedBooking?.user_id);

          return (
            <div 
              key={idx} 
              onClick={() => handleDateClick(day)}
              className={`${bgClass} p-1 h-[80px] sm:h-[100px] relative transition-colors ${!isPast && !blockedBooking ? 'hover:bg-rose-50 cursor-pointer' : ''} overflow-visible`}
            >
              <div className="flex justify-center z-20 relative">
                <span className={`text-sm font-medium ${selected ? 'text-white' : isCurrentMonth && !blockedBooking ? 'text-gray-900' : 'text-gray-400'} w-7 h-7 flex items-center justify-center rounded-full ${(isToday(day) && !selected && !blockedBooking) ? 'border-2 border-black' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>

              {blockedBooking && (
                 <div 
                   className={`absolute top-10 bottom-2 z-10 flex items-center px-2 shadow-sm
                   ${isStart ? 'left-1 rounded-l-md' : '-left-[1px]'} 
                   ${isEnd ? 'right-1 rounded-r-md' : '-right-[1px]'}
                   ${blockColor}`}
                 >
                   {(isStart || day.getDay() === 0) && (
                      <span className="text-[10px] sm:text-xs text-white font-bold truncate drop-shadow-md">
                        {profileName}
                      </span>
                   )}
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {selectedBookingModal && (() => {
        const p = selectedBookingModal.profiles;
        const formattedBookingDate = format(parseISO(selectedBookingModal.created_at), 'MMMM do, yyyy');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full relative animate-in zoom-in-95 duration-200">
               <button 
                 onClick={() => setSelectedBookingModal(null)} 
                 className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
               <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mb-4 overflow-hidden shadow-inner flex items-center justify-center">
                    {p?.avatar ? (
                       <img src={p.avatar} alt={p.first_name} className="w-full h-full object-cover" />
                    ) : (
                       <span className="text-xl font-bold text-gray-500">{p?.first_name?.substring(0,2).toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{p?.first_name || 'Family member'}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                     Booked on {formattedBookingDate}
                  </p>
                  <div className="w-full bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                     <p className="text-sm font-semibold text-gray-800">
                        {format(parseISO(selectedBookingModal.check_in_date), 'MMM d, yyyy')} - {format(parseISO(selectedBookingModal.check_out_date), 'MMM d, yyyy')}
                     </p>
                  </div>
                  {user?.is_admin && (
                     <button
                        onClick={async () => {
                           if (!window.confirm("Are you sure you want to cancel this booking?")) return;
                           try {
                               await deleteDoc(doc(db, 'bookings', selectedBookingModal.id));
                               
                               if (auth.currentUser) {
                                  auth.currentUser.getIdToken().then(token => {
                                      fetch('/api/emails/notify', {
                                         method: 'POST',
                                         headers: { 
                                           'Content-Type': 'application/json',
                                           'Authorization': `Bearer ${token}` 
                                         },
                                         body: JSON.stringify({
                                           action: 'cancel',
                                           checkInDate: selectedBookingModal.check_in_date,
                                           checkOutDate: selectedBookingModal.check_out_date
                                         })
                                      }).catch(err => console.error(err));
                                  });
                               }

                               setBookings(prev => prev.filter(b => b.id !== selectedBookingModal.id));
                               setSelectedBookingModal(null);
                               window.dispatchEvent(new Event('bookingsUpdated'));
                           } catch (err) {
                               console.error("Failed to cancel booking:", err);
                               alert("Failed to cancel booking.");
                           }
                        }}
                        className="mt-6 text-red-600 font-semibold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors w-full"
                     >
                        Cancel Booking
                     </button>
                  )}
               </div>
            </div>
          </div>
        )
    })()}
    </>
  );
}
