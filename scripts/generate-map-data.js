#!/usr/bin/env node
/**
 * Generates optimized world map data for TimestampLab
 * - Downloads world GeoJSON
 * - Maps countries to IANA timezones
 * - Simplifies polygon coordinates (reduces file size)
 * - Outputs src/data/worldMap.ts
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Country name → { timezone, flag, offset label }
// For countries with multiple timezones, we use the capital/most populous city's timezone
const COUNTRY_TIMEZONE_MAP = {
  'Afghanistan': { tz: 'Asia/Kabul', flag: '🇦🇫' },
  'Albania': { tz: 'Europe/Tirane', flag: '🇦🇱' },
  'Algeria': { tz: 'Africa/Algiers', flag: '🇩🇿' },
  'Angola': { tz: 'Africa/Luanda', flag: '🇦🇴' },
  'Argentina': { tz: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  'Armenia': { tz: 'Asia/Yerevan', flag: '🇦🇲' },
  'Australia': { tz: 'Australia/Sydney', flag: '🇦🇺' },
  'Austria': { tz: 'Europe/Vienna', flag: '🇦🇹' },
  'Azerbaijan': { tz: 'Asia/Baku', flag: '🇦🇿' },
  'Bahrain': { tz: 'Asia/Bahrain', flag: '🇧🇭' },
  'Bangladesh': { tz: 'Asia/Dhaka', flag: '🇧🇩' },
  'Belarus': { tz: 'Europe/Minsk', flag: '🇧🇾' },
  'Belgium': { tz: 'Europe/Brussels', flag: '🇧🇪' },
  'Belize': { tz: 'America/Belize', flag: '🇧🇿' },
  'Benin': { tz: 'Africa/Porto-Novo', flag: '🇧🇯' },
  'Bhutan': { tz: 'Asia/Thimphu', flag: '🇧🇹' },
  'Bolivia': { tz: 'America/La_Paz', flag: '🇧🇴' },
  'Bosnia and Herzegovina': { tz: 'Europe/Sarajevo', flag: '🇧🇦' },
  'Botswana': { tz: 'Africa/Gaborone', flag: '🇧🇼' },
  'Brazil': { tz: 'America/Sao_Paulo', flag: '🇧🇷' },
  'Brunei': { tz: 'Asia/Brunei', flag: '🇧🇳' },
  'Bulgaria': { tz: 'Europe/Sofia', flag: '🇧🇬' },
  'Burkina Faso': { tz: 'Africa/Ouagadougou', flag: '🇧🇫' },
  'Burundi': { tz: 'Africa/Bujumbura', flag: '🇧🇮' },
  'Cambodia': { tz: 'Asia/Phnom_Penh', flag: '🇰🇭' },
  'Cameroon': { tz: 'Africa/Douala', flag: '🇨🇲' },
  'Canada': { tz: 'America/Toronto', flag: '🇨🇦' },
  'Central African Republic': { tz: 'Africa/Bangui', flag: '🇨🇫' },
  'Chad': { tz: 'Africa/Ndjamena', flag: '🇹🇩' },
  'Chile': { tz: 'America/Santiago', flag: '🇨🇱' },
  'China': { tz: 'Asia/Shanghai', flag: '🇨🇳' },
  'Colombia': { tz: 'America/Bogota', flag: '🇨🇴' },
  'Congo': { tz: 'Africa/Brazzaville', flag: '🇨🇬' },
  'Democratic Republic of the Congo': { tz: 'Africa/Kinshasa', flag: '🇨🇩' },
  'Costa Rica': { tz: 'America/Costa_Rica', flag: '🇨🇷' },
  'Croatia': { tz: 'Europe/Zagreb', flag: '🇭🇷' },
  'Cuba': { tz: 'America/Havana', flag: '🇨🇺' },
  'Cyprus': { tz: 'Asia/Nicosia', flag: '🇨🇾' },
  'Czech Republic': { tz: 'Europe/Prague', flag: '🇨🇿' },
  'Czechia': { tz: 'Europe/Prague', flag: '🇨🇿' },
  'Denmark': { tz: 'Europe/Copenhagen', flag: '🇩🇰' },
  'Djibouti': { tz: 'Africa/Djibouti', flag: '🇩🇯' },
  'Dominican Republic': { tz: 'America/Santo_Domingo', flag: '🇩🇴' },
  'Ecuador': { tz: 'America/Guayaquil', flag: '🇪🇨' },
  'Egypt': { tz: 'Africa/Cairo', flag: '🇪🇬' },
  'El Salvador': { tz: 'America/El_Salvador', flag: '🇸🇻' },
  'Equatorial Guinea': { tz: 'Africa/Malabo', flag: '🇬🇶' },
  'Eritrea': { tz: 'Africa/Asmara', flag: '🇪🇷' },
  'Estonia': { tz: 'Europe/Tallinn', flag: '🇪🇪' },
  'Ethiopia': { tz: 'Africa/Addis_Ababa', flag: '🇪🇹' },
  'Finland': { tz: 'Europe/Helsinki', flag: '🇫🇮' },
  'France': { tz: 'Europe/Paris', flag: '🇫🇷' },
  'Gabon': { tz: 'Africa/Libreville', flag: '🇬🇦' },
  'Gambia': { tz: 'Africa/Banjul', flag: '🇬🇲' },
  'Georgia': { tz: 'Asia/Tbilisi', flag: '🇬🇪' },
  'Germany': { tz: 'Europe/Berlin', flag: '🇩🇪' },
  'Ghana': { tz: 'Africa/Accra', flag: '🇬🇭' },
  'Greece': { tz: 'Europe/Athens', flag: '🇬🇷' },
  'Guatemala': { tz: 'America/Guatemala', flag: '🇬🇹' },
  'Guinea': { tz: 'Africa/Conakry', flag: '🇬🇳' },
  'Guinea-Bissau': { tz: 'Africa/Bissau', flag: '🇬🇼' },
  'Guyana': { tz: 'America/Guyana', flag: '🇬🇾' },
  'Haiti': { tz: 'America/Port-au-Prince', flag: '🇭🇹' },
  'Honduras': { tz: 'America/Tegucigalpa', flag: '🇭🇳' },
  'Hungary': { tz: 'Europe/Budapest', flag: '🇭🇺' },
  'Iceland': { tz: 'Atlantic/Reykjavik', flag: '🇮🇸' },
  'India': { tz: 'Asia/Kolkata', flag: '🇮🇳' },
  'Indonesia': { tz: 'Asia/Jakarta', flag: '🇮🇩' },
  'Iran': { tz: 'Asia/Tehran', flag: '🇮🇷' },
  'Iraq': { tz: 'Asia/Baghdad', flag: '🇮🇶' },
  'Ireland': { tz: 'Europe/Dublin', flag: '🇮🇪' },
  'Israel': { tz: 'Asia/Jerusalem', flag: '🇮🇱' },
  'Italy': { tz: 'Europe/Rome', flag: '🇮🇹' },
  'Ivory Coast': { tz: 'Africa/Abidjan', flag: '🇨🇮' },
  'Jamaica': { tz: 'America/Jamaica', flag: '🇯🇲' },
  'Japan': { tz: 'Asia/Tokyo', flag: '🇯🇵' },
  'Jordan': { tz: 'Asia/Amman', flag: '🇯🇴' },
  'Kazakhstan': { tz: 'Asia/Almaty', flag: '🇰🇿' },
  'Kenya': { tz: 'Africa/Nairobi', flag: '🇰🇪' },
  'North Korea': { tz: 'Asia/Pyongyang', flag: '🇰🇵' },
  'South Korea': { tz: 'Asia/Seoul', flag: '🇰🇷' },
  'Kosovo': { tz: 'Europe/Belgrade', flag: '🇽🇰' },
  'Kuwait': { tz: 'Asia/Kuwait', flag: '🇰🇼' },
  'Kyrgyzstan': { tz: 'Asia/Bishkek', flag: '🇰🇬' },
  'Laos': { tz: 'Asia/Vientiane', flag: '🇱🇦' },
  'Latvia': { tz: 'Europe/Riga', flag: '🇱🇻' },
  'Lebanon': { tz: 'Asia/Beirut', flag: '🇱🇧' },
  'Lesotho': { tz: 'Africa/Maseru', flag: '🇱🇸' },
  'Liberia': { tz: 'Africa/Monrovia', flag: '🇱🇷' },
  'Libya': { tz: 'Africa/Tripoli', flag: '🇱🇾' },
  'Lithuania': { tz: 'Europe/Vilnius', flag: '🇱🇹' },
  'Luxembourg': { tz: 'Europe/Luxembourg', flag: '🇱🇺' },
  'Macedonia': { tz: 'Europe/Skopje', flag: '🇲🇰' },
  'Madagascar': { tz: 'Indian/Antananarivo', flag: '🇲🇬' },
  'Malawi': { tz: 'Africa/Blantyre', flag: '🇲🇼' },
  'Malaysia': { tz: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
  'Mali': { tz: 'Africa/Bamako', flag: '🇲🇱' },
  'Mauritania': { tz: 'Africa/Nouakchott', flag: '🇲🇷' },
  'Mexico': { tz: 'America/Mexico_City', flag: '🇲🇽' },
  'Moldova': { tz: 'Europe/Chisinau', flag: '🇲🇩' },
  'Mongolia': { tz: 'Asia/Ulaanbaatar', flag: '🇲🇳' },
  'Montenegro': { tz: 'Europe/Podgorica', flag: '🇲🇪' },
  'Morocco': { tz: 'Africa/Casablanca', flag: '🇲🇦' },
  'Mozambique': { tz: 'Africa/Maputo', flag: '🇲🇿' },
  'Myanmar': { tz: 'Asia/Rangoon', flag: '🇲🇲' },
  'Namibia': { tz: 'Africa/Windhoek', flag: '🇳🇦' },
  'Nepal': { tz: 'Asia/Kathmandu', flag: '🇳🇵' },
  'Netherlands': { tz: 'Europe/Amsterdam', flag: '🇳🇱' },
  'New Zealand': { tz: 'Pacific/Auckland', flag: '🇳🇿' },
  'Nicaragua': { tz: 'America/Managua', flag: '🇳🇮' },
  'Niger': { tz: 'Africa/Niamey', flag: '🇳🇪' },
  'Nigeria': { tz: 'Africa/Lagos', flag: '🇳🇬' },
  'Norway': { tz: 'Europe/Oslo', flag: '🇳🇴' },
  'Oman': { tz: 'Asia/Muscat', flag: '🇴🇲' },
  'Pakistan': { tz: 'Asia/Karachi', flag: '🇵🇰' },
  'Panama': { tz: 'America/Panama', flag: '🇵🇦' },
  'Papua New Guinea': { tz: 'Pacific/Port_Moresby', flag: '🇵🇬' },
  'Paraguay': { tz: 'America/Asuncion', flag: '🇵🇾' },
  'Peru': { tz: 'America/Lima', flag: '🇵🇪' },
  'Philippines': { tz: 'Asia/Manila', flag: '🇵🇭' },
  'Poland': { tz: 'Europe/Warsaw', flag: '🇵🇱' },
  'Portugal': { tz: 'Europe/Lisbon', flag: '🇵🇹' },
  'Puerto Rico': { tz: 'America/Puerto_Rico', flag: '🇵🇷' },
  'Qatar': { tz: 'Asia/Qatar', flag: '🇶🇦' },
  'Romania': { tz: 'Europe/Bucharest', flag: '🇷🇴' },
  'Russia': { tz: 'Europe/Moscow', flag: '🇷🇺' },
  'Rwanda': { tz: 'Africa/Kigali', flag: '🇷🇼' },
  'Saudi Arabia': { tz: 'Asia/Riyadh', flag: '🇸🇦' },
  'Senegal': { tz: 'Africa/Dakar', flag: '🇸🇳' },
  'Serbia': { tz: 'Europe/Belgrade', flag: '🇷🇸' },
  'Sierra Leone': { tz: 'Africa/Freetown', flag: '🇸🇱' },
  'Slovakia': { tz: 'Europe/Bratislava', flag: '🇸🇰' },
  'Slovenia': { tz: 'Europe/Ljubljana', flag: '🇸🇮' },
  'Somalia': { tz: 'Africa/Mogadishu', flag: '🇸🇴' },
  'South Africa': { tz: 'Africa/Johannesburg', flag: '🇿🇦' },
  'South Sudan': { tz: 'Africa/Juba', flag: '🇸🇸' },
  'Spain': { tz: 'Europe/Madrid', flag: '🇪🇸' },
  'Sri Lanka': { tz: 'Asia/Colombo', flag: '🇱🇰' },
  'Sudan': { tz: 'Africa/Khartoum', flag: '🇸🇩' },
  'Suriname': { tz: 'America/Paramaribo', flag: '🇸🇷' },
  'Swaziland': { tz: 'Africa/Mbabane', flag: '🇸🇿' },
  'Sweden': { tz: 'Europe/Stockholm', flag: '🇸🇪' },
  'Switzerland': { tz: 'Europe/Zurich', flag: '🇨🇭' },
  'Syria': { tz: 'Asia/Damascus', flag: '🇸🇾' },
  'Taiwan': { tz: 'Asia/Taipei', flag: '🇹🇼' },
  'Tajikistan': { tz: 'Asia/Dushanbe', flag: '🇹🇯' },
  'Tanzania': { tz: 'Africa/Dar_es_Salaam', flag: '🇹🇿' },
  'Thailand': { tz: 'Asia/Bangkok', flag: '🇹🇭' },
  'Timor-Leste': { tz: 'Asia/Dili', flag: '🇹🇱' },
  'Togo': { tz: 'Africa/Lome', flag: '🇹🇬' },
  'Trinidad and Tobago': { tz: 'America/Port_of_Spain', flag: '🇹🇹' },
  'Tunisia': { tz: 'Africa/Tunis', flag: '🇹🇳' },
  'Turkey': { tz: 'Europe/Istanbul', flag: '🇹🇷' },
  'Turkmenistan': { tz: 'Asia/Ashgabat', flag: '🇹🇲' },
  'Uganda': { tz: 'Africa/Kampala', flag: '🇺🇬' },
  'Ukraine': { tz: 'Europe/Kiev', flag: '🇺🇦' },
  'United Arab Emirates': { tz: 'Asia/Dubai', flag: '🇦🇪' },
  'United Kingdom': { tz: 'Europe/London', flag: '🇬🇧' },
  'United States of America': { tz: 'America/New_York', flag: '🇺🇸' },
  'Uruguay': { tz: 'America/Montevideo', flag: '🇺🇾' },
  'Uzbekistan': { tz: 'Asia/Tashkent', flag: '🇺🇿' },
  'Venezuela': { tz: 'America/Caracas', flag: '🇻🇪' },
  'Vietnam': { tz: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
  'Yemen': { tz: 'Asia/Aden', flag: '🇾🇪' },
  'Zambia': { tz: 'Africa/Lusaka', flag: '🇿🇲' },
  'The Bahamas': { tz: 'America/Nassau', flag: '🇧🇸' },
  'Republic of the Congo': { tz: 'Africa/Brazzaville', flag: '🇨🇬' },
  'Fiji': { tz: 'Pacific/Fiji', flag: '🇫🇯' },
  'Falkland Islands': { tz: 'Atlantic/Stanley', flag: '🇫🇰' },
  'England': { tz: 'Europe/London', flag: '🇬🇧' },
  'Guinea Bissau': { tz: 'Africa/Bissau', flag: '🇬🇼' },
  'Greenland': { tz: 'America/Godthab', flag: '🇬🇱' },
  'New Caledonia': { tz: 'Pacific/Noumea', flag: '🇳🇨' },
  'Solomon Islands': { tz: 'Pacific/Guadalcanal', flag: '🇸🇧' },
  'Somaliland': { tz: 'Africa/Mogadishu', flag: '🇸🇴' },
  'Republic of Serbia': { tz: 'Europe/Belgrade', flag: '🇷🇸' },
  'East Timor': { tz: 'Asia/Dili', flag: '🇹🇱' },
  'United Republic of Tanzania': { tz: 'Africa/Dar_es_Salaam', flag: '🇹🇿' },
  'USA': { tz: 'America/New_York', flag: '🇺🇸' },
  'Vanuatu': { tz: 'Pacific/Efate', flag: '🇻🇺' },
  'Zimbabwe': { tz: 'Africa/Harare', flag: '🇿🇼' },
  'The Bahamas': { tz: 'America/Nassau', flag: '🇧🇸' },
  'Republic of the Congo': { tz: 'Africa/Brazzaville', flag: '🇨🇬' },
  'Fiji': { tz: 'Pacific/Fiji', flag: '🇫🇯' },
  'Falkland Islands': { tz: 'Atlantic/Stanley', flag: '🇫🇰' },
  'England': { tz: 'Europe/London', flag: '🇬🇧' },
  'Guinea Bissau': { tz: 'Africa/Bissau', flag: '🇬🇼' },
  'Greenland': { tz: 'America/Godthab', flag: '🇬🇱' },
  'New Caledonia': { tz: 'Pacific/Noumea', flag: '🇳🇨' },
  'Solomon Islands': { tz: 'Pacific/Guadalcanal', flag: '🇸🇧' },
  'Somaliland': { tz: 'Africa/Mogadishu', flag: '🇸🇴' },
  'Republic of Serbia': { tz: 'Europe/Belgrade', flag: '🇷🇸' },
  'East Timor': { tz: 'Asia/Dili', flag: '🇹🇱' },
  'United Republic of Tanzania': { tz: 'Africa/Dar_es_Salaam', flag: '🇹🇿' },
  'USA': { tz: 'America/New_York', flag: '🇺🇸' },
  'Vanuatu': { tz: 'Pacific/Efate', flag: '🇻🇺' },
  'West Bank': { tz: 'Asia/Hebron', flag: '🇵🇸' },
  'Northern Cyprus': { tz: 'Asia/Nicosia', flag: '🇨🇾' },
  'Western Sahara': { tz: 'Africa/El_Aaiun', flag: '🇪🇭' },
};

// Simplify polygon coordinates - reduce precision and thin points
function simplifyCoords(coords, tolerance = 0.3) {
  if (!Array.isArray(coords[0])) return coords;
  if (!Array.isArray(coords[0][0])) {
    // Array of [lng, lat] points - apply Douglas-Peucker simplification
    return douglasPeucker(coords, tolerance);
  }
  return coords.map(c => simplifyCoords(c, tolerance));
}

function pointLineDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return Math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2);
  }
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy);
  const tClamped = Math.max(0, Math.min(1, t));
  return Math.sqrt((point[0] - start[0] - tClamped * dx) ** 2 + (point[1] - start[1] - tClamped * dy) ** 2);
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointLineDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

// Round coordinates to 2 decimal places
function roundCoords(coords) {
  if (!Array.isArray(coords[0])) return coords;
  if (typeof coords[0][0] === 'number') {
    return coords.map(([lng, lat]) => [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100]);
  }
  return coords.map(c => roundCoords(c));
}

function processGeoJSON(geojson) {
  const features = [];
  let matched = 0, unmatched = [];

  for (const feature of geojson.features) {
    const name = feature.properties.name;
    const tzInfo = COUNTRY_TIMEZONE_MAP[name];

    if (!tzInfo) {
      unmatched.push(name);
      continue;
    }

    matched++;
    const simplified = {
      name,
      tz: tzInfo.tz,
      flag: tzInfo.flag,
      geometry: {
        type: feature.geometry.type,
        coordinates: roundCoords(simplifyCoords(feature.geometry.coordinates, 0.3))
      }
    };
    features.push(simplified);
  }

  console.log(`Matched: ${matched}, Unmatched: ${unmatched.length}`);
  if (unmatched.length) console.log('Unmatched:', unmatched);
  return features;
}

// Main
const raw = JSON.parse(fs.readFileSync('/tmp/world.geojson', 'utf8'));
const features = processGeoJSON(raw);

const outDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const output = `// Auto-generated world map data
// Do not edit manually - run scripts/generate-map-data.js to regenerate

export interface CountryFeature {
  name: string;
  tz: string;
  flag: string;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export const WORLD_FEATURES: CountryFeature[] = ${JSON.stringify(features, null, 0)};
`;

fs.writeFileSync(path.join(outDir, 'worldMap.ts'), output);

const sizeKB = Math.round(Buffer.byteLength(output) / 1024);
console.log(`Generated worldMap.ts: ${sizeKB}KB, ${features.length} countries`);
