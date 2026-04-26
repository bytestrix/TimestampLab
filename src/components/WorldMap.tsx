import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { WORLD_FEATURES } from '../data/worldMap';
import { MAP_CITIES, type CityOption } from '../data/multiTzCountries';
import { coordsToPath, project } from '../utils/mapUtils';

interface Props {
  onCitySelect: (city: CityOption) => void;
  selectedTz?: string;
  userCountry?: string;
}

function getLocalTime(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date());
  } catch { return ''; }
}

function getOffsetStr(tz: string): string {
  try {
    const parts = Intl.DateTimeFormat('en', {
      timeZone: tz, timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch { return ''; }
}

export default function WorldMap({ onCitySelect, selectedTz, userCountry }: Props) {
  const [hoveredCity, setHoveredCity] = useState<CityOption | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tick, setTick] = useState(Date.now());
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const paths = useMemo(() =>
    WORLD_FEATURES.map(f => ({
      name: f.name,
      tz: f.tz,
      d: coordsToPath(
        f.geometry.type === 'Polygon'
          ? (f.geometry.coordinates as number[][][])
          : (f.geometry.coordinates as number[][][][]).flat()
      )
    })), []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        width="100%"
        style={{
          display: 'block',
          background: 'var(--map-ocean)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)',
          cursor: 'default',
        }}
      >
        {/* Graticule */}
        <g stroke="var(--border)" strokeWidth="0.3" opacity="0.4">
          {[-60, -30, 0, 30, 60].map(lat => (
            <line key={lat} x1="0" y1={(90 - lat) * (400 / 180)} x2="800" y2={(90 - lat) * (400 / 180)} />
          ))}
          {[-120, -60, 0, 60, 120].map(lng => (
            <line key={lng} x1={(lng + 180) * (800 / 360)} y1="0" x2={(lng + 180) * (800 / 360)} y2="400" />
          ))}
        </g>

        {/* Countries - no click, just visual */}
        {paths.map(({ name, tz, d }) => {
          const isUserCountry = name === userCountry;
          const isActive = selectedTz === tz;
          return (
            <path
              key={`${name}-${tz}`}
              d={d}
              fill={isActive ? 'var(--accent)' : isUserCountry ? 'var(--map-user)' : 'var(--map-land)'}
              stroke="var(--map-border)"
              strokeWidth="0.4"
              style={{ transition: 'fill 0.1s' }}
            />
          );
        })}

        {/* City dots - hover shows tooltip, click adds to clock */}
        {MAP_CITIES.map(city => {
          const [cx, cy] = project(city.lng, city.lat);
          const isActive = selectedTz === city.tz;
          return (
            <circle
              key={city.name}
              cx={cx} cy={cy}
              r={isActive ? 4.5 : 3}
              fill={isActive ? 'var(--accent)' : 'var(--map-dot)'}
              stroke={isActive ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)'}
              strokeWidth="0.8"
              style={{ cursor: 'pointer', transition: 'all 0.1s' }}
              onMouseEnter={e => {
                setHoveredCity(city);
                setTooltipPos({ x: e.clientX, y: e.clientY });
                if (!isActive) e.currentTarget.setAttribute('r', '5');
              }}
              onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={e => {
                setHoveredCity(null);
                if (!isActive) e.currentTarget.setAttribute('r', '3');
              }}
              onClick={() => onCitySelect(city)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredCity && (
        <div
          key={`${hoveredCity.name}-${tick}`}
          style={{
            position: 'fixed',
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 14,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>
            {hoveredCity.name}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>
            {getLocalTime(hoveredCity.tz)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>
            {getOffsetStr(hoveredCity.tz)} · click to add
          </div>
        </div>
      )}
    </div>
  );
}
