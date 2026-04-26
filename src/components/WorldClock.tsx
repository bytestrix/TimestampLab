import { useState, useEffect, useMemo, useCallback } from 'react';
import WorldMap from './WorldMap';
import type { CountryFeature } from '../data/worldMap';
import { X } from 'lucide-react';

const DEFAULT_CITIES = [
  { name: 'Los Angeles', tz: 'America/Los_Angeles', flag: '🇺🇸', country: 'USA' },
  { name: 'New York', tz: 'America/New_York', flag: '🇺🇸', country: 'USA' },
  { name: 'London', tz: 'Europe/London', flag: '🇬🇧', country: 'UK' },
  { name: 'Paris', tz: 'Europe/Paris', flag: '🇫🇷', country: 'France' },
  { name: 'Dubai', tz: 'Asia/Dubai', flag: '🇦🇪', country: 'UAE' },
  { name: 'Bangalore', tz: 'Asia/Kolkata', flag: '🇮🇳', country: 'India' },
  { name: 'Singapore', tz: 'Asia/Singapore', flag: '🇸🇬', country: 'Singapore' },
  { name: 'Tokyo', tz: 'Asia/Tokyo', flag: '🇯🇵', country: 'Japan' },
  { name: 'Sydney', tz: 'Australia/Sydney', flag: '🇦🇺', country: 'Australia' },
];

interface CityEntry {
  name: string;
  tz: string;
  flag: string;
  country: string;
}

function getUTCOffsetStr(tz: string, now: number) {
  try {
    const parts = Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(now));
    const off = parts.find(p => p.type === 'timeZoneName');
    return off ? off.value : '';
  } catch (_) { return ''; }
}

export default function WorldClock() {
  const [tick, setTick] = useState(Date.now());
  const [cities, setCities] = useState<CityEntry[]>(DEFAULT_CITIES);
  const [selectedTz, setSelectedTz] = useState<string | undefined>();
  const [showMap, setShowMap] = useState(true);
  const localTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleCountrySelect = useCallback((country: CountryFeature) => {
    setSelectedTz(country.tz);
    // Add to cities if not already present
    setCities(prev => {
      if (prev.some(c => c.tz === country.tz)) return prev;
      return [...prev, {
        name: country.name,
        tz: country.tz,
        flag: country.flag,
        country: country.name,
      }];
    });
  }, []);

  const removeCity = useCallback((tz: string) => {
    setCities(prev => prev.filter(c => c.tz !== tz));
    if (selectedTz === tz) setSelectedTz(undefined);
  }, [selectedTz]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Map */}
      <div className="card">
        <div className="card-hd" style={{ marginBottom: '12px' }}>
          <span className="card-title">World Map</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {localTz}
            </span>
            <button
              onClick={() => setShowMap(v => !v)}
              style={{
                fontSize: '11px', color: 'var(--text-3)', background: 'var(--elevated)',
                border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '2px 8px',
                cursor: 'pointer'
              }}
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
          </div>
        </div>

        {showMap && (
          <>
            <WorldMap onSelect={handleCountrySelect} selectedTz={selectedTz} />
            <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px', textAlign: 'center' }}>
              Click any country to add it to your clock
            </p>
          </>
        )}
      </div>

      {/* Clocks grid */}
      <div className="card">
        <div className="card-hd" style={{ marginBottom: '12px' }}>
          <span className="card-title">World Clock</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{cities.length} cities</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '10px'
        }}>
          {cities.map(city => {
            const isLocal = localTz === city.tz;
            const isSelected = selectedTz === city.tz;
            const now = new Date(tick);
            const timeStr = new Intl.DateTimeFormat('en-GB', {
              timeZone: city.tz,
              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            }).format(now);
            const dateStr = new Intl.DateTimeFormat('en-US', {
              timeZone: city.tz,
              weekday: 'short', month: 'short', day: 'numeric',
            }).format(now);
            const offset = getUTCOffsetStr(city.tz, tick);

            return (
              <div
                key={city.tz}
                onClick={() => setSelectedTz(city.tz)}
                style={{
                  background: isLocal ? 'var(--accent-dim)' : isSelected ? 'var(--elevated)' : 'var(--card)',
                  border: isLocal
                    ? '1px solid var(--accent-border)'
                    : isSelected
                    ? '1px solid var(--border-hover)'
                    : '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '14px 16px',
                  transition: 'all 0.14s',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isLocal) e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Remove button - only for non-default cities */}
                {!DEFAULT_CITIES.some(d => d.tz === city.tz) && (
                  <button
                    onClick={e => { e.stopPropagation(); removeCity(city.tz); }}
                    style={{
                      position: 'absolute', top: '6px', right: '6px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-3)', padding: '2px', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={10} />
                  </button>
                )}

                <div style={{
                  fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{city.flag}</span>
                    <span>{city.name}</span>
                  </div>
                  {isLocal && (
                    <span style={{
                      background: 'var(--accent-dim)', color: 'var(--accent)',
                      border: '1px solid var(--accent-border)', borderRadius: '999px',
                      fontSize: '9px', fontWeight: 600, padding: '1px 6px',
                    }}>YOU</span>
                  )}
                </div>

                <div style={{
                  fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: 600,
                  color: isLocal ? 'var(--accent)' : 'var(--text)',
                  lineHeight: 1, marginBottom: '5px'
                }}>
                  {timeStr}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{dateStr}</div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)',
                  marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <span>{offset}</span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span style={{ fontFamily: 'var(--sans)' }}>{city.country}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
