import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Clock } from 'lucide-react';
import { firebaseApiKey } from '../firebase';
import { OrderStatus } from '../types';

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
  }, [targetLocation]);

  return currentLocation;
}

export default function MapComponent({ 
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

  const [map, setMap] = useState<google.maps.Map | null>(null);
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

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Map...</div>;

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
