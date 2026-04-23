import React from 'react';
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Image as ImageIcon, Loader2, MapPin, TriangleAlert, Calendar } from 'lucide-react';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAllMedia } from '../hooks/useAllMedia';
import type { Media } from '../types';
import { formatDateSwedish } from '../utils/dateHelpers';
import { preloadImageUrl } from '../utils/imagePreload';
import {
  DEFAULT_MAP_CENTER,
  getMapBounds,
  getJourneyPath,
  type DayStop,
  type MapBounds,
  type MapCoordinate,
} from '../utils/mapMedia';
import { createHankoClusterIcon, createHankoIcon, getHankoClusterSizeTier } from './HankoMarker';

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

interface ProjectedPoint {
  x: number;
  y: number;
}

type ClusteredStop =
  | { type: 'stop'; stop: DayStop; index: number }
  | { type: 'cluster'; stops: Array<{ stop: DayStop; index: number }>; coordinate: MapCoordinate };

const CLUSTER_DISABLE_ZOOM = 15;

const getMaxClusterRadius = (zoom: number) => {
  if (zoom >= 14) return 34;
  if (zoom >= 12) return 44;
  if (zoom >= 10) return 56;
  return 72;
};

const projectDistance = (left: ProjectedPoint, right: ProjectedPoint) =>
  Math.hypot(left.x - right.x, left.y - right.y);

const averageCoordinate = (stops: Array<{ stop: DayStop }>): MapCoordinate => {
  const totals = stops.reduce(
    (acc, item) => {
      acc.lat += item.stop.coordinate[0];
      acc.lng += item.stop.coordinate[1];
      return acc;
    },
    { lat: 0, lng: 0 }
  );

  return [totals.lat / stops.length, totals.lng / stops.length];
};

const buildClusteredStops = (
  journeyStops: DayStop[],
  zoom: number,
  project: (coordinate: MapCoordinate, zoom: number) => ProjectedPoint
): ClusteredStop[] => {
  if (zoom >= CLUSTER_DISABLE_ZOOM) {
    return journeyStops.map((stop, index) => ({ type: 'stop', stop, index }));
  }

  const clusterRadius = getMaxClusterRadius(zoom);
  const projectedStops = journeyStops.map((stop, index) => ({
    stop,
    index,
    projected: project(stop.coordinate, zoom),
  }));
  const visited = new Set<number>();
  const results: ClusteredStop[] = [];

  for (let startIndex = 0; startIndex < projectedStops.length; startIndex += 1) {
    if (visited.has(startIndex)) continue;

    const queue = [startIndex];
    const clusterMembers: Array<{ stop: DayStop; index: number }> = [];
    visited.add(startIndex);

    while (queue.length > 0) {
      const currentIndex = queue.shift()!;
      const current = projectedStops[currentIndex];
      clusterMembers.push({ stop: current.stop, index: current.index });

      for (let candidateIndex = 0; candidateIndex < projectedStops.length; candidateIndex += 1) {
        if (visited.has(candidateIndex)) continue;

        const candidate = projectedStops[candidateIndex];
        if (projectDistance(current.projected, candidate.projected) <= clusterRadius) {
          visited.add(candidateIndex);
          queue.push(candidateIndex);
        }
      }
    }

    if (clusterMembers.length === 1) {
      results.push({
        type: 'stop',
        stop: clusterMembers[0].stop,
        index: clusterMembers[0].index,
      });
      continue;
    }

    results.push({
      type: 'cluster',
      stops: clusterMembers,
      coordinate: averageCoordinate(clusterMembers),
    });
  }

  return results;
};

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
      const timeoutId = setTimeout(() => {
        map.invalidateSize();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isActive, map]);

  return null;
};

