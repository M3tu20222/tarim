import React, { useState, useEffect, useCallback } from 'react';

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  admin2?: string;
}

interface LocationSelectorProps {
  onLocationChange: (location: Location) => void;
  currentLocation?: Location;
}

const POPULAR_LOCATIONS: Location[] = [
  { name: 'Konya Merkez', latitude: 37.8713, longitude: 32.4846, country: 'Türkiye', admin1: 'Konya' },
  { name: 'Yunak', latitude: 38.8158, longitude: 31.7342, country: 'Türkiye', admin1: 'Konya' },
  { name: 'Ankara', latitude: 39.9334, longitude: 32.8597, country: 'Türkiye' },
  { name: 'İstanbul', latitude: 41.0082, longitude: 28.9784, country: 'Türkiye' },
  { name: 'İzmir', latitude: 38.4192, longitude: 27.1287, country: 'Türkiye' },
  { name: 'Antalya', latitude: 36.8969, longitude: 30.7133, country: 'Türkiye' },
  { name: 'Bursa', latitude: 40.1826, longitude: 29.0665, country: 'Türkiye' },
  { name: 'Adana', latitude: 37.0000, longitude: 35.3213, country: 'Türkiye' },
];

const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationChange,
  currentLocation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Debounced search function
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Using a simple geocoding API (you can replace with your preferred service)
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=tr&format=json`
      );
      const data = await response.json();

      if (data.results) {
        const locations: Location[] = data.results.map((result: any) => ({
          name: result.name,
          latitude: result.latitude,
          longitude: result.longitude,
          country: result.country,
          admin1: result.admin1,
          admin2: result.admin2,
        }));
        setSearchResults(locations);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocations(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchLocations]);

  const getCurrentLocation = useCallback(() => {
    setUseCurrentLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Tarayıcınız konum servisleri desteklemiyor.');
      setUseCurrentLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding to get location name
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=tr&format=json`
          );
          const data = await response.json();

          const locationName = data.results?.[0]?.name || 'Mevcut Konum';
          const location: Location = {
            name: locationName,
            latitude,
            longitude,
            country: data.results?.[0]?.country || 'Bilinmiyor',
            admin1: data.results?.[0]?.admin1
          };

          onLocationChange(location);
          setIsOpen(false);
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          const location: Location = {
            name: 'Mevcut Konum',
            latitude,
            longitude,
            country: 'Bilinmiyor'
          };
          onLocationChange(location);
          setIsOpen(false);
        }

        setUseCurrentLocation(false);
      },
      (error) => {
        setLocationError('Konum alınamadı: ' + error.message);
        setUseCurrentLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [onLocationChange]);

  const handleLocationSelect = (location: Location) => {
    onLocationChange(location);
    setIsOpen(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const formatLocationName = (location: Location) => {
    const parts = [location.name];
    if (location.admin1 && location.admin1 !== location.name) {
      parts.push(location.admin1);
    }
    if (location.country && location.country !== 'Türkiye') {
      parts.push(location.country);
    }
    return parts.join(', ');
  };

  return (
    <div className="relative">
      {/* Current Location Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-base-200 hover:bg-base-100 rounded-lg transition-colors text-left w-full sm:w-auto"
      >
        <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <div className="text-white font-medium">
            {currentLocation ? currentLocation.name : 'Konum Seçin'}
          </div>
          {currentLocation && (
            <div className="text-xs text-gray-400">
              {currentLocation.admin1 && `${currentLocation.admin1}, `}
              {currentLocation.country}
            </div>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-base-200 rounded-xl shadow-xl border border-gray-700 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Şehir veya bölge arayın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-base-100 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              )}
            </div>

            {/* Current Location Button */}
            <button
              onClick={getCurrentLocation}
              disabled={useCurrentLocation}
              className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
            >
              {useCurrentLocation ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
              <span>{useCurrentLocation ? 'Konum Alınıyor...' : 'Mevcut Konumumu Kullan'}</span>
            </button>

            {locationError && (
              <div className="mt-2 text-sm text-red-400 bg-red-400/10 p-2 rounded">
                {locationError}
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Search Results */}
            {searchTerm && searchResults.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700">
                  Arama Sonuçları
                </div>
                {searchResults.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-base-100 transition-colors border-b border-gray-700/50 last:border-b-0"
                  >
                    <div className="text-white font-medium">{location.name}</div>
                    <div className="text-xs text-gray-400">
                      {location.admin1 && `${location.admin1}, `}
                      {location.country}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {searchTerm && searchResults.length === 0 && !isSearching && (
              <div className="px-4 py-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <p>Sonuç bulunamadı</p>
                <p className="text-xs mt-1">Farklı bir arama terimi deneyin</p>
              </div>
            )}

            {/* Popular Locations */}
            {!searchTerm && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700">
                  Popüler Konumlar
                </div>
                {POPULAR_LOCATIONS.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className={`w-full px-4 py-3 text-left hover:bg-base-100 transition-colors border-b border-gray-700/50 last:border-b-0 ${
                      currentLocation &&
                      currentLocation.latitude === location.latitude &&
                      currentLocation.longitude === location.longitude
                        ? 'bg-primary-500/20 border-l-4 border-l-primary-500'
                        : ''
                    }`}
                  >
                    <div className="text-white font-medium">{location.name}</div>
                    <div className="text-xs text-gray-400">
                      {location.admin1 && `${location.admin1}, `}
                      {location.country}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LocationSelector;