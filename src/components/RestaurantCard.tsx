import React from 'react';
import { Star, Clock, MapPin } from 'lucide-react';
import { Restaurant } from '../types';

export default function RestaurantCard({ restaurant, onClick }: { restaurant: Restaurant; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all cursor-pointer group"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={restaurant.image} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          referrerPolicy="no-referrer" 
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold">
          <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
          {restaurant.rating}
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold mb-1">{restaurant.name}</h3>
        <p className="text-slate-500 text-sm mb-4">{restaurant.cuisine}</p>
        <div className="flex items-center gap-4 text-slate-400 text-xs font-medium">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            25-30 min
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            2.4 km
          </div>
        </div>
      </div>
    </div>
  );
}
