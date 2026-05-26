import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BookingContextType {
  checkIn: Date | null;
  checkOut: Date | null;
  setDates: (start: Date | null, end: Date | null) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const setDates = (start: Date | null, end: Date | null) => {
    setCheckIn(start);
    setCheckOut(end);
  };

  return (
    <BookingContext.Provider value={{ checkIn, checkOut, setDates }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
