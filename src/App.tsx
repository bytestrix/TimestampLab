import { useState, useEffect, useRef } from 'react';
import TimestampConverter from './components/TimestampConverter';
import WorldClock from './components/WorldClock';
import TimeCalculator from './components/TimeCalculator';
import { Moon, Sun } from 'lucide-react';
import './App.css';

const SECTIONS = [
  { id: 'converter', label: 'Converter' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'worldclock', label: 'World Clock' },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('tsl-theme');
    return saved ? saved === 'dark' : true;
  });
  const [currentUnix, setCurrentUnix] = useState(Math.floor(Date.now() / 1000));
  const [currentMs, setCurrentMs] = useState(Date.now() % 1000);
  const [active, setActive] = useState('converter');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const root = window.document.documentElement;
    darkMode ? root.classList.remove('light') : root.classList.add('light');
    localStorage.setItem('tsl-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setCurrentUnix(Math.floor(now / 1000));
      setCurrentMs(now % 1000);
    }, 100);
    return () => clearInterval(t);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 20px', height: '52px',
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontWeight: 600, fontSize: '14px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
          <div style={{
            width: '26px', height: '26px', background: 'var(--accent)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 600,
            color: '#07080b', letterSpacing: '-0.04em', flexShrink: 0,
          }}>TSL</div>
          TimestampLab
        </div>

        {/* Section nav */}
        <nav style={{ display: 'flex', gap: '2px', marginLeft: '16px' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--r)',
                border: active === s.id ? '1px solid var(--accent-border)' : '1px solid transparent',
                background: active === s.id ? 'var(--accent-dim)' : 'transparent',
                color: active === s.id ? 'var(--accent)' : 'var(--text-2)',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.14s', fontFamily: 'var(--sans)',
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Live ticker */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px',
          fontFamily: 'var(--mono)', fontSize: '12px',
          background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
          borderRadius: '999px', padding: '4px 12px 4px 8px',
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: 'var(--accent)', animation: 'blink 1.8s ease-in-out infinite', flexShrink: 0,
          }} />
          <span style={{ color: 'var(--text-3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>now</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: '-0.02em' }}>{currentUnix}</span>
          <span style={{ color: 'var(--text-3)' }}>.{String(currentMs).padStart(3, '0')}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          style={{
            width: '30px', height: '30px', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', background: 'transparent', color: 'var(--text-2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </header>

      {/* Single page content */}
      <main style={{ flex: 1, padding: '24px 20px 60px', maxWidth: '860px', width: '100%', margin: '0 auto' }}>

        {/* Converter section */}
        <section id="converter" ref={el => sectionRefs.current['converter'] = el} style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Converter</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <TimestampConverter />
        </section>

        {/* Calculator section */}
        <section id="calculator" ref={el => sectionRefs.current['calculator'] = el} style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Calculator</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <TimeCalculator />
        </section>

        {/* World Clock section */}
        <section id="worldclock" ref={el => sectionRefs.current['worldclock'] = el}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>World Clock</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <WorldClock />
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '11px', color: 'var(--text-3)', flexWrap: 'wrap', gap: '8px',
      }}>
        <span>TimestampLab · Open source</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px' }}>Ctrl+L</span>
          <span>insert now</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px' }}>Enter</span>
          <span>convert</span>
        </div>
      </footer>
    </div>
  );
}
