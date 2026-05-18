import React from 'react';
import { Calendar, Image as ImageIcon, Loader2, MapPin, TriangleAlert } from 'lucide-react';
import L from 'leaflet';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useAllMedia } from '../hooks/useAllMedia';
import type { Media } from '../types';
import { formatDateSwedish } from '../utils/dateHelpers';
import { preloadImageUrl } from '../utils/imagePreload';
import {
  DEFAULT_MAP_CENTER,
  getMapPhotoPoints,
  getJourneyPath,
  getMapBounds,
  type MapBounds,
  type MapCoordinate,
  type MapPhotoPoint,
} from '../utils/mapMedia';
import { createHankoClusterIcon, createHankoIcon, getHankoClusterSizeTier } from './HankoMarker';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewState {
  center: MapCoordinate;
  zoom: number;
}

interface MapTabProps {
  initialView?: MapViewState;
  hasPersistedView?: boolean;
  onMediaOpen?: (media: Media[], index: number) => void;
  onViewChange?: (view: MapViewState) => void;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

const FINAL_LAYOUT_SYNC_DELAY_MS = 160;
const CLUSTER_LIGHTBOX_THRESHOLD = 12;

interface ClusterAccumulator {
  points: Array<{ point: MapPhotoPoint; projected: ProjectedPoint }>;
  centroid: ProjectedPoint;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type ClusteredPhotoResult =
  | { type: 'photo'; point: MapPhotoPoint; projected: ProjectedPoint }
  | { type: 'cluster'; points: MapPhotoPoint[]; coordinate: MapCoordinate };

type RenderableMapItem =
  | { type: 'photo'; point: MapPhotoPoint; coordinate: MapCoordinate; renderIndex: number }
  | { type: 'cluster'; points: MapPhotoPoint[]; coordinate: MapCoordinate };

const CLUSTER_DISABLE_ZOOM = 16;
const OVERLAP_OFFSET_TRIGGER_PX = 10;
const GOLDEN_ANGLE = 2.399963229728653;

const getMaxClusterRadius = (zoom: number) => {
  if (zoom >= 15) return 16;
  if (zoom >= 13) return 22;
  if (zoom >= 11) return 28;
  if (zoom >= 9) return 36;
  return 46;
};

const projectDistance = (left: ProjectedPoint, right: ProjectedPoint) =>
  Math.hypot(left.x - right.x, left.y - right.y);

const averageCoordinate = (points: Array<{ coordinate: MapCoordinate }>): MapCoordinate => {
  const totals = points.reduce(
    (acc, point) => {
      acc.lat += point.coordinate[0];
      acc.lng += point.coordinate[1];
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return [totals.lat / points.length, totals.lng / points.length];
};

const averageProjectedPoint = (points: ProjectedPoint[]): ProjectedPoint => {
  const totals = points.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 },
  );

  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
};

const getMaxClusterSpan = (clusterRadius: number) => clusterRadius * 1.28;

const createClusterAccumulator = (point: MapPhotoPoint, projected: ProjectedPoint): ClusterAccumulator => ({
  points: [{ point, projected }],
  centroid: projected,
  minX: projected.x,
  maxX: projected.x,
  minY: projected.y,
  maxY: projected.y,
});

const canJoinCluster = (
  cluster: ClusterAccumulator,
  candidate: ProjectedPoint,
  clusterRadius: number,
  maxClusterSpan: number,
) => {
  if (projectDistance(cluster.centroid, candidate) > clusterRadius) {
    return false;
  }

  const nextMinX = Math.min(cluster.minX, candidate.x);
  const nextMaxX = Math.max(cluster.maxX, candidate.x);
  const nextMinY = Math.min(cluster.minY, candidate.y);
  const nextMaxY = Math.max(cluster.maxY, candidate.y);

  return nextMaxX - nextMinX <= maxClusterSpan && nextMaxY - nextMinY <= maxClusterSpan;
};

const addPointToCluster = (
  cluster: ClusterAccumulator,
  point: MapPhotoPoint,
  projected: ProjectedPoint,
) => {
  cluster.points.push({ point, projected });
  cluster.minX = Math.min(cluster.minX, projected.x);
  cluster.maxX = Math.max(cluster.maxX, projected.x);
  cluster.minY = Math.min(cluster.minY, projected.y);
  cluster.maxY = Math.max(cluster.maxY, projected.y);
  cluster.centroid = averageProjectedPoint(cluster.points.map((entry) => entry.projected));
};

const buildClusteredPhotoResults = (
  photoPoints: MapPhotoPoint[],
  zoom: number,
  project: (coordinate: MapCoordinate, zoom: number) => ProjectedPoint,
): ClusteredPhotoResult[] => {
  const clusterRadius = getMaxClusterRadius(zoom);
  const maxClusterSpan = getMaxClusterSpan(clusterRadius);
  const projectedPoints = photoPoints.map((point) => ({
    point,
    projected: project(point.coordinate, zoom),
  }));

  if (zoom >= CLUSTER_DISABLE_ZOOM) {
    return projectedPoints.map(({ point, projected }) => ({
      type: 'photo',
      point,
      projected,
    }));
  }

  const clusters: ClusterAccumulator[] = [];

  projectedPoints.forEach(({ point, projected }) => {
    let targetClusterIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    clusters.forEach((cluster, index) => {
      if (!canJoinCluster(cluster, projected, clusterRadius, maxClusterSpan)) {
        return;
      }

      const distance = projectDistance(cluster.centroid, projected);
      if (distance < bestDistance) {
        targetClusterIndex = index;
        bestDistance = distance;
      }
    });

    if (targetClusterIndex === -1) {
      clusters.push(createClusterAccumulator(point, projected));
      return;
    }

    addPointToCluster(clusters[targetClusterIndex], point, projected);
  });

  return clusters.map((cluster) =>
    cluster.points.length === 1
      ? {
          type: 'photo' as const,
          point: cluster.points[0].point,
          projected: cluster.points[0].projected,
        }
      : {
          type: 'cluster' as const,
          points: cluster.points.map((entry) => entry.point),
          coordinate: averageCoordinate(cluster.points.map((entry) => entry.point)),
        },
  );
};

const resolveOverlappingPhotoCoordinates = (
  photos: Array<{ point: MapPhotoPoint; projected: ProjectedPoint }>,
  zoom: number,
  unproject: (projected: ProjectedPoint, zoom: number) => MapCoordinate,
) => {
  const overlapGroups: Array<Array<{ point: MapPhotoPoint; projected: ProjectedPoint }>> = [];

  photos.forEach((photo) => {
    const existingGroup = overlapGroups.find((group) =>
      group.every(
        (entry) =>
          projectDistance(entry.projected, photo.projected) <= OVERLAP_OFFSET_TRIGGER_PX,
      ),
    );

    if (existingGroup) {
      existingGroup.push(photo);
      return;
    }

    overlapGroups.push([photo]);
  });

  return overlapGroups.flatMap((group) => {
    if (group.length === 1) {
      return [
        {
          point: group[0].point,
          coordinate: group[0].point.coordinate,
        },
      ];
    }

    const center = averageProjectedPoint(group.map((entry) => entry.projected));

    return group.map((entry, index) => {
      const offsetDistance = 10 + index * 4;
      const angle = index * GOLDEN_ANGLE;
      const coordinate = unproject(
        {
          x: center.x + Math.cos(angle) * offsetDistance,
          y: center.y + Math.sin(angle) * offsetDistance,
        },
        zoom,
      );

      return {
        point: entry.point,
        coordinate,
      };
    });
  });
};

const buildRenderableMapItems = (
  photoPoints: MapPhotoPoint[],
  zoom: number,
  project: (coordinate: MapCoordinate, zoom: number) => ProjectedPoint,
  unproject: (projected: ProjectedPoint, zoom: number) => MapCoordinate,
): RenderableMapItem[] => {
  const clusteredResults = buildClusteredPhotoResults(photoPoints, zoom, project);
  const photoResults = clusteredResults.filter((item) => item.type === 'photo');
  const clusterResults = clusteredResults.filter((item) => item.type === 'cluster');
  const resolvedPhotos = resolveOverlappingPhotoCoordinates(photoResults, zoom, unproject);

  return [
    ...clusterResults,
    ...resolvedPhotos.map((item, renderIndex) => ({
      type: 'photo' as const,
      point: item.point,
      coordinate: item.coordinate,
      renderIndex,
    })),
  ];
};

const FitMapToBounds: React.FC<{ bounds: MapBounds | null; shouldFit: boolean }> = ({ bounds, shouldFit }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!bounds || !shouldFit) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 13,
    });
  }, [bounds, map, shouldFit]);

  return null;
};

