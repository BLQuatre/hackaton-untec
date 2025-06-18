'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

interface LocationData {
  nom_ville: string;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  departement: string;
  region: string;
}

interface MapComponentProps {
  data: LocationData;
}

// Create a simple map component that can be dynamically imported
const MapDisplay = dynamic(
  () => {
    return import('react-leaflet').then((mod) => {
      const { MapContainer, TileLayer, Marker, Popup } = mod;

      return ({ data }: MapComponentProps) => {
        // Import Leaflet icon dynamically
        useEffect(() => {
          import('leaflet').then((L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
          });
        }, []);

        if (!data.latitude || !data.longitude) return null;

        return (
          <div className="h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={[data.latitude, data.longitude]}
              zoom={13}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[data.latitude, data.longitude]}>
                <Popup>
                  <div className="p-2">
                    <h4 className="font-semibold">{data.nom_ville}</h4>
                    <p className="text-sm">{data.departement}, {data.region}</p>
                    {data.population && (
                      <p className="text-sm">Population: {data.population.toLocaleString()}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        );
      };
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    )
  }
);

export function MapComponent({ data }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Location Map</h3>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 dark:text-gray-400">Initializing map...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data.latitude || !data.longitude) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Location Map</h3>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Location coordinates not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Location Map</h3>
      <MapDisplay data={data} />
    </div>
  );
}
