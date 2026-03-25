import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  ChefHat, 
  Truck, 
  ShoppingBag, 
  Phone, 
  User as UserIcon, 
  MapPin, 
  Star,
  Clock
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import MapComponent from './MapComponent';
import { cn } from '../lib/utils';
import { io } from 'socket.io-client';

let socket: any;

export default function OrderTracking({ order, onCancel }: { order: Order, onCancel: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [location, setLocation] = useState(order.deliveryLocation || { lat: 12.9716, lng: 77.5946 });
  const [showRating, setShowRating] = useState(false);
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    setStatus(order.status);
    if (order.deliveryLocation) setLocation(order.deliveryLocation);
    if (order.status === 'delivered') setShowRating(true);
  }, [order.status, order.deliveryLocation]);

  useEffect(() => {
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
    
    socket.on('connect_error', () => {
      console.warn('Socket connection failed. Falling back to Firestore.');
    });

    socket.emit('join_order', order.id);

    socket.on('status_update', (newStatus: OrderStatus) => {
      setStatus(newStatus);
      if (newStatus === 'delivered') setShowRating(true);
    });

    socket.on('location_update', (newLoc: { lat: number; lng: number }) => {
      setLocation(newLoc);
    });

    return () => {
      socket.disconnect();
    };
  }, [order.id]);

  const steps = [
    { id: 'placed', label: 'Order Placed', icon: CheckCircle },
    { id: 'preparing', label: 'Preparing', icon: ChefHat },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: ShoppingBag },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === status);
  const progress = currentStepIndex === -1 ? 0 : ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Prominent ETA and Progress Bar */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">Estimated Delivery</p>
              <h2 className="text-4xl md:text-5xl font-black">
                {status === 'delivered' ? 'Delivered!' : 
                 status === 'cancelled' ? 'Cancelled' :
                 (eta || 'Calculating...')}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <div className={cn("w-2 h-2 rounded-full", status === 'cancelled' ? "bg-red-500" : "bg-emerald-500 animate-ping")} />
                <span className="text-sm font-bold capitalize">{status.replace('_', ' ')}</span>
              </div>
              {(status === 'placed' || status === 'preparing') && (
                <button 
                  onClick={onCancel}
                  className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-4">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: status === 'cancelled' ? '0%' : `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "absolute top-0 left-0 h-full rounded-full",
                status === 'cancelled' ? "bg-red-50" : "bg-gradient-to-r from-emerald-400 to-emerald-600"
              )}
            />
          </div>
          
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-slate-400">
            {steps.map((step, i) => (
              <span key={step.id} className={cn(i <= currentStepIndex && status !== 'cancelled' && "text-emerald-400")}>
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Track Progress</h2>
            <div className="relative">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-start gap-4 mb-8 last:mb-0 relative">
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "absolute left-5 top-10 w-0.5 h-8 bg-slate-100",
                        index < currentStepIndex && "bg-emerald-500"
                      )} />
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center z-10",
                      isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400",
                      isCurrent && "ring-4 ring-emerald-100"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn("font-bold", isActive ? "text-slate-900" : "text-slate-400")}>{step.label}</p>
                      <p className="text-xs text-slate-500">
                        {isActive ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Delivery Details</h3>
              <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-bold text-sm">
                OTP: {order.otp}
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold">Rahul Sharma</p>
                <p className="text-xs text-slate-500">Your Delivery Partner</p>
              </div>
              <a href={`tel:${order.deliveryPhone || '9876543210'}`} className="bg-slate-100 p-3 rounded-full hover:bg-emerald-500 hover:text-white transition-all">
                <Phone className="w-5 h-5" />
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Delivery Address</p>
              <p className="text-sm font-medium">
                {order.deliveryLocation 
                  ? `Location: ${order.deliveryLocation.lat.toFixed(4)}, ${order.deliveryLocation.lng.toFixed(4)}`
                  : '123, Green Valley, Indiranagar, Bangalore'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden min-h-[400px] relative border border-slate-200 shadow-sm">
          <MapComponent 
            deliveryLocation={location} 
            restaurantLocation={order.restaurantLocation}
            customerLocation={order.customerLocation}
            status={status}
          />
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-2xl text-xs font-bold flex items-center gap-2 z-10">
            <MapPin className="w-4 h-4 text-emerald-500" />
            Live Tracking Enabled
          </div>
        </div>
      </div>

      {showRating && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-10 h-10 text-emerald-500 fill-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Enjoy your meal!</h2>
            <p className="text-slate-500 mb-8">How was your delivery experience with Rahul?</p>
            
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} className="p-1 hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 text-slate-200 hover:text-yellow-400 hover:fill-yellow-400" />
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowRating(false)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold"
            >
              Submit Rating
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
