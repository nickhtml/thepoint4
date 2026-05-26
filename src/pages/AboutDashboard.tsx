/**
 * @file AboutDashboard.tsx
 * @description The "About" section representing the house manual, check-in/out info.
 */
import React from 'react';
import { Clock, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export function AboutDashboard() {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6 pb-32">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Info & House Manual</h1>

        {/* Check-in / Checkout Info */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-8">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                 <Clock className="w-5 h-5 text-rose-500" />
                 <h2 className="text-xl font-bold text-gray-900">Check-in</h2>
              </div>
              <p className="text-3xl font-black text-[#0A2540] my-2">4:00 PM</p>
              <p className="text-gray-500 text-sm">Self check-in with keypad. The door code is provided in your current trip dashboard.</p>
           </div>
           <div className="hidden md:block w-px bg-gray-200"></div>
           <div className="md:hidden h-px w-full bg-gray-200"></div>
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                 <Clock className="w-5 h-5 text-gray-400" />
                 <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
              </div>
              <p className="text-3xl font-black text-[#0A2540] my-2">11:00 AM</p>
              <p className="text-gray-500 text-sm">Please follow the checkout checklist from the "Checkout" button before leaving.</p>
           </div>
        </div>

        {/* House Rules */}
        <div className="space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                 <Info className="w-5 h-5 text-blue-500" />
                 <h3 className="text-lg font-bold text-gray-900">Important Rules</h3>
              </div>
              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                       <span className="font-semibold text-gray-900 block">Quiet Hours</span>
                       <span className="text-gray-600 text-sm">10:00 PM to 8:00 AM. Please respect the neighbors in Eden Isle.</span>
                    </div>
                 </li>
                 <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                       <span className="font-semibold text-gray-900 block">Trash Disposal</span>
                       <span className="text-gray-600 text-sm">All trash must be bagged and placed in the bins outside. Pick up is on Tuesdays.</span>
                    </div>
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
