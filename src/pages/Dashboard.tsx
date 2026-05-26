/**
 * @file Dashboard.tsx
 * @description The primary hub page combining an Airbnb-style listing layout with the Calendar overview and Action Pane Sidebar.
 * Input: None. Wraps page sub-components globally.
 */
import React, { useState } from 'react';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { BookingSidebar } from '../components/calendar/BookingSidebar';
import { MapPin, Key, Wifi, Clock } from 'lucide-react';

// @ts-ignore
import mainImage from '../assets/images/regenerated_image_1779767370414.jpg';

export function Dashboard() {
  return (
    <div className="flex-1 bg-white pb-24 md:pb-0"> {/* padding bottom for mobile nav */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-[26px] font-semibold text-gray-900 mb-1">Graham Family Lake House</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600 font-medium space-x-2">
              <span className="underline cursor-pointer">1173 Fox Chase Rd, Heber Springs, AR</span>
            </div>
          </div>
        </div>

        {/* Photo Grid Section */}
        <div className="rounded-xl overflow-hidden mb-8 md:mb-12 flex h-[250px] sm:h-[300px] md:h-[400px] gap-2">
          <div className="w-full md:w-1/2 h-full bg-gray-200">
            {/* Main Image placeholder - user can replace with their image path */}
            <img src={mainImage} className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition" alt="Lake House Main" />
          </div>
          <div className="hidden md:flex w-1/2 h-full flex-col gap-2">
            <div className="flex h-1/2 gap-2">
              <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000" className="w-1/2 h-full object-cover cursor-pointer hover:brightness-95 transition" alt="Deck view" />
              <img src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1000" className="w-1/2 h-full object-cover cursor-pointer hover:brightness-95 transition" alt="Kitchen" />
            </div>
            <div className="flex h-1/2 gap-2">
              <img src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1000" className="w-1/2 h-full object-cover cursor-pointer hover:brightness-95 transition" alt="Bedroom" />
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000" className="w-1/2 h-full object-cover cursor-pointer hover:brightness-95 transition" alt="Bath" />
            </div>
          </div>
        </div>

        {/* Details & Booking Section */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 relative">
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            {/* About text */}
            <div className="pb-8 border-b border-gray-200 mb-8">
               <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">About the property</h3>
               <p className="text-gray-700 leading-relaxed font-light mb-4 text-sm sm:text-base">
                 According to Trip 101, Greers Ferry Lake is "one of the cleanest and clearest lakes in the state." They went on to call Greers Ferry the six most gorgeous lake in Arkansas.
               </p>
               <h4 className="font-semibold text-gray-900 mb-2 mt-6">Great Location</h4>
               <p className="text-gray-700 leading-relaxed font-light mb-4 text-sm sm:text-base">
                 Located on the Greers Ferry Lake, with lake access through a newly-remodeled dock, and shores to swim, it's no wonder the beauty of the location is so admirable. Swimming not your thing? Don't worry. Located in the Eden Isle community, along with our home is a championship golf club in the neighborhood.
               </p>
               <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                 Feel all the property has to offer with a full kitchen, four bedrooms featuring 7+ beds, spacious outdoor deck with a grill, and yard space, high-speed internet, and possibly the largest bathtub you've ever seen!
               </p>
            </div>

            {/* Calendar section */}
             <div className="pb-8" id="calendar">
               <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Select check-in date</h3>
               <CalendarGrid />
             </div>

          </div>

          {/* Sticky Booking Sidebar */}
          <div className="w-full lg:w-[320px] xl:w-[350px] shrink-0 pb-10">
             <div className="sticky top-6">
                <BookingSidebar />
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
