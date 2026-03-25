import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChefHat, IndianRupee } from 'lucide-react';
import { Restaurant, MenuItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

export default function RestaurantManagement({ 
  restaurant, 
  onUpdate, 
  onDelete 
}: { 
  restaurant: Restaurant; 
  onUpdate: (updated: Restaurant) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRestaurant, setEditedRestaurant] = useState(restaurant);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    description: '',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
  });

  const handleAddItem = () => {
    if (newItem.name && newItem.price) {
      const item: MenuItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: newItem.name!,
        price: Number(newItem.price),
        description: newItem.description || '',
        image: newItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
      };
      const updated = { ...editedRestaurant, menu: [...editedRestaurant.menu, item] };
      setEditedRestaurant(updated);
      onUpdate(updated);
      setNewItem({ name: '', price: 0, description: '', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80' });
    }
  };

  const handleRemoveItem = (id: string) => {
    const updated = { ...editedRestaurant, menu: editedRestaurant.menu.filter(item => item.id !== id) };
    setEditedRestaurant(updated);
    onUpdate(updated);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{restaurant.name}</h2>
            <p className="text-slate-500 font-medium">{restaurant.cuisine}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={onDelete}
            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4 border-b border-slate-100 pb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                type="text" 
                placeholder="Restaurant Name"
                value={editedRestaurant.name}
                onChange={(e) => setEditedRestaurant({ ...editedRestaurant, name: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input 
                type="text" 
                placeholder="Cuisine (e.g. Italian, Burgers)"
                value={editedRestaurant.cuisine}
                onChange={(e) => setEditedRestaurant({ ...editedRestaurant, cuisine: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <select
                value={editedRestaurant.foodCategory || ''}
                onChange={(e) => setEditedRestaurant({ ...editedRestaurant, foodCategory: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                <option value="">Select Category</option>
                <option value="meals">Meals</option>
                <option value="sweets">Sweets</option>
                <option value="fast_food">Fast Food</option>
                <option value="juice">Juice</option>
              </select>
            </div>
            <button 
              onClick={() => { onUpdate(editedRestaurant); setIsEditing(false); }}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Save Changes
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          Menu Items <span className="text-sm font-normal text-slate-400">({restaurant.menu.length})</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurant.menu.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
              <img src={item.image} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
              <div className="flex-1">
                <p className="font-bold text-slate-900">{item.name}</p>
                <p className="text-emerald-600 font-bold text-sm flex items-center">
                  <IndianRupee className="w-3 h-3" /> {item.price}
                </p>
              </div>
              <button 
                onClick={() => handleRemoveItem(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" 
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="p-3 bg-white rounded-xl border border-emerald-100 text-sm outline-none"
              />
              <input 
                type="number" 
                placeholder="Price"
                value={newItem.price || ''}
                onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                className="p-3 bg-white rounded-xl border border-emerald-100 text-sm outline-none"
              />
            </div>
            <button 
              onClick={handleAddItem}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
