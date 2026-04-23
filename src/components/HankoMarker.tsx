import L from 'leaflet';

export const createHankoIcon = (index: number) => {
  const label = (index + 1).toString();
  
  return L.divIcon({
    className: 'hanko-marker-container',
    html: `
      <div class="mon-badge">
        <div class="mon-core">
          <span class="mon-number">${label}</span>
        </div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
};

export type HankoClusterSizeTier = 'small' | 'medium' | 'large';

export const getHankoClusterSizeTier = (count: number): HankoClusterSizeTier => {
  if (count >= 10) return 'large';
  if (count >= 4) return 'medium';
  return 'small';
};

export const createHankoClusterIcon = (count: number, sizeTier: HankoClusterSizeTier) => {
  const size = sizeTier === 'large' ? 56 : sizeTier === 'medium' ? 50 : 44;
  const innerSize = sizeTier === 'large' ? 42 : sizeTier === 'medium' ? 36 : 32;

  return L.divIcon({
    className: `hanko-cluster-container hanko-cluster-${sizeTier}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    tooltipAnchor: [0, -size / 2],
    html: `
      <div class="mon-cluster" style="--mon-cluster-size:${size}px; --mon-cluster-inner-size:${innerSize}px;">
        <div class="mon-cluster-core">
          <span class="mon-cluster-count">${count}</span>
        </div>
      </div>
    `,
  });
};
