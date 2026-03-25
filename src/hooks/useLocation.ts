import { useState, useCallback } from 'react';

export interface LocationState {
  lat: number;
  lng: number;
  city?: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse Geocoding using Google Maps API (if key provided) or fallback
          // For this demo, we'll use a mock city name or a free reverse geocoding service
          // In production, you'd use: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`
          
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || "Unknown City";

          setLocation({ lat: latitude, lng: longitude, city });
        } catch (err) {
          console.error("Geocoding error:", err);
          setLocation({ lat: latitude, lng: longitude, city: "Current Location" });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please select your city manually.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case err.TIMEOUT:
            setError("The request to get user location timed out.");
            break;
          default:
            setError("An unknown error occurred.");
            break;
        }
      },
      { timeout: 10000 }
    );
  }, []);

  return { location, error, loading, getLocation, setLocation };
}
