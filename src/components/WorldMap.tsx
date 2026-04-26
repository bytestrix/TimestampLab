import { useState, useCallback, useRef, useMemo } from 'react';
import { WORLD_FEATURES, type CountryFeature } from '../data/worldMap';
import { coordsToPath, unproject, pointInGeometry, getBBox } from '../utils/mapUtils';

interface Props {
  onSelect: (country: CountryFeature) => void;
  selectedTz?: string;
}

// Pre-compute bounding boxes for fast hit-testing
const BBOXES = WORLD_FEATURES.map(f => getBBox(f.geometry));

function findCountry(lng: number, lat: number): CountryFeature | null {
  // First pass: bbox check (fast)
  const candidates: number[] = [];
  for (let i = 0; i < WORLD_FEATURES.length; i++) {
    const [minLng, minLat, maxLng, maxLat] = BBOXES[i];
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      candidates.push(i);
    }
  }
  // Second pass: precise point-in-polygon (only on candidates)
  for (const i of candidates) {
    if (pointInGeometry(lng, lat, WORLD_FEATURES[i].geometry)) {
      return WORLD_FEATURES[i];
    }
  }
  return null;
}

export default function WorldMap({ onSelect, selectedTz }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; country: CountryFeature } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pre-compute all SVG paths
  const paths = useMemo(() =>
    WORLD_FEATURES.map(f => ({
      ...f,
      d: coordsToPath(
        f.geometry.type === 'Polygon'
          ? (f.geometry.coordinates as number[][][])
          : (f.geometry.coordinates as number[][][][]).flat()
      )
    })),
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 400 / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    const [lng, lat] = unproject(svgX, svgY);
    const country = findCountry(lng, lat);

    if (country) {
      setHovered(country.tz);
      setTooltip({ x: e.clientX, y: e.clientY, country });
    } else {
      setHovered(null);
      setTooltip(null);
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 400 / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    const [lng, lat] = unproject(svgX, svgY);
    const country = findCountry(lng, lat);
    if (country) onSelect(country);
  }, [onSelect]);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    setTooltip(null);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        width="100%"
        style={{
          display: 'block',
          background: 'var(--map-ocean, #0d1117)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)',
          cursor: hovered ? 'pointer' : 'crosshair',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Graticule lines */}
        <g stroke="var(--border)" strokeWidth="0.3" opacity="0.4">
          {[-60, -30, 0, 30, 60].map(lat => {
            const y = (90 - lat) * (400 / 180);
            return <line key={lat} x1="0" y1={y} x2="800" y2={y} />;
          })}
          {[-120, -60, 0, 60, 120].map(lng => {
            const x = (lng + 180) * (800 / 360);
            return <line key={lng} x1={x} y1="0" x2={x} y2="400" />;
          })}
        </g>

        {/* Countries */}
        {paths.map(({ tz, flag: _flag, name, d }) => {
          const isSelected = selectedTz === tz;
          const isHovered = hovered === tz;
          return (
            <path
              key={`${name}-${tz}`}
              d={d}
              fill={
                isSelected
                  ? 'var(--accent)'
                  : isHovered
                  ? 'var(--map-hover, #2d6a4f)'
                  : 'var(--map-land, #1c2333)'
              }
              stroke="var(--map-border, #0d1117)"
              strokeWidth="0.4"
              style={{ transition: 'fill 0.1s' }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: '6px 10px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '16px' }}>{tooltip.country.flag}</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{tooltip.country.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)' }}>{tooltip.country.tz}</div>
          </div>
        </div>
      )}
    </div>
  );
}