const MapViewTracker: React.FC<{ onViewChange?: (view: MapViewState) => void }> = ({ onViewChange }) => {
  const map = useMapEvents({
    moveend: () => {
      onViewChange?.({
        center: [map.getCenter().lat, map.getCenter().lng],
        zoom: map.getZoom(),
      });
    },
    zoomend: () => {
      onViewChange?.({
        center: [map.getCenter().lat, map.getCenter().lng],
        zoom: map.getZoom(),
      });
    },
  });

  React.useEffect(() => {
    onViewChange?.({
      center: [map.getCenter().lat, map.getCenter().lng],
      zoom: map.getZoom(),
    });
  }, [map, onViewChange]);

  return null;
};

const MapLayoutSync: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = ({ containerRef }) => {
  const map = useMap();

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncMapLayout = () => {
      map.invalidateSize();
    };

    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      syncMapLayout();
      secondFrameId = window.requestAnimationFrame(() => {
        syncMapLayout();
      });
    });

    const timeoutId = window.setTimeout(() => {
      syncMapLayout();
    }, FINAL_LAYOUT_SYNC_DELAY_MS);

    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        syncMapLayout();
      });
      resizeObserver.observe(container);
    }

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(timeoutId);
      resizeObserver?.disconnect();
    };
  }, [containerRef, map]);

  return null;
};

