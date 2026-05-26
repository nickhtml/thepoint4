/**
 * @file AdminDashboard.tsx
 * @description View showing the family organizational roster. Includes capabilities to view member details and book on their behalf.
 * Input: None. Isolated page route.
 */
import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, ChevronRight, Calendar as CalendarIcon, Clock, X, Loader2, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { parseISO, isBefore, isAfter, startOfDay, format } from 'date-fns';

interface Member {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  status: string;
  recentStays: { id: string; date: string; guests: number }[];
  upcomingStays: { id: string; raw_check_in: string; raw_check_out: string; date: string; guests: number }[];
  avatar?: string;
}

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const snap = await getDocs(collection(db, 'profiles'));
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const now = startOfDay(new Date());

        const memberData = snap.docs.map(doc => {
          const d = doc.data();
          const memberBookings = bookingsSnap.docs
            .map(b => ({id: b.id, ...b.data()}))
            .filter((b: any) => b.user_id === doc.id);
            
          const recentStays = memberBookings
            .filter((b: any) => isBefore(parseISO(b.check_out_date), now))
            .sort((a: any, b: any) => parseISO(b.check_in_date).getTime() - parseISO(a.check_in_date).getTime())
            .map((b: any) => ({
               id: b.id,
               date: `${format(parseISO(b.check_in_date), 'MMM d')} - ${format(parseISO(b.check_out_date), 'MMM d, yyyy')}`,
               guests: 2
            }));

          const upcomingStays = memberBookings
            .filter((b: any) => isAfter(parseISO(b.check_out_date), now) || isAfter(parseISO(b.check_in_date), now))
            .sort((a: any, b: any) => parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime())
            .map((b: any) => ({
               id: b.id,
               raw_check_in: b.check_in_date,
               raw_check_out: b.check_out_date,
               date: `${format(parseISO(b.check_in_date), 'MMM d')} - ${format(parseISO(b.check_out_date), 'MMM d, yyyy')}`,
               guests: 2
            }));

          return {
             id: doc.id,
             name: d.first_name || d.email,
             email: d.email,
             isAdmin: d.is_admin || false,
             status: 'Active',
             recentStays,
             upcomingStays,
             avatar: d.avatar,
          } as Member;
        });
        setMembers(memberData);
      } catch (err) {
        console.error("Failed to fetch profiles", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const toggleAdminStatus = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'grant'} admin status?`)) return;
    try {
      await updateDoc(doc(db, 'profiles', id), { is_admin: !currentStatus });
      setMembers(members.map(m => m.id === id ? { ...m, isAdmin: !currentStatus } : m));
      if (selectedMember?.id === id) {
          setSelectedMember({ ...selectedMember, isAdmin: !currentStatus });
      }
    } catch (err) {
      console.error("Failed to toggle admin status", err);
      alert("Failed to update status.");
    }
  };

  const handleCancelStay = async (stayId: string, checkInDate: string, checkOutDate: string) => {
     if (!window.confirm("Are you sure you want to cancel this reservation for this user?")) return;
     try {
         await deleteDoc(doc(db, 'bookings', stayId));
         
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
                   checkInDate: format(parseISO(checkInDate), 'yyyy-MM-dd'),
                   checkOutDate: format(parseISO(checkOutDate), 'yyyy-MM-dd')
                 })
               }).catch(err => console.error("Could not dispatch admin cancellation notification", err));
           });
         }

         setMembers(members.map(m => ({
            ...m,
            upcomingStays: m.upcomingStays?.filter(s => s.id !== stayId) || []
         })));
         if (selectedMember) {
            setSelectedMember({
              ...selectedMember,
              upcomingStays: selectedMember.upcomingStays.filter(s => s.id !== stayId)
            });
         }
         window.dispatchEvent(new Event('bookingsUpdated'));
     } catch (err) {
         console.error("Failed to cancel booking:", err);
         alert("Failed to cancel booking. See console.");
     }
  };

  if (authLoading || loading) {
     return <div className="p-8 text-center bg-gray-50 flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>;
  }

  if (!user?.is_admin) {
     return <div className="p-8 text-center bg-gray-50 flex-1">Access Denied. You must be an administrator to view this page.</div>;
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Family Roster</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage access, view history, and book on behalf of family members.</p>
          </div>
          <Link to="/" className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mt-2 sm:mt-0 order-first sm:order-last">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Roster List */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 hidden sm:grid sm:grid-cols-12 gap-4 items-center">
              <span className="col-span-5 text-xs font-semibold uppercase text-gray-500 tracking-wider">Member</span>
              <span className="col-span-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Status</span>
              <span className="col-span-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-right">Role</span>
            </div>

            <div className="divide-y divide-gray-100">
              {members.map(member => (
                <div 
                  key={member.id} 
                  onClick={() => setSelectedMember(member)}
                  className={`p-4 sm:px-6 sm:py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center cursor-pointer transition-colors ${selectedMember?.id === member.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  
                  {/* Member Name */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold text-lg shrink-0 overflow-hidden">
                       {member.avatar ? (
                         <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                       ) : (
                         member.name.charAt(0)
                       )}
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="col-span-4 hidden sm:flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {member.status}
                    </span>
                  </div>
                  
                  {/* Role Icon */}
                  <div className="col-span-3 flex justify-between sm:justify-end items-center">
                     <span className="sm:hidden text-xs text-gray-500">Role:</span>
                     <div className="flex items-center gap-2">
                         {member.isAdmin && <span className="text-sm font-bold text-red-600">Admin</span>}
                         <ChevronRight className="w-5 h-5 text-gray-400 hidden sm:block" />
                     </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Member Details Sidebar */}
          {selectedMember && (
            <div className="w-full lg:w-[350px] shrink-0 bg-white rounded-xl shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden relative">
               <button 
                 onClick={() => setSelectedMember(null)}
                 className="absolute top-4 right-4 p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
               >
                  <X className="w-5 h-5" />
               </button>

               <div className="p-6">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
                      {selectedMember.avatar ? (
                        <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
                      ) : (
                        selectedMember.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedMember.name}</h2>
                      <p className="text-sm text-gray-500">{selectedMember.email}</p>
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="flex gap-2 mb-6">
                    <button 
                      onClick={() => navigate('/')}
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      Book for User
                    </button>
                    <button 
                      onClick={() => toggleAdminStatus(selectedMember.id, selectedMember.isAdmin)}
                      className={`px-3 py-2.5 rounded-lg border flex items-center justify-center transition-colors ${selectedMember.isAdmin ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      title={selectedMember.isAdmin ? "Revoke Admin" : "Make Admin"}
                    >
                      {selectedMember.isAdmin ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </button>
                 </div>

                 {/* Member Details */}
                 <div className="space-y-6">
                    <div>
                       <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
                         <CalendarIcon className="w-4 h-4" />
                         Upcoming Stays
                       </h3>
                       {selectedMember.upcomingStays.length > 0 ? (
                         <div className="space-y-3">
                           {selectedMember.upcomingStays.map((stay, idx) => (
                             <div key={idx} className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-start justify-between">
                               <div>
                                 <p className="text-sm font-bold text-rose-900">{stay.date}</p>
                                 <p className="text-xs text-rose-700 mt-1">{stay.guests} {stay.guests === 1 ? 'guest' : 'guests'}</p>
                               </div>
                               <button onClick={() => handleCancelStay(stay.id, stay.raw_check_in, stay.raw_check_out)} className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-md transition-colors" title="Cancel booking">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-sm text-gray-500 italic">No upcoming stays.</p>
                       )}
                    </div>

                    <div>
                       <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
                         <ShieldCheck className="w-4 h-4" />
                         Account Status
                       </h3>
                       <div className="flex items-center gap-3">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedMember.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                           {selectedMember.status}
                         </span>
                         {selectedMember.isAdmin && (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             Admin
                           </span>
                         )}
                       </div>
                    </div>

                    <div>
                       <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
                         <Clock className="w-4 h-4" />
                         Recent Stays
                       </h3>
                       {selectedMember.recentStays.length > 0 ? (
                         <div className="space-y-3">
                           {selectedMember.recentStays.map((stay, idx) => (
                             <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                               <p className="text-sm font-medium text-gray-900">{stay.date}</p>
                               <p className="text-xs text-gray-500 mt-1">{stay.guests} {stay.guests === 1 ? 'guest' : 'guests'}</p>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-sm text-gray-500 italic">No recent stays.</p>
                       )}
                    </div>
                 </div>

               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
