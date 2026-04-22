import L from 'leaflet';

export const createHankoIcon = (index: number) => {
  const label = (index + 1).toString();
  
  return L.divIcon({
    className: 'hanko-marker-container',
    html: `
      <div class="hanko-stamp">
        <div class="hanko-inner">
          <span class="hanko-label">${label}</span>
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};
