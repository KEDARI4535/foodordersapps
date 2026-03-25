import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { io, Socket } from 'socket.io-client';
import { 
  GoogleMap, 
  Marker, 
  Polyline, 
  useJsApiLoader,
  InfoWindow
} from '@react-google-maps/api';
import { auth, db, firebaseApiKey } from './firebase';
import { Restaurant, Order, UserProfile, MenuItem, OrderStatus, AppNotification } from './types';
import { GoogleGenAI } from "@google/genai";
import RestaurantMap from './components/RestaurantMap';
import { 
  ShoppingBag, 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  CheckCircle, 
  Truck, 
  ChefHat,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Plus,
  Minus,
  X,
  Edit,
  Trash2,
  Save,
  Search,
  Navigation,
  Map as MapIcon,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: any[];
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Permission Error: ${operationType} on ${path}`);
  throw new Error(JSON.stringify(errInfo));
}

// Socket initialization
const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000,
});

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

// Smooth location interpolation hook
function useSmoothLocation(targetLocation: { lat: number; lng: number }) {
  const [currentLocation, setCurrentLocation] = useState(targetLocation);
  
  useEffect(() => {
    let animationFrameId: number;
    const startTime = Date.now();
    const duration = 2000; // 2 seconds to reach target
    const startLoc = { ...currentLocation };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Simple linear interpolation
      const lat = startLoc.lat + (targetLocation.lat - startLoc.lat) * progress;
      const lng = startLoc.lng + (targetLocation.lng - startLoc.lng) * progress;
      
      setCurrentLocation({ lat, lng });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetLocation.lat, targetLocation.lng]);

  return currentLocation;
}

function useLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding using Google Maps API (via backend proxy or direct if key is available)
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || firebaseApiKey;
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
          const data = await response.json();
          const city = data.results?.[0]?.address_components?.find((c: any) => c.types.includes("locality"))?.long_name;
          
          setLocation({ lat: latitude, lng: longitude, city });
          setError(null);
        } catch (err) {
          setLocation({ lat: latitude, lng: longitude });
          console.error("Reverse geocoding failed", err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  return { location, error, loading, getLocation, setLocation };
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
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

function MapComponent({ 
  deliveryLocation, 
  restaurantLocation, 
  customerLocation,
  status 
}: { 
  deliveryLocation: { lat: number; lng: number };
  restaurantLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  status: OrderStatus;
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || firebaseApiKey || ''
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  
  const smoothDeliveryLocation = useSmoothLocation(deliveryLocation);

  useEffect(() => {
    if (isLoaded && deliveryLocation && customerLocation && status === 'out_for_delivery') {
      fetch(`/api/distance-matrix?origins=${deliveryLocation.lat},${deliveryLocation.lng}&destinations=${customerLocation.lat},${customerLocation.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data.rows?.[0]?.elements?.[0]?.duration?.text) {
            setEta(data.rows[0].elements[0].duration.text);
          }
        })
        .catch(err => console.error("Error fetching ETA:", err));
    }
  }, [isLoaded, deliveryLocation, customerLocation, status]);

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Map...</div>;

  const path = [
    restaurantLocation || defaultCenter,
    smoothDeliveryLocation || defaultCenter,
    customerLocation || defaultCenter
  ].filter(Boolean) as google.maps.LatLngLiteral[];

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={smoothDeliveryLocation || defaultCenter}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true
        }}
      >
        {restaurantLocation && (
          <Marker 
            position={restaurantLocation} 
            label="R"
            title="Restaurant"
          />
        )}
        
        {customerLocation && (
          <Marker 
            position={customerLocation} 
            label="C"
            title="Customer"
          />
        )}

        {smoothDeliveryLocation && (
          <Marker 
            position={smoothDeliveryLocation}
            icon={{
              url: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
              scaledSize: new google.maps.Size(40, 40),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(20, 20)
            }}
            title="Delivery Partner"
          />
        )}

        {status === 'out_for_delivery' && restaurantLocation && customerLocation && (
          <Polyline
            path={[restaurantLocation, smoothDeliveryLocation, customerLocation]}
            options={{
              strokeColor: "#10b981",
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>
      
      {eta && status === 'out_for_delivery' && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-emerald-100 z-10 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold">Arriving in {eta}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [view, setView] = useState<'home' | 'restaurant' | 'cart' | 'tracking' | 'profile' | 'delivery' | 'management' | 'history'>('home');
  const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { location: userLocation, error: locationError, loading: isLocating, getLocation: getUserLocation, setLocation: setUserLocation } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Seed data function
  const seedData = async () => {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef);
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const sampleRestaurants = [
          {
            name: "Burger King",
            cuisine: "Fast Food, Burgers",
            rating: 4.5,
            image: "https://picsum.photos/seed/burger/800/600",
            location: { lat: 12.9716, lng: 77.5946 },
            menu: [
              { id: "bk1", name: "Whopper", price: 12, description: "Flame-grilled beef patty", image: "https://picsum.photos/seed/whopper/400/400" },
              { id: "bk2", name: "Chicken Royale", price: 10, description: "Crispy chicken breast", image: "https://picsum.photos/seed/chicken/400/400" }
            ]
          },
          {
            name: "Pizza Hut",
            cuisine: "Italian, Pizza",
            rating: 4.2,
            image: "https://picsum.photos/seed/pizza/800/600",
            location: { lat: 12.9816, lng: 77.6046 },
            menu: [
              { id: "ph1", name: "Margherita", price: 15, description: "Classic cheese pizza", image: "https://picsum.photos/seed/margherita/400/400" },
              { id: "ph2", name: "Pepperoni", price: 18, description: "Spicy pepperoni pizza", image: "https://picsum.photos/seed/pepperoni/400/400" }
            ]
          }
        ];
        for (const res of sampleRestaurants) {
          await addDoc(restaurantsRef, res);
        }
        toast.success('Sample data seeded!');
      }
    } catch (error) {
      // Silently fail seeding if not admin, or log it
      console.warn('Seeding skipped or failed:', error);
    }
  };

  useEffect(() => {
    if (profile?.role === 'delivery') {
      const q = query(collection(db, 'orders'), where('status', 'in', ['placed', 'preparing', 'out_for_delivery']));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setDeliveryOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    seedData();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'orders'), where('customerUid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOrderHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
      return () => unsubscribe();
    }
  }, [user]);

  const addNotification = async (userId: string, title: string, message: string, type: AppNotification['type'], orderId?: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        orderId,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      const orderData = orderSnap.data() as Order;

      await updateDoc(orderRef, { 
        status: newStatus,
        deliveryAgentUid: user?.uid,
        deliveryPhone: profile?.phoneNumber || '9876543210'
      });
      
      socket.emit('update_status', { orderId, status: newStatus });
      
      // Add notification for customer
      let title = "";
      let message = "";
      let type: AppNotification['type'] = 'order_accepted';

      if (newStatus === 'preparing') {
        title = "Order Accepted";
        message = "Your order is being prepared!";
        type = 'order_accepted';
      } else if (newStatus === 'out_for_delivery') {
        title = "Out for Delivery";
        message = "Your order is on the way!";
        type = 'out_for_delivery';
      } else if (newStatus === 'delivered') {
        title = "Order Delivered";
        message = "Enjoy your meal!";
        type = 'delivered';
      }

      if (title) {
        await addNotification(orderData.customerUid, title, message, type, orderId);
      }

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, { status: 'cancelled' });
      
      socket.emit('update_status', { orderId: order.id, status: 'cancelled' });
      
      // Notify restaurant/admin
      await addNotification(order.restaurantId, "Order Cancelled", `Order #${order.id.slice(-6)} has been cancelled by the customer.`, 'order_accepted', order.id);
      
      toast.success("Order cancelled successfully");
      setOrderToCancel(null);
      if (activeOrder?.id === order.id) {
        setActiveOrder(null);
        setView('history');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const updateDeliveryLocation = (orderId: string) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // 1. Socket.IO for real-time broadcast
        socket.emit('update_location', { orderId, location });
        
        // 2. Firestore for persistent storage
        updateDoc(doc(db, 'orders', orderId), { deliveryLocation: location });
        
        // 3. Backend API for external integrations (as requested)
        fetch('/api/location/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, ...location })
        }).catch(err => console.error("API Location Update Error:", err));
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
    try {
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          role: 'customer',
          isOnline: false
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Fetch restaurants
    const restaurantsUnsubscribe = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      const restaurantData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      setRestaurants(restaurantData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'restaurants');
    });

    // Socket connection feedback
    socket.on('connect_error', () => {
      console.warn('Socket connection failed. Falling back to Firestore for real-time updates.');
    });

    return () => {
      unsubscribe();
      restaurantsUnsubscribe();
      socket.off('connect_error');
    };
  }, []);

  // Listen for active order
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'orders'), 
        where('customerUid', '==', user.uid),
        where('status', 'in', ['placed', 'preparing', 'out_for_delivery'])
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const order = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Order;
          setActiveOrder(order);
          socket.emit('join_order', order.id);
        } else {
          setActiveOrder(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Logged out');
    setView('home');
  };

  const handleReorder = (order: Order) => {
    const restaurant = restaurants.find(r => r.id === order.restaurantId);
    if (!restaurant) {
      toast.error('Restaurant not found');
      return;
    }

    const newCart = order.items.map(item => {
      const menuItem = restaurant.menu.find(m => m.id === item.menuItemId);
      if (!menuItem) return null;
      return { item: menuItem, quantity: item.quantity };
    }).filter(Boolean) as { item: MenuItem; quantity: number }[];

    setCart(newCart);
    setSelectedRestaurant(restaurant);
    setView('cart');
    toast.success('Items added to cart!');
  };

  const categories = [
    { id: 'sweets', name: 'Sweets', icon: '🍰', image: 'https://picsum.photos/seed/sweets/200/200' },
    { id: 'juice', name: 'Juice', icon: '🥤', image: 'https://picsum.photos/seed/juice/200/200' },
    { id: 'fast_food', name: 'Fast Food', icon: '🍔', image: 'https://picsum.photos/seed/fastfood/200/200' },
    { id: 'meals', name: 'Meals', icon: '🍱', image: 'https://picsum.photos/seed/meals/200/200' },
  ];

  const filteredRestaurants = restaurants.filter(res => {
    const matchesCategory = !selectedCategory || 
      res.cuisine.toLowerCase().includes(selectedCategory.replace('_', ' ')) ||
      (res.foodCategory && res.foodCategory.toLowerCase() === selectedCategory.toLowerCase());
    
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || 
      res.name.toLowerCase().includes(query) || 
      res.menu.some(item => item.name.toLowerCase().includes(query));
      
    return matchesCategory && matchesQuery;
  });

  const city = userLocation?.city;
  const hookIsLocating = isLocating;

  const handleGeminiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: searchQuery,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : { latitude: 17.3850, longitude: 78.4867 }
            }
          }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setSearchResults(chunks.filter((c: any) => c.maps).map((c: any) => c.maps));
      } else {
        toast('No results found from Google Maps');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search nearby');
    } finally {
      setIsSearching(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const placeOrder = async () => {
    if (!user || cart.length === 0 || !selectedRestaurant) return;

    const total = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const orderData = {
      customerUid: user.uid,
      restaurantId: selectedRestaurant.id,
      items: cart.map(i => ({ menuItemId: i.item.id, name: i.item.name, price: i.item.price, quantity: i.quantity })),
      total,
      status: 'placed' as OrderStatus,
      otp,
      createdAt: new Date().toISOString(),
      customerPhone: profile?.phoneNumber || '9876543210',
      deliveryLocation: userLocation || defaultCenter,
      customerLocation: userLocation || defaultCenter,
      restaurantLocation: selectedRestaurant.location || defaultCenter
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setView('tracking');
      toast.success('Order placed successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Toaster position="top-center" />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-emerald-500 p-2 rounded-xl">
            <ChefHat className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">FooDo</span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button 
                onClick={() => setView('history')}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Clock className="w-6 h-6" />
              </button>
              <div className="relative group">
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative">
                  <CheckCircle className="w-6 h-6" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold w-3 h-3 rounded-full flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 hidden group-hover:block z-[60]">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold">Notifications</span>
                    <button 
                      onClick={async () => {
                        for (const n of notifications.filter(n => !n.read)) {
                          await updateDoc(doc(db, 'notifications', n.id), { read: true });
                        }
                      }}
                      className="text-xs text-emerald-600 font-bold"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-8 text-center text-slate-400 text-sm">No notifications</p>
                    ) : (
                      notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(n => (
                        <div key={n.id} className={cn("p-4 border-b border-slate-50 last:border-0", !n.read && "bg-emerald-50/50")}>
                          <p className="font-bold text-sm">{n.title}</p>
                          <p className="text-xs text-slate-500">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleTimeString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setView('cart')}
                className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ShoppingBag className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setView('profile')}
                className="flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 rounded-full transition-colors"
              >
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full bg-slate-200" referrerPolicy="no-referrer" />
                <span className="text-sm font-medium hidden sm:block">{profile?.displayName}</span>
              </button>
            </>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-slate-900 text-white px-6 py-2 rounded-full font-medium hover:bg-slate-800 transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Search Bar */}
              <div className="mb-12 max-w-3xl mx-auto">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-12 pr-32 py-5 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg"
                    placeholder="FooDo"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGeminiSearch()}
                  />
                  <button
                    onClick={handleGeminiSearch}
                    disabled={isSearching}
                    className="absolute right-3 top-3 bottom-3 px-6 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSearching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Search
                  </button>
                </div>
                <p className="mt-3 text-center text-sm text-slate-400 font-medium flex items-center justify-center gap-2">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  AI-powered search for nearby restaurants
                </p>

                {/* Search Results from Google Maps */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden z-20 relative"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <MapIcon className="w-4 h-4" />
                          Nearby from Google Maps
                        </span>
                        <button onClick={() => setSearchResults([])} className="text-slate-400 hover:text-slate-600 p-1">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map((result, idx) => (
                          <a
                            key={idx}
                            href={result.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex-1 pr-4">
                              <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors text-lg">{result.title}</h4>
                              <p className="text-sm text-slate-500 truncate">{result.uri}</p>
                            </div>
                            <div className="bg-slate-100 p-2 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Categories */}
              <div className="mb-12">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  What's on your mind?
                </h2>
                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 min-w-[100px] transition-all",
                        selectedCategory === cat.id ? "scale-110" : "hover:scale-105"
                      )}
                    >
                      <div className={cn(
                        "w-20 h-20 rounded-full overflow-hidden border-2 transition-all",
                        selectedCategory === cat.id ? "border-emerald-500 shadow-lg" : "border-transparent"
                      )}>
                        <img src={cat.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className={cn(
                        "text-sm font-bold",
                        selectedCategory === cat.id ? "text-emerald-600" : "text-slate-600"
                      )}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    {selectedCategory ? `${categories.find(c => c.id === selectedCategory)?.name} Restaurants` : 'Popular Restaurants'}
                  </h1>
                  <p className="text-slate-500">
                    {searchQuery ? `Showing results for "${searchQuery}"` : 'Discover the best food in your area'}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        viewMode === 'list' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      List
                    </button>
                    <button 
                      onClick={() => setViewMode('map')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        viewMode === 'map' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Map
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="bg-emerald-50 p-1.5 rounded-lg">
                      <MapPin className="text-emerald-500 w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Your Location</span>
                      <span className="text-sm font-bold text-slate-700">
                        {city || (userLocation ? `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}` : 'Not set')}
                      </span>
                    </div>
                    <button 
                      onClick={getUserLocation}
                      disabled={isLocating}
                      className="ml-4 p-2 bg-slate-50 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all disabled:opacity-50"
                      title="Get current location"
                    >
                      <Navigation className={cn("w-4 h-4", isLocating && "animate-spin")} />
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRestaurants.map(res => (
                    <RestaurantCard 
                      key={res.id} 
                      restaurant={res} 
                      onClick={() => {
                        setSelectedRestaurant(res);
                        setView('restaurant');
                      }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="h-[600px] w-full mb-12">
                  <RestaurantMap restaurants={filteredRestaurants} />
                </div>
              )}

              {filteredRestaurants.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Search className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    We couldn't find any restaurants matching your search. Try a different category or keyword.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'restaurant' && selectedRestaurant && (
            <motion.div 
              key="restaurant"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button 
                onClick={() => setView('home')}
                className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="rotate-180 w-4 h-4" />
                Back to Restaurants
              </button>

              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 mb-8">
                <img src={selectedRestaurant.image} className="w-full h-64 object-cover" referrerPolicy="no-referrer" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-1">{selectedRestaurant.name}</h1>
                      <p className="text-slate-500">{selectedRestaurant.cuisine}</p>
                    </div>
                    <div className="bg-emerald-50 px-3 py-1 rounded-lg flex items-center gap-1 text-emerald-700 font-bold">
                      <Star className="w-4 h-4 fill-emerald-700" />
                      {selectedRestaurant.rating}
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-6">Menu</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRestaurant.menu.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 hover:shadow-md transition-shadow">
                    <img src={item.image} className="w-24 h-24 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="text-slate-500 text-sm line-clamp-2 mb-2">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-600">${item.price}</span>
                        <button 
                          onClick={() => addToCart(item)}
                          className="bg-slate-100 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'cart' && (
            <motion.div 
              key="cart"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
              {cart.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                  <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-6">Your cart is empty</p>
                  <button 
                    onClick={() => setView('home')}
                    className="bg-emerald-500 text-white px-8 py-3 rounded-full font-bold"
                  >
                    Browse Restaurants
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="mb-6 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-xl">
                          <MapPin className="text-emerald-600 w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Address</p>
                          <p className="font-medium">
                            {userLocation ? `Current Location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})` : 'No location set'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={getUserLocation}
                        disabled={isLocating}
                        className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                      >
                        {isLocating ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                        {userLocation ? 'Update' : 'Get Location'}
                      </button>
                    </div>

                    {cart.map(item => (
                      <div key={item.item.id} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-4">
                          <img src={item.item.image} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <h3 className="font-bold">{item.item.name}</h3>
                            <p className="text-emerald-600 font-bold">${item.item.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => updateQuantity(item.item.id, -1)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.item.id, 1)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-bold">${cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-6">
                      <span className="text-slate-500">Delivery Fee</span>
                      <span className="font-bold">$2.99</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t border-slate-100 pt-4 mb-8">
                      <span>Total</span>
                      <span>${(cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0) + 2.99).toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={placeOrder}
                      className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-colors"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'tracking' && activeOrder && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button 
                onClick={() => setView('home')}
                className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="rotate-180 w-4 h-4" />
                Back to Home
              </button>
              <OrderTracking order={activeOrder} onCancel={() => setOrderToCancel(activeOrder)} />
            </motion.div>
          )}

          {view === 'delivery' && profile && (
            <motion.div 
              key="delivery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold">Delivery Dashboard</h1>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                  <span className={cn("text-sm font-bold", profile.isOnline ? "text-emerald-600" : "text-slate-400")}>
                    {profile.isOnline ? 'Online' : 'Offline'}
                  </span>
                  <button 
                    onClick={async () => {
                      const newStatus = !profile.isOnline;
                      try {
                        await updateDoc(doc(db, 'users', profile.uid), { isOnline: newStatus });
                        setProfile({ ...profile, isOnline: newStatus });
                        toast.success(`You are now ${newStatus ? 'Online' : 'Offline'}`);
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
                      }
                    }}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none",
                      profile.isOnline ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200",
                      profile.isOnline ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {!profile.isOnline ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Truck className="w-10 h-10 text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">You are currently Offline</h2>
                  <p className="text-slate-500 mb-8">Go online to start receiving and managing delivery orders.</p>
                  <button 
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'users', profile.uid), { isOnline: true });
                        setProfile({ ...profile, isOnline: true });
                        toast.success('You are now Online');
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
                      }
                    }}
                    className="bg-emerald-500 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-600 transition-colors"
                  >
                    Go Online
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {deliveryOrders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                      <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No active orders available</p>
                    </div>
                  ) : (
                    deliveryOrders.map(order => (
                      <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Order #{order.id.slice(-6)}</p>
                            <h3 className="text-xl font-bold">Total: ${order.total}</h3>
                          </div>
                          <div className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold uppercase">
                            {order.status}
                          </div>
                        </div>

                        <div className="space-y-4 mb-8">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium">${item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          {order.status === 'placed' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold"
                            >
                              Accept Order
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button 
                              onClick={() => {
                                updateOrderStatus(order.id, 'out_for_delivery');
                                updateDeliveryLocation(order.id);
                              }}
                              className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold"
                            >
                              Mark Out for Delivery
                            </button>
                          )}
                          {order.status === 'out_for_delivery' && (
                            <div className="flex-1 flex gap-2">
                              <input 
                                id={`otp-${order.id}`}
                                type="text" 
                                placeholder="Enter OTP" 
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-center"
                              />
                              <button 
                                onClick={() => {
                                  const input = document.getElementById(`otp-${order.id}`) as HTMLInputElement;
                                  if (input.value === order.otp) {
                                    updateOrderStatus(order.id, 'delivered');
                                  } else {
                                    toast.error('Invalid OTP');
                                  }
                                }}
                                className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold"
                              >
                                Complete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'management' && user && (
            <RestaurantManagement user={user} />
          )}

          {view === 'history' && (
            <OrderHistory 
              orders={orderHistory} 
              onReorder={handleReorder} 
              onCancel={(order) => setOrderToCancel(order)}
            />
          )}

          {view === 'profile' && profile && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="text-center mb-8">
                <img src={user?.photoURL || ''} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-emerald-50" referrerPolicy="no-referrer" />
                <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                <p className="text-slate-500">{profile.email}</p>
                <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {profile.role}
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={async () => {
                    const roles: ('customer' | 'delivery' | 'owner' | 'admin')[] = ['customer', 'delivery', 'owner', 'admin'];
                    const currentIndex = roles.indexOf(profile.role);
                    const newRole = roles[(currentIndex + 1) % roles.length];
                    try {
                      await updateDoc(doc(db, 'users', profile.uid), { role: newRole });
                      setProfile({ ...profile, role: newRole });
                      toast.success(`Switched to ${newRole} mode`);
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium">Switch Role (Current: {profile.role})</span>
                  <ChevronRight className="w-5 h-5" />
                </button>

                {profile.role === 'delivery' && (
                  <button 
                    onClick={() => setView('delivery')}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5" />
                      <span className="font-medium">Delivery Dashboard</span>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {profile.role === 'owner' && (
                  <button 
                    onClick={() => setView('management')}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChefHat className="w-5 h-5" />
                      <span className="font-medium">Restaurant Management</span>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Cancel Order Confirmation Modal */}
      <AnimatePresence>
        {orderToCancel && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Cancel Order?</h2>
              <p className="text-slate-500 mb-8">Are you sure you want to cancel order #{orderToCancel.id.slice(-6)}? This action cannot be undone.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleCancelOrder(orderToCancel)}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors"
                >
                  Yes, Cancel Order
                </button>
                <button 
                  onClick={() => setOrderToCancel(null)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Keep Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Active Order Bar */}
      {activeOrder && view !== 'tracking' && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer"
          onClick={() => setView('tracking')}
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg animate-pulse">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Order</p>
              <p className="font-bold capitalize">{activeOrder.status.replace('_', ' ')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </motion.div>
      )}
    </div>
  );
}

function OrderHistory({ orders, onReorder, onCancel }: { orders: Order[], onReorder: (order: Order) => void, onCancel: (order: Order) => void }) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Order History</h1>
      {sortedOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Order #{order.id.slice(-6)}</p>
                  <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase",
                  order.status === 'delivered' ? "bg-emerald-50 text-emerald-700" : 
                  order.status === 'cancelled' ? "bg-red-50 text-red-700" :
                  "bg-blue-50 text-blue-700"
                )}>
                  {order.status.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.quantity}x {item.name}</span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-lg font-bold">Total: ${order.total.toFixed(2)}</span>
                <div className="flex gap-2">
                  {(order.status === 'placed' || order.status === 'preparing') && (
                    <button 
                      onClick={() => onCancel(order)}
                      className="bg-red-50 text-red-500 px-6 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={() => onReorder(order)}
                    className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Reorder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantManagement({ user }: { user: User }) {
  const [myRestaurants, setMyRestaurants] = useState<Restaurant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [newRestaurant, setNewRestaurant] = useState<Partial<Restaurant>>({
    name: '',
    cuisine: '',
    image: '',
    rating: 4.0,
    menu: []
  });

  useEffect(() => {
    const q = query(collection(db, 'restaurants'), where('ownerUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'restaurants');
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveRestaurant = async () => {
    if (!newRestaurant.name || !newRestaurant.cuisine) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingRestaurant) {
        await updateDoc(doc(db, 'restaurants', editingRestaurant.id), newRestaurant);
        toast.success('Restaurant updated');
      } else {
        await addDoc(collection(db, 'restaurants'), {
          ...newRestaurant,
          ownerUid: user.uid,
          rating: 4.0,
          menu: []
        });
        toast.success('Restaurant added');
      }
      setIsAdding(false);
      setEditingRestaurant(null);
      setNewRestaurant({ name: '', cuisine: '', image: '', rating: 4.0, menu: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'restaurants');
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    setRestaurantToDelete(id);
  };

  const confirmDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;
    try {
      await deleteDoc(doc(db, 'restaurants', restaurantToDelete));
      toast.success('Restaurant deleted');
      setRestaurantToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `restaurants/${restaurantToDelete}`);
    }
  };

  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);

  const handleAddMenuItem = (restaurant: Restaurant) => {
    const newItem: MenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Item',
      price: 0,
      description: '',
      image: 'https://picsum.photos/seed/food/200/200'
    };
    const updatedMenu = [...restaurant.menu, newItem];
    updateDoc(doc(db, 'restaurants', restaurant.id), { menu: updatedMenu });
  };

  const handleUpdateMenuItem = (restaurant: Restaurant, itemId: string, updates: Partial<MenuItem>) => {
    const updatedMenu = restaurant.menu.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateDoc(doc(db, 'restaurants', restaurant.id), { menu: updatedMenu });
  };

  const handleDeleteMenuItem = (restaurant: Restaurant, itemId: string) => {
    const updatedMenu = restaurant.menu.filter(item => item.id !== itemId);
    updateDoc(doc(db, 'restaurants', restaurant.id), { menu: updatedMenu });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Restaurants</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Restaurant
        </button>
      </div>

      {(isAdding || editingRestaurant) && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold">{editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Restaurant Name" 
              className="w-full p-3 rounded-xl border border-slate-200"
              value={newRestaurant.name}
              onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Cuisine" 
              className="w-full p-3 rounded-xl border border-slate-200"
              value={newRestaurant.cuisine}
              onChange={e => setNewRestaurant({...newRestaurant, cuisine: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Image URL" 
              className="w-full p-3 rounded-xl border border-slate-200"
              value={newRestaurant.image}
              onChange={e => setNewRestaurant({...newRestaurant, image: e.target.value})}
            />
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setNewRestaurant({
                      ...newRestaurant,
                      location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    });
                    toast.success('Restaurant location set to current coordinates');
                  });
                }
              }}
              className="flex items-center gap-2 bg-slate-100 p-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <MapPin className="w-4 h-4" />
              {newRestaurant.location ? 'Location Set' : 'Set to Current Location'}
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSaveRestaurant}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold"
            >
              Save
            </button>
            <button 
              onClick={() => {
                setIsAdding(false);
                setEditingRestaurant(null);
                setNewRestaurant({ name: '', cuisine: '', image: '', rating: 4.0, menu: [] });
              }}
              className="bg-slate-100 px-6 py-2 rounded-xl font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {myRestaurants.map(res => (
          <div key={res.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src={res.image} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="text-xl font-bold">{res.name}</h3>
                  <p className="text-slate-500">{res.cuisine}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingRestaurant(res);
                    setNewRestaurant(res);
                  }}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteRestaurant(res.id)}
                  className="p-2 rounded-full hover:bg-red-50 text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold">Menu Items</h4>
                <button 
                  onClick={() => handleAddMenuItem(res)}
                  className="text-indigo-600 text-sm font-bold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {res.menu.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <img src={item.image} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input 
                        type="text" 
                        className="bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                        value={item.name}
                        onChange={e => handleUpdateMenuItem(res, item.id, { name: e.target.value })}
                      />
                      <input 
                        type="number" 
                        className="bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                        value={item.price}
                        onChange={e => handleUpdateMenuItem(res, item.id, { price: parseFloat(e.target.value) })}
                      />
                      <input 
                        type="text" 
                        className="bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                        value={item.description}
                        onChange={e => handleUpdateMenuItem(res, item.id, { description: e.target.value })}
                      />
                    </div>
                    <button 
                      onClick={() => handleDeleteMenuItem(res, item.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {restaurantToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Delete Restaurant?</h2>
              <p className="text-slate-500 mb-8">Are you sure you want to delete this restaurant? This action cannot be undone.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeleteRestaurant}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors"
                >
                  Yes, Delete
                </button>
                <button 
                  onClick={() => setRestaurantToDelete(null)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RestaurantCard({ restaurant, onClick }: { restaurant: Restaurant; onClick: () => void; key?: string }) {
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

function OrderTracking({ order, onCancel }: { order: Order, onCancel: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [location, setLocation] = useState(order.deliveryLocation || { lat: 12.9716, lng: 77.5946 });
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    setStatus(order.status);
    if (order.deliveryLocation) setLocation(order.deliveryLocation);
    if (order.status === 'delivered') setShowRating(true);
  }, [order.status, order.deliveryLocation]);

  useEffect(() => {
    socket.on('status_update', (newStatus: OrderStatus) => {
      setStatus(newStatus);
      if (newStatus === 'delivered') setShowRating(true);
    });

    socket.on('location_update', (newLoc: { lat: number; lng: number }) => {
      setLocation(newLoc);
    });

    return () => {
      socket.off('status_update');
      socket.off('location_update');
    };
  }, []);

  const steps = [
    { id: 'placed', label: 'Order Placed', icon: CheckCircle },
    { id: 'preparing', label: 'Preparing', icon: ChefHat },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: ShoppingBag },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === status);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (location && order.customerLocation && status === 'out_for_delivery') {
      fetch(`/api/distance-matrix?origins=${location.lat},${location.lng}&destinations=${order.customerLocation.lat},${order.customerLocation.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data.rows?.[0]?.elements?.[0]?.duration?.text) {
            setEta(data.rows[0].elements[0].duration.text);
          }
        })
        .catch(err => console.error("Error fetching ETA:", err));
    }
  }, [location, order.customerLocation, status]);

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
                status === 'cancelled' ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-emerald-600"
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
