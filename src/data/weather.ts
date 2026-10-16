import weatherRain from '../assets/art/weather-rain.webp'
import weatherSnow from '../assets/art/weather-snow.webp'
import { TIME_SCENE } from '../ui/drawnArt'
import type { SkyPhase } from '../ui/gardenSkyCalculations'
import { useEffect, useState } from 'react'

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'thunder' | 'fog'

export interface WeatherInfo {
  condition: WeatherCondition
  temperature: number
  isDay: boolean
  city: string
  fetchedAt: number
}

/** Pre-indexed popular cities for instant offline matching without API calls. */
export const POPULAR_CITIES: Record<string, { lat: number; lon: number; name: string }> = {
  istanbul: { lat: 41.0082, lon: 28.9784, name: 'İstanbul' },
  ankara: { lat: 39.9334, lon: 32.8597, name: 'Ankara' },
  izmir: { lat: 38.4192, lon: 27.1287, name: 'İzmir' },
  antalya: { lat: 36.8969, lon: 30.7133, name: 'Antalya' },
  bursa: { lat: 40.1885, lon: 29.061, name: 'Bursa' },
  adana: { lat: 37.0, lon: 35.3213, name: 'Adana' },
  trabzon: { lat: 41.0015, lon: 39.7178, name: 'Trabzon' },
  paris: { lat: 48.8566, lon: 2.3522, name: 'Paris' },
  london: { lat: 51.5074, lon: -0.1278, name: 'Londra' },
  londra: { lat: 51.5074, lon: -0.1278, name: 'Londra' },
  madrid: { lat: 40.4168, lon: -3.7038, name: 'Madrid' },
  barcelona: { lat: 41.3879, lon: 2.1699, name: 'Barselona' },
  berlin: { lat: 52.52, lon: 13.405, name: 'Berlin' },
  roma: { lat: 41.9028, lon: 12.4964, name: 'Roma' },
  rome: { lat: 41.9028, lon: 12.4964, name: 'Roma' },
  amsterdam: { lat: 52.3676, lon: 4.9041, name: 'Amsterdam' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  newyork: { lat: 40.7128, lon: -74.006, name: 'New York' },
}

const normalizeCity = (c: string) =>
  c
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '')

/** Translates WMO weather code to standard condition. */
export function weatherConditionFromWmo(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (
    (code >= 51 && code <= 57) ||
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82)
  )
    return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95 && code <= 99) return 'thunder'
  return 'cloudy'
}

/** Human-readable Turkish weather description. */
export function weatherConditionName(condition: WeatherCondition, isDay: boolean): string {
  switch (condition) {
    case 'clear':
      return isDay ? 'Güneşli' : 'Yıldızlı'
    case 'cloudy':
      return 'Parçalı bulutlu'
    case 'rain':
      return 'Yağmurlu'
    case 'snow':
      return 'Karlı'
    case 'thunder':
      return 'Fırtınalı'
    case 'fog':
      return 'Sisli'
  }
}

const CACHE_KEY = 'diloloji:weather-cache'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

function getCachedWeather(key: string): WeatherInfo | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeatherInfo
    if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function setCachedWeather(key: string, info: WeatherInfo): void {
  try {
    localStorage.setItem(`${CACHE_KEY}:${key}`, JSON.stringify(info))
  } catch {
    // ignore
  }
}

/** Resolves coordinates from city name via offline dictionary or Open-Meteo Geocoding. */
export async function resolveCoordinates(
  cityName: string
): Promise<{ lat: number; lon: number; name: string } | null> {
  const norm = normalizeCity(cityName)
  if (POPULAR_CITIES[norm]) return POPULAR_CITIES[norm]

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=tr&format=json`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const top = data.results[0]
      return { lat: top.latitude, lon: top.longitude, name: top.name }
    }
  } catch {
    // offline or network error
  }
  return null
}

/** Fetches current weather for given coordinates. */
export async function fetchWeatherForCoords(
  lat: number,
  lon: number,
  cityName: string
): Promise<WeatherInfo | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = getCachedWeather(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,is_day`
    )
    if (!res.ok) return null
    const data = await res.json()
    const current = data.current
    if (!current) return null

    const info: WeatherInfo = {
      condition: weatherConditionFromWmo(current.weather_code),
      temperature: Math.round(current.temperature_2m),
      isDay: current.is_day === 1,
      city: cityName,
      fetchedAt: Date.now(),
    }
    setCachedWeather(cacheKey, info)
    return info
  } catch {
    return null
  }
}

/** Chooses the greeting illustration art: weather scene if rainy/snowy, else time of day scene. */
export function weatherOrDayScene(weather: WeatherInfo | null, part: SkyPhase): string {
  if (weather) {
    if (weather.condition === 'rain' || weather.condition === 'thunder') {
      return weatherRain
    }
    if (weather.condition === 'snow') {
      return weatherSnow
    }
  }
  return TIME_SCENE[part]
}

/** React hook for loading weather info based on profile location. */
export function useWeather(
  location?: string,
  coordinates?: { lat: number; lon: number }
): { weather: WeatherInfo | null; loading: boolean } {
  const [weather, setWeather] = useState<WeatherInfo | null>(() => {
    if (coordinates) {
      return getCachedWeather(`${coordinates.lat.toFixed(2)},${coordinates.lon.toFixed(2)}`)
    }
    if (location) {
      const norm = normalizeCity(location)
      if (POPULAR_CITIES[norm]) {
        const c = POPULAR_CITIES[norm]
        return getCachedWeather(`${c.lat.toFixed(2)},${c.lon.toFixed(2)}`)
      }
    }
    return null
  })
  const [loading, setLoading] = useState(false)

  const lat = coordinates?.lat
  const lon = coordinates?.lon

  useEffect(() => {
    if (!location && (lat === undefined || lon === undefined)) {
      setWeather(null)
      return
    }

    let active = true
    setLoading(true)

    async function load() {
      let curLat = lat
      let curLon = lon
      let name = location ?? 'Konum'

      if (curLat === undefined || curLon === undefined) {
        if (!location) return
        const resolved = await resolveCoordinates(location)
        if (!resolved) {
          if (active) setLoading(false)
          return
        }
        curLat = resolved.lat
        curLon = resolved.lon
        name = resolved.name
      }

      const info = await fetchWeatherForCoords(curLat, curLon, name)
      if (active) {
        setWeather(info)
        setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [location, lat, lon])

  return { weather, loading }
}
