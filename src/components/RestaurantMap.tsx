import React, { useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { firebaseApiKey } from '../firebase';
import { Restaurant } from '../types';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

export default function RestaurantMap({ restaurants }: { restaurants: Restaurant[] }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || firebaseApiKey || ''
  });

  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  if (!isLoaded) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-3xl">Loading Map...</div>;

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={restaurants.length > 0 ? restaurants[0].location : defaultCenter}
        zoom={12}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true
        }}
      >
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            position={restaurant.location}
            onClick={() => setSelectedRestaurant(restaurant)}
            icon={{
              url: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
              scaledSize: new google.maps.Size(30, 30)
            }}
          />
        ))}

        {selectedRestaurant && (
          <InfoWindow
            position={selectedRestaurant.location}
            onCloseClick={() => setSelectedRestaurant(null)}
          >
            <div className="p-2 max-w-[200px]">
              <h3 className="font-bold text-slate-900">{selectedRestaurant.name}</h3>
              <p className="text-xs text-slate-500 mb-1">{selectedRestaurant.cuisine}</p>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs font-bold text-emerald-600">★ {selectedRestaurant.rating}</span>
              </div>
              <div className="text-[10px] text-slate-600">
                <p className="font-semibold mb-1">Available Items:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedRestaurant.menu.slice(0, 3).map(item => (
                    <span key={item.id} className="bg-slate-100 px-1 rounded">{item.name}</span>
                  ))}
                  {selectedRestaurant.menu.length > 3 && <span>+{selectedRestaurant.menu.length - 3} more</span>}
                </div>
              </div>
              <p className="text-[10px] mt-2 text-emerald-600 font-bold">● Open for Delivery</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