const JourneyMarkers: React.FC<{
  journeyStops: DayStop[];
  onMediaOpen?: (media: Media[], index: number) => void;
}> = ({ journeyStops, onMediaOpen }) => {
  const map = useMap();
  const [zoom, setZoom] = React.useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const clusteredStops = React.useMemo(
    () => buildClusteredStops(journeyStops, zoom, (coordinate, activeZoom) => map.project(coordinate, activeZoom)),
    [journeyStops, map, zoom]
  );

  return (
    <>
      {clusteredStops.map((item) => {
        if (item.type === 'cluster') {
          const count = item.stops.length;
          const bounds = getMapBounds(item.stops.map((entry) => entry.stop));

          return (
            <Marker
              key={`cluster-${item.stops.map((entry) => entry.stop.dayId).join('-')}`}
              position={item.coordinate}
              icon={createHankoClusterIcon(count, getHankoClusterSizeTier(count))}
              eventHandlers={{
                click: () => {
                  if (bounds) {
                    map.fitBounds(bounds, {
                      padding: [36, 36],
                      maxZoom: CLUSTER_DISABLE_ZOOM,
                    });
                  }
                },
              }}
            />
          );
        }

        const representativeMedia = item.stop.media[0];
        const previewId = representativeMedia?.id ?? item.stop.dayId;

        return (
          <Marker
            key={item.stop.dayId}
            position={item.stop.coordinate}
            icon={createHankoIcon(item.index)}
            eventHandlers={{
              mouseover: () => {
                if (representativeMedia) {
                  preloadImageUrl(representativeMedia.thumbnailUrl || representativeMedia.url).catch(
                    () => undefined
                  );
                }
              },
            }}
          >
            <Popup className="polaroid-popup">
              <div className="polaroid-frame">
                <div className="polaroid-image-container">
                  {representativeMedia ? (
                    <img
                      src={representativeMedia.thumbnailUrl || representativeMedia.url}
                      alt={item.stop.dayId}
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
                    {item.stop.media.length} {item.stop.media.length === 1 ? 'minne' : 'minnen'}
                  </p>
                </div>
                <button
                  type="button"
                  className="polaroid-action-btn"
                  data-testid={`map-open-media-${previewId}`}
                  onClick={() => onMediaOpen?.(item.stop.media, 0)}
                >
                  Upptäck dagen
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const MapTab: React.FC<MapTabProps> = ({ isActive = true, onMediaOpen }) => {
  const { media, loading, error } = useAllMedia();
  const journeyStops = React.useMemo(() => getJourneyPath(media), [media]);
  const bounds = React.useMemo(() => getMapBounds(journeyStops), [journeyStops]);
  const journeyCoordinates = React.useMemo(
    () => journeyStops.map((stop) => stop.coordinate),
    [journeyStops]
  );
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
              <>
                <Polyline
                  positions={journeyCoordinates}
                  pathOptions={{
                    color: '#7d1f33',
                    weight: 4,
                    opacity: 0.36,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  className="red-thread-base"
                />
                <Polyline
                  positions={journeyCoordinates}
                  pathOptions={{
                    color: '#BC002D',
                    weight: 2.4,
                    opacity: 0.68,
                    dashArray: '1 16',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  className="red-thread-sheen"
                />
              </>
            )}

            <JourneyMarkers journeyStops={journeyStops} onMediaOpen={onMediaOpen} />
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
          background: #f8f6f1;
        }

        .red-thread-base {
          filter: drop-shadow(0 0 7px rgba(188, 0, 45, 0.12));
        }

        .red-thread-sheen {
          stroke-dashoffset: 0;
          animation: thread-sheen-drift 22s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 6px rgba(188, 0, 45, 0.2));
        }

        @keyframes thread-sheen-drift {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.48;
          }

          50% {
            opacity: 0.78;
          }

          100% {
            stroke-dashoffset: -180;
            opacity: 0.4;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .red-thread-sheen {
            animation: none;
            opacity: 0.5;
          }
        }

        .hanko-marker-container,
        .hanko-cluster-container {
          background: transparent !important;
          border: none !important;
        }

        .mon-badge,
        .mon-cluster {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 28%, #d84a63 0, #c91f43 26%, #BC002D 54%, #8b001d 100%);
          border: 2px solid rgba(118, 0, 24, 0.92);
          box-shadow:
            0 5px 14px rgba(188, 0, 45, 0.28),
            inset 0 1px 0 rgba(255, 224, 230, 0.35),
            inset 0 -2px 6px rgba(88, 0, 18, 0.25);
          transition: all 0.3s ease;
        }

        .mon-badge {
          width: 46px;
          height: 46px;
          transform: scale(1);
        }

        .mon-badge::before,
        .mon-cluster::before {
          content: '';
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          border: 1px solid rgba(255, 238, 242, 0.58);
          box-shadow: inset 0 0 0 1px rgba(119, 0, 24, 0.2);
        }

        .mon-badge::after,
        .mon-cluster::after {
          content: '';
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 17%, rgba(255, 235, 239, 0.26) 0 12%, transparent 13%),
            radial-gradient(circle at 83% 50%, rgba(255, 235, 239, 0.22) 0 12%, transparent 13%),
            radial-gradient(circle at 50% 83%, rgba(255, 235, 239, 0.22) 0 12%, transparent 13%),
            radial-gradient(circle at 17% 50%, rgba(255, 235, 239, 0.22) 0 12%, transparent 13%);
          opacity: 0.9;
          pointer-events: none;
        }

        .mon-badge:hover {
          transform: scale(1.1);
          box-shadow:
            0 8px 18px rgba(188, 0, 45, 0.34),
            inset 0 1px 0 rgba(255, 224, 230, 0.35),
            inset 0 -2px 6px rgba(88, 0, 18, 0.25);
        }

        .mon-core,
        .mon-cluster-core {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(122, 0, 28, 0.26);
          border: 1px solid rgba(255, 242, 244, 0.54);
          backdrop-filter: blur(1px);
          z-index: 1;
        }

        .mon-core {
          width: 22px;
          height: 22px;
        }

        .mon-number,
        .mon-cluster-count {
          color: white;
          font-family: var(--font-mono);
          font-weight: 700;
          line-height: 1;
          text-shadow: 0 1px 2px rgba(72, 0, 15, 0.3);
        }

        .mon-number {
          font-size: 0.95rem;
        }

        .mon-cluster {
          width: var(--mon-cluster-size);
          height: var(--mon-cluster-size);
          box-shadow:
            0 8px 20px rgba(188, 0, 45, 0.28),
            inset 0 1px 0 rgba(255, 224, 230, 0.35),
            inset 0 -2px 6px rgba(88, 0, 18, 0.25);
        }

        .mon-cluster-core {
          width: var(--mon-cluster-inner-size);
          height: var(--mon-cluster-inner-size);
        }

        .mon-cluster-count {
          font-size: 1rem;
          letter-spacing: 0.02em;
        }

        .hanko-cluster-medium .mon-cluster-count {
          font-size: 1.08rem;
        }

        .hanko-cluster-large .mon-cluster-count {
          font-size: 1.18rem;
        }

        .polaroid-popup .leaflet-popup-content-wrapper {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }

        .polaroid-popup .leaflet-popup-tip-container {
          display: none;
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
