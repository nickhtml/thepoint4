/**
 * @file Navbar.tsx
 * @description Renders the global top navigation bar mimicking the Clean Minimalism aesthetic.
 * Input: None. Uses standard internal Link navigation.
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Info, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const location = useLocation();
  const isAdminPath = location.pathname.includes('/admin');
  const { user } = useAuth();

  // Scroll effect state
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolledDown(true); // scrolling down
      } else {
        setIsScrolledDown(false); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <nav className="h-20 md:h-24 px-4 md:px-10 border-b border-gray-100 flex items-center justify-between md:justify-between bg-white shrink-0 z-10 relative shadow-sm">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity outline-none rounded-lg focus:ring-4 ring-slate-200">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-[#0A2540] rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xl md:text-2xl">4</span>
          </div>
          <span className="text-xl md:text-3xl font-black tracking-tight text-[#0A2540]">
            POINT 4 <span className="font-normal text-slate-400 hidden sm:inline">| Arkansas</span>
          </span>
        </Link>
        
        {/* Desktop Links - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-6 md:gap-10">
          <Link 
            to="/" 
            className={`text-xl md:text-2xl font-semibold pb-1 transition-colors ${!isAdminPath && location.pathname !== '/me' && location.pathname !== '/about' ? 'border-b-4 border-[#0A2540] text-[#0A2540]' : 'text-slate-400 hover:text-[#0A2540]'}`}
          >
            Calendar
          </Link>
          {user?.is_admin && (
          <Link 
            to="/admin" 
            className={`text-xl md:text-2xl font-semibold pb-1 transition-colors ${isAdminPath ? 'border-b-4 border-[#0A2540] text-[#0A2540]' : 'text-slate-400 hover:text-[#0A2540]'}`}
          >
            Admin
          </Link>
          )}
          <Link to="/me" className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center ml-2 hover:bg-slate-300 transition-colors overflow-hidden">
             {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
             ) : (
                <span className="text-sm md:text-lg font-bold text-[#0A2540]">{user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}</span>
             )}
          </Link>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Liquid Glass) */}
      <div 
        className={`md:hidden fixed left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-full flex items-center z-50 shadow-[0_20px_40px_rgba(0,0,0,0.5)] justify-between transition-all duration-300 ease-in-out
          ${isScrolledDown ? 'bottom-4 p-1 gap-2 w-[70%] max-w-[280px] opacity-80 scale-90' : 'bottom-6 p-2 sm:p-3 gap-2 sm:gap-6 w-[90%] max-w-[360px] opacity-100 scale-100'}
        `}
      >
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center rounded-full transition-all 
            ${isScrolledDown ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16'}
            ${location.pathname === '/' ? 'bg-white/20 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/10'}
          `}
        >
          <Home className={`${isScrolledDown ? 'w-5 h-5' : 'w-6 h-6 mb-1'}`} />
          {!isScrolledDown && <span className="text-[10px] font-medium hidden sm:block">Book</span>}
        </Link>
        <Link 
          to="/about" 
          className={`flex flex-col items-center justify-center rounded-full transition-all 
            ${isScrolledDown ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16'}
            ${location.pathname === '/about' ? 'bg-white/20 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/10'}
          `}
        >
          <Info className={`${isScrolledDown ? 'w-5 h-5' : 'w-6 h-6 mb-1'}`} />
          {!isScrolledDown && <span className="text-[10px] font-medium hidden sm:block">About</span>}
        </Link>
        <Link 
          to="/me" 
          className={`flex flex-col items-center justify-center rounded-full transition-all 
            ${isScrolledDown ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16'}
            ${location.pathname === '/me' ? 'bg-white/20 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/10'}
          `}
        >
          <User className={`${isScrolledDown ? 'w-5 h-5' : 'w-6 h-6 mb-1'}`} />
          {!isScrolledDown && <span className="text-[10px] font-medium hidden sm:block">Me</span>}
        </Link>
      </div>
    </>
  );
}
