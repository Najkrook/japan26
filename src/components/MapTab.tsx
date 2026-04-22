import React from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Image as ImageIcon, Loader2, MapPin, TriangleAlert } from 'lucide-react';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAllMedia } from '../hooks/useAllMedia';
import type { Media } from '../types';
import { formatDateSwedish } from '../utils/dateHelpers';
import { preloadImageUrl } from '../utils/imagePreload';
import { DEFAULT_MAP_CENTER, getMapBounds, getMapMedia, type MapBounds } from '../utils/mapMedia';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapTabProps {
  isActive?: boolean;
  onMediaOpen?: (media: Media[], index: number) => void;
}

const FitMapToBounds: React.FC<{ bounds: MapBounds | null }> = ({ bounds }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 13,
    });
  }, [bounds, map]);

  return null;
};

const MapResizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const map = useMap();

  React.useEffect(() => {
    if (isActive) {
      // Small timeout ensures the DOM has fully rendered the grid before invalidating
      const timeoutId = setTimeout(() => {
        map.invalidateSize();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isActive, map]);

  return null;
};

const MapTab: React.FC<MapTabProps> = ({ isActive = true, onMediaOpen }) => {
  const { media, loading, error } = useAllMedia();
  const mapMedia = React.useMemo(() => getMapMedia(media), [media]);
  const bounds = React.useMemo(() => getMapBounds(mapMedia), [mapMedia]);
  const hasAnyMedia = media.length > 0;

  return (
    <div className="map-view-container fade-in">
      <div className="map-header">
        <h2 className="cover-title map-title">Resekarta</h2>
        <p className="cover-description map-description">
          {'Utforska minnen baserat p\u00e5 geografisk plats.'}
        </p>
      </div>

      <div className="map-wrapper">
        {loading ? (
          <div className="loading-state map-state" data-testid="map-loading-state">
            <Loader2 className="spinner" size={32} />
            <p>Laddar kartdata...</p>
          </div>
        ) : error ? (
          <div className="error-state map-state" data-testid="map-error-state">
            <TriangleAlert size={28} />
            <p>{error}</p>
          </div>
        ) : mapMedia.length === 0 ? (
          <div className="empty-state map-state" data-testid="map-empty-state">
            <MapPin size={32} />
            <h3>{hasAnyMedia ? 'Ingen platsdata hittades' : 'Ingen media \u00e4n'}</h3>
            <p>
              {hasAnyMedia
                ? 'Bilder och videor m\u00e5ste inneh\u00e5lla koordinater f\u00f6r att visas p\u00e5 kartan.'
                : 'Ladda upp geo-taggade minnen f\u00f6r att b\u00f6rja utforska resan p\u00e5 kartan.'}
            </p>
          </div>
        ) : (
          <MapContainer
            center={DEFAULT_MAP_CENTER}
            zoom={6}
            scrollWheelZoom
            className="leaflet-container"
          >
            <MapResizer isActive={isActive} />
            <FitMapToBounds bounds={bounds} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapMedia.map((item, index) => (
              <Marker 
                key={item.id} 
                position={[item.latitude!, item.longitude!]}
                eventHandlers={{
                  mouseover: () => {
                    preloadImageUrl(item.thumbnailUrl || item.url).catch(() => undefined);
                  }
                }}
              >
                <Popup className="media-popup">
                  <div className="popup-content">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.fileName}
                      className="popup-thumbnail"
                      loading="lazy"
                    />
                    <div className="popup-meta">
                      <p className="popup-date">{formatDateSwedish(item.capturedAt)}</p>
                      <p className="popup-name">{item.fileName}</p>
                    </div>
                    <button
                      type="button"
                      className="popup-open-btn"
                      data-testid={`map-open-media-${item.id}`}
                      onClick={() => onMediaOpen?.(mapMedia, index)}
                    >
                      <ImageIcon size={16} />
                      <span>{'\u00d6ppna'}</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      <style>{`
        .map-view-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem 8rem;
          height: 100vh;
        }

        .map-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .map-title {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .map-description {
          margin: 0;
          font-size: 1rem;
        }

        .map-wrapper {
          flex: 1;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          background: var(--surface-color);
          position: relative;
          min-height: 400px;
          border: 1px solid rgba(0,0,0,0.05);
        }

        .map-state {
          height: 100%;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 0.75rem;
          color: var(--text-dim);
        }

        .map-state h3,
        .map-state p {
          margin: 0;
        }

        .leaflet-container {
          height: 100%;
          width: 100%;
          z-index: 10;
        }

        .media-popup .leaflet-popup-content-wrapper {
          border-radius: var(--radius-md);
          overflow: hidden;
          padding: 0;
        }

        .media-popup .leaflet-popup-content {
          margin: 0;
          width: 220px !important;
        }

        .popup-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-bottom: 0.75rem;
        }

        .popup-thumbnail {
          width: 100%;
          height: 128px;
          object-fit: cover;
          display: block;
        }

        .popup-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0 0.75rem;
        }

        .popup-date {
          margin: 0;
          font-family: var(--font-main);
          font-weight: 600;
          font-size: 0.8rem;
          color: var(--text-main);
        }

        .popup-name {
          margin: 0;
          color: var(--text-dim);
          font-size: 0.82rem;
          line-height: 1.35;
          word-break: break-word;
        }

        .popup-open-btn {
          margin: 0 0.75rem;
          min-height: 42px;
          border-radius: var(--radius-full);
          background: var(--primary);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 0.65rem 0.9rem;
        }

        @media (max-width: 768px) {
          .map-view-container {
            padding: 1rem 0.75rem 8rem;
          }

          .map-wrapper {
            min-height: 360px;
          }

          .media-popup .leaflet-popup-content {
            width: 240px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MapTab;