const JourneyMarkers: React.FC<{
  photoPoints: MapPhotoPoint[];
  onMediaOpen?: (media: Media[], index: number) => void;
}> = ({ photoPoints, onMediaOpen }) => {
  const map = useMap();
  const [zoom, setZoom] = React.useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const renderableItems = React.useMemo(
    () =>
      buildRenderableMapItems(
        photoPoints,
        zoom,
        (coordinate, activeZoom) => map.project(coordinate, activeZoom),
        (projected, activeZoom) => {
          const latLng = map.unproject(L.point(projected.x, projected.y), activeZoom);
          return [latLng.lat, latLng.lng];
        },
      ),
    [photoPoints, map, zoom],
  );

  return (
    <>
      {renderableItems.map((item) => {
        if (item.type === 'cluster') {
          const count = item.points.length;
          const bounds = getMapBounds(item.points);
          const clusterMedia = item.points.map((entry) => entry.media);

          return (
            <Marker
              key={`cluster-${item.points.map((entry) => entry.media.id).join('-')}`}
              position={item.coordinate}
              icon={createHankoClusterIcon(count, getHankoClusterSizeTier(count))}
              eventHandlers={{
                click: () => {
                  if (count <= CLUSTER_LIGHTBOX_THRESHOLD && onMediaOpen) {
                    onMediaOpen(clusterMedia, 0);
                    return;
                  }

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

        const previewId = item.point.media.id;
        const previewSrc = item.point.media.thumbnailUrl || item.point.media.url;
        const dayMediaCount = item.point.dayMedia.length;
        const dayMediaIndex = item.point.mediaIndex + 1;

        return (
          <Marker
            key={item.point.media.id}
            position={item.coordinate}
            icon={createHankoIcon(item.renderIndex)}
            eventHandlers={{
              mouseover: () => {
                if (previewSrc) {
                  void preloadImageUrl(previewSrc).catch(() => undefined);
                }
              },
            }}
          >
            <Popup className="polaroid-popup">
              <div className="polaroid-frame">
                <div className="polaroid-image-container">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt={item.point.media.fileName}
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
                    <span>{formatDateSwedish(item.point.media.capturedAt || new Date())}</span>
                  </div>
                  <p className="polaroid-count">
                    {dayMediaCount === 1 ? '1 minne' : `${dayMediaIndex} av ${dayMediaCount} minnen`}
                  </p>
                </div>
                <button
                  type="button"
                  className="polaroid-action-btn"
                  data-testid={`map-open-media-${previewId}`}
                  onClick={() => onMediaOpen?.(item.point.dayMedia, item.point.mediaIndex)}
                >
                  Upptack dagen
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const MapTab: React.FC<MapTabProps> = ({
  initialView = { center: DEFAULT_MAP_CENTER, zoom: 6 },
  hasPersistedView = false,
  onMediaOpen,
  onViewChange,
}) => {
  const { media, loading, error } = useAllMedia({ enabled: true, live: false, limit: 1000 });
  const journeyStops = React.useMemo(() => getJourneyPath(media), [media]);
  const photoPoints = React.useMemo(() => getMapPhotoPoints(media), [media]);
  const bounds = React.useMemo(() => getMapBounds(photoPoints), [photoPoints]);
  const mapWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const journeyCoordinates = React.useMemo(
    () => journeyStops.map((stop) => stop.coordinate),
    [journeyStops],
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

      <div className="map-wrapper" ref={mapWrapperRef}>
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
        ) : photoPoints.length === 0 ? (
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
            center={initialView.center}
            zoom={initialView.zoom}
            scrollWheelZoom
            className="leaflet-container"
          >
            <MapLayoutSync containerRef={mapWrapperRef} />
            <FitMapToBounds bounds={bounds} shouldFit={!hasPersistedView} />
            <MapViewTracker onViewChange={onViewChange} />
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

            <JourneyMarkers photoPoints={photoPoints} onMediaOpen={onMediaOpen} />
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
          position: absolute;
          inset: 0;
          height: auto;
          width: auto;
          z-index: 10;
          background: #f8f6f1;
        }

        .leaflet-container .leaflet-tile-pane img,
        .leaflet-container img.leaflet-tile {
          mix-blend-mode: normal;
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

        .spinner {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
