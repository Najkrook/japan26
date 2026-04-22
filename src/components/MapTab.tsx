import React from 'react';
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from 'react-leaflet';
import { Image as ImageIcon, Loader2, MapPin, TriangleAlert, Calendar } from 'lucide-react';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAllMedia } from '../hooks/useAllMedia';
import type { Media } from '../types';
import { formatDateSwedish } from '../utils/dateHelpers';
import { preloadImageUrl } from '../utils/imagePreload';
import { DEFAULT_MAP_CENTER, getMapBounds, getJourneyPath, type MapBounds } from '../utils/mapMedia';
import { createHankoIcon } from './HankoMarker';

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
  const journeyStops = React.useMemo(() => getJourneyPath(media), [media]);
  const bounds = React.useMemo(() => getMapBounds(journeyStops), [journeyStops]);
  const journeyCoordinates = React.useMemo(() => journeyStops.map(s => s.coordinate), [journeyStops]);
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
        ) : journeyStops.length === 0 ? (
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

            {journeyCoordinates.length > 1 && (
              <Polyline
                positions={journeyCoordinates}
                pathOptions={{ 
                  color: '#BC002D', // Japanese Red
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '8, 8',
                  lineJoin: 'round'
                }}
                className="red-thread"
              />
            )}

            {journeyStops.map((stop, index) => {
              const representativeMedia = stop.media[0];
              return (
                <Marker 
                  key={stop.dayId} 
                  position={stop.coordinate}
                  icon={createHankoIcon(index)}
                  eventHandlers={{
                    mouseover: () => {
                      if (representativeMedia) {
                        preloadImageUrl(representativeMedia.thumbnailUrl || representativeMedia.url).catch(() => undefined);
                      }
                    }
                  }}
                >
                  <Popup className="polaroid-popup">
                    <div className="polaroid-frame">
                      <div className="polaroid-image-container">
                        {representativeMedia ? (
                          <img
                            src={representativeMedia.thumbnailUrl || representativeMedia.url}
                            alt={stop.dayId}
                            className="polaroid-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="polaroid-placeholder">
                            <ImageIcon size={32} />
                          </div>
                        )}
                      </div>
                      <div className="polaroid-caption">
                        <div className="polaroid-date">
                          <Calendar size={12} />
                          <span>{formatDateSwedish(representativeMedia?.capturedAt || new Date())}</span>
                        </div>
                        <p className="polaroid-count">
                          {stop.media.length} {stop.media.length === 1 ? 'minne' : 'minnen'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="polaroid-action-btn"
                        onClick={() => onMediaOpen?.(stop.media, 0)}
                      >
                        Upptäck dagen
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
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
          background: #f8f6f1; /* Washi paper-like map background tint */
        }

        /* The Red Thread Animation */
        .red-thread {
          stroke-dasharray: 10, 10;
          stroke-dashoffset: 1000;
          animation: draw-thread 5s linear forwards;
        }

        @keyframes draw-thread {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* Hanko Stamp Marker */
        .hanko-marker-container {
          background: transparent !important;
          border: none !important;
        }

        .hanko-stamp {
          width: 42px;
          height: 42px;
          background: #BC002D; /* Japanese Sun Red */
          border: 2px solid #BC002D;
          border-radius: 5px; /* Square with slight roundness like a real hanko */
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(188, 0, 45, 0.4), inset 0 0 10px rgba(0,0,0,0.1);
          transform: rotate(-3deg);
          transition: all 0.3s ease;
        }

        .hanko-stamp:hover {
          transform: rotate(2deg) scale(1.1);
          box-shadow: 0 4px 12px rgba(188, 0, 45, 0.5);
        }

        .hanko-inner {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hanko-label {
          color: white;
          font-family: 'Zen Kurenaido', 'Brush Script MT', cursive;
          font-weight: 700;
          font-size: 1.1rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        /* Polaroid Popup */
        .polaroid-popup .leaflet-popup-content-wrapper {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }

        .polaroid-popup .leaflet-popup-tip-container {
          display: none; /* Clean look */
        }

        .polaroid-frame {
          background: white;
          padding: 10px 10px 45px 10px;
          width: 220px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          transform: rotate(-1deg);
          position: relative;
        }

        .polaroid-frame::after {
          content: "";
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 20px;
          font-family: 'Kalam', cursive;
          color: #333;
          font-size: 0.9rem;
          text-align: center;
        }

        .polaroid-image-container {
          width: 100%;
          height: 160px;
          background: #eee;
          overflow: hidden;
          position: relative;
        }

        .polaroid-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .polaroid-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
        }

        .polaroid-caption {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .polaroid-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #666;
          font-weight: 600;
        }

        .polaroid-count {
          margin: 0;
          font-size: 0.75rem;
          color: var(--primary);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .polaroid-action-btn {
          margin-top: 15px;
          width: 100%;
          padding: 8px;
          background: #000;
          color: white;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .polaroid-action-btn:hover {
          background: var(--primary);
        }

        @media (max-width: 768px) {
          .map-view-container {
            padding: 1rem 0.75rem 8rem;
          }

          .map-wrapper {
            min-height: 360px;
          }

          .polaroid-frame {
            width: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default MapTab;
