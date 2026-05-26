/**
 * @file CheckoutModal.tsx
 * @description Renders a full-screen, high-contrast accountability overlay forcing the user to complete checkout tasks.
 * Input: `onComplete` - A callback executed when all tasks are physically checked off and confirmed.
 */
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHECKLIST_TASKS = [
  "Empty all food from the refrigerator",
  "Strip all bed linens and leave in laundry room",
  "Set thermostat to 78°F before leaving",
  "Ensure all doors and windows are locked"
];

export function CheckoutModal({ onComplete }: { onComplete: () => void }) {
  const [completedTasks, setCompletedTasks] = useState<boolean[]>(new Array(CHECKLIST_TASKS.length).fill(false));
  const [isSuccess, setIsSuccess] = useState(false);

  const toggleTask = (index: number) => {
    const newTasks = [...completedTasks];
    newTasks[index] = !newTasks[index];
    setCompletedTasks(newTasks);
  };

  const allCompleted = completedTasks.every(Boolean);

  const handleComplete = () => {
    setIsSuccess(true);
    
    // Confetti blast
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    setTimeout(() => {
      onComplete();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-[#0A2540]/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12 z-[100] overflow-y-auto">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div 
            key="modal"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -200, rotate: 10, scale: 0.8, filter: "blur(10px)" }} // Rip up animation
            transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
            className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative my-auto cursor-default"
          >
            {/* Close Button */}
            <button 
              onClick={() => onComplete()}
              className="absolute top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors z-20 text-white border-2 border-transparent hover:border-white/50"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-[#0A2540] p-10 md:p-16 text-white text-center md:text-left relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 mix-blend-overlay"></div>
               <div className="relative z-10 pr-12">
                 <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Checkout Checklist</h2>
                 <p className="text-slate-300 text-xl md:text-2xl font-medium max-w-2xl leading-relaxed">Time to head home! Please confirm these tasks to release the property and finalize your stay.</p>
               </div>
            </div>
            
            <div className="p-8 md:p-16 space-y-6 md:space-y-8 bg-slate-50 relative">
              <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#0A2540]/5 to-transparent"></div>
              {CHECKLIST_TASKS.map((task, idx) => {
                const isChecked = completedTasks[idx];
                return (
                  <motion.div 
                    layout
                    key={idx} 
                    onClick={() => toggleTask(idx)}
                    className={cn(
                      "flex items-center gap-6 cursor-pointer group p-6 -ml-6 rounded-3xl transition-all border-2",
                      "active:scale-[0.98]",
                      isChecked ? "bg-green-50/80 border-green-200" : "bg-white border-transparent hover:border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md"
                    )}
                    role="checkbox"
                    aria-checked={isChecked}
                  >
                    <div className={cn(
                      "w-12 h-12 md:w-16 md:h-16 border-4 rounded-[20px] flex-shrink-0 flex items-center justify-center transition-all",
                      isChecked 
                        ? "bg-green-500 border-green-500 text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)] scale-110" 
                        : "border-slate-200 bg-white group-hover:border-[#0A2540]"
                    )}>
                      {isChecked && <Check strokeWidth={4} className="w-8 h-8 md:w-10 md:h-10" />}
                    </div>
                    <label className={cn(
                      "text-xl md:text-3xl font-semibold cursor-pointer select-none transition-colors leading-tight flex-1",
                      isChecked ? "text-green-800 line-through opacity-50" : "text-[#0A2540]"
                    )}>
                      {task}
                    </label>
                  </motion.div>
                );
              })}
              
              <div className="pt-10">
                <button 
                  disabled={!allCompleted}
                  onClick={handleComplete}
                  className={cn(
                    "w-full min-h-[100px] text-white text-2xl md:text-4xl font-black rounded-[30px] shadow-lg transition-all uppercase tracking-widest relative overflow-hidden",
                    allCompleted 
                      ? "bg-green-600 border-green-800 hover:bg-green-500 hover:-translate-y-2 active:translate-y-2 cursor-pointer shadow-[0_20px_40px_rgba(22,163,74,0.3)]" 
                      : "bg-slate-200 text-slate-400 border-slate-300 opacity-60 cursor-not-allowed"
                  )}
                  style={{
                    borderBottomWidth: allCompleted ? '12px' : '4px'
                  }}
                >
                  <span className={cn("transition-transform block", allCompleted ? "active:translate-y-2" : "")}>
                    Complete Checkout
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ type: "spring", damping: 12, stiffness: 100 }}
            className="fixed inset-0 flex items-center justify-center flex-col z-[110] pointer-events-none"
          >
            <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8">
               <Check strokeWidth={4} className="w-24 h-24 text-green-500" />
            </div>
            <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-white text-5xl md:text-7xl font-black tracking-tight drop-shadow-xl text-center px-4"
            >
              Checkout Complete
            </motion.h2>
            <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.4 }}
               className="text-slate-200 text-2xl md:text-4xl mt-4 font-medium px-4 text-center"
            >
               Thank you. Have a great trip home!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
