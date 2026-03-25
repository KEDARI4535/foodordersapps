export type OrderStatus = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  foodCategory?: string;
  rating: number;
  image: string;
  location: { lat: number; lng: number };
  city: string;
  state: string;
  menu: MenuItem[];
  ownerUid?: string;
}

export interface Order {
  id: string;
  customerUid: string;
  restaurantId: string;
  items: { menuItemId: string; name: string; price: number; quantity: number }[];
  total: number;
  status: OrderStatus;
  otp: string;
  createdAt: string;
  customerLocation: { lat: number; lng: number };
  restaurantLocation: { lat: number; lng: number };
  deliveryLocation?: { lat: number; lng: number };
  deliveryAgentUid?: string;
  deliveryPhone?: string;
  rating?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'customer' | 'delivery' | 'owner' | 'admin';
  phoneNumber?: string;
  isOnline?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_accepted' | 'out_for_delivery' | 'delivered' | 'info';
  orderId?: string;
  read: boolean;
  createdAt: string;
}
