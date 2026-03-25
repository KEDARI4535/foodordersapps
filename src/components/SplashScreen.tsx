import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Star } from 'lucide-react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] bg-emerald-500 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 100, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ 
          duration: 1.5, 
          ease: "easeOut",
          type: "spring",
          stiffness: 100
        }}
        className="relative"
      >
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl relative z-10">
          <ChefHat className="w-24 h-24 text-emerald-500" />
        </div>
        <motion.div 
          className="absolute -bottom-4 -right-4 bg-yellow-400 p-4 rounded-2xl shadow-lg z-20"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Star className="w-8 h-8 text-white fill-white" />
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-8 text-center"
      >
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">QuickBite</h1>
        <p className="text-emerald-100 font-medium tracking-wide uppercase text-xs">Fastest Delivery in Town</p>
      </motion.div>

      <div className="absolute bottom-12 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-white rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
