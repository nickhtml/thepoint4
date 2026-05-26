/**
 * @file PastTrips.tsx
 * @description A list of the user's past trips.
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, isBefore, startOfDay, differenceInDays } from 'date-fns';

export function PastTrips() {
  const { user, loading, isAuthenticated } = useAuth();
  const [pastTrips, setPastTrips] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && user?.id) {
      const q = query(collection(db, 'bookings'), where('user_id', '==', user.id));
      getDocs(q).then((snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        data.sort((a, b) => new Date(b.check_out_date).getTime() - new Date(a.check_out_date).getTime());
        
        const today = startOfDay(new Date());
        const past = data.filter(b => isBefore(parseISO(b.check_out_date), today));
        setPastTrips(past);
      }).catch(err => {
        handleFirestoreError(err, OperationType.LIST, 'bookings');
      });
    }
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

  return (
    <div className="flex-1 bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6 pb-32">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/me" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Past trips</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_6px_24px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {pastTrips.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                You have no past trips.
              </div>
            ) : (
              pastTrips.map((trip, idx) => {
                const inDate = parseISO(trip.check_in_date);
                const outDate = parseISO(trip.check_out_date);
                const duration = differenceInDays(outDate, inDate);
                const datesStr = `${format(inDate, 'MMM d')} - ${format(outDate, 'MMM d, yyyy')}`;

                return (
                  <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{datesStr}</h3>
                    <p className="text-gray-500 text-sm">{duration} nights</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
