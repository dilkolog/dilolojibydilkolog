// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  POPULAR_CITIES,
  resolveCoordinates,
  weatherConditionFromWmo,
  weatherConditionName,
  weatherOrDayScene,
  type WeatherInfo,
} from './weather'
import { DayMark } from '../ui/HomeParts'
import weatherRain from '../assets/art/weather-rain.webp'
import weatherSnow from '../assets/art/weather-snow.webp'
import weatherCloudy from '../assets/art/weather-cloudy.webp'
import weatherThunder from '../assets/art/weather-thunder.webp'
import noon from '../assets/art/time-noon.webp'

describe('weather engine', () => {
  it('maps WMO codes correctly to weather conditions', () => {
    expect(weatherConditionFromWmo(0)).toBe('clear')
    expect(weatherConditionFromWmo(1)).toBe('clear')
    expect(weatherConditionFromWmo(2)).toBe('cloudy')
    expect(weatherConditionFromWmo(3)).toBe('cloudy')
    expect(weatherConditionFromWmo(45)).toBe('fog')
    expect(weatherConditionFromWmo(61)).toBe('rain')
    expect(weatherConditionFromWmo(80)).toBe('rain')
    expect(weatherConditionFromWmo(71)).toBe('snow')
    expect(weatherConditionFromWmo(95)).toBe('thunder')
  })

  it('provides friendly Turkish condition names', () => {
    expect(weatherConditionName('clear', true)).toBe('Güneşli')
    expect(weatherConditionName('clear', false)).toBe('Yıldızlı')
    expect(weatherConditionName('rain', true)).toBe('Yağmurlu')
    expect(weatherConditionName('snow', true)).toBe('Karlı')
    expect(weatherConditionName('cloudy', true)).toBe('Parçalı bulutlu')
  })

  it('resolves coordinates for popular cities offline', async () => {
    const ist = await resolveCoordinates('İstanbul')
    expect(ist).toEqual(POPULAR_CITIES.istanbul)

    const paris = await resolveCoordinates('Paris')
    expect(paris).toEqual(POPULAR_CITIES.paris)

    const izmir = await resolveCoordinates('izmir')
    expect(izmir).toEqual(POPULAR_CITIES.izmir)
  })

  it('selects weather scene when raining or snowing, else time scene', () => {
    const rain: WeatherInfo = {
      condition: 'rain',
      temperature: 15,
      isDay: true,
      city: 'İstanbul',
      fetchedAt: Date.now(),
    }
    expect(weatherOrDayScene(rain, 'day')).toBe(weatherRain)

    const snow: WeatherInfo = {
      condition: 'snow',
      temperature: -2,
      isDay: true,
      city: 'Ankara',
      fetchedAt: Date.now(),
    }
    expect(weatherOrDayScene(snow, 'day')).toBe(weatherSnow)

    const thunder: WeatherInfo = {
      condition: 'thunder',
      temperature: 18,
      isDay: true,
      city: 'Antalya',
      fetchedAt: Date.now(),
    }
    expect(weatherOrDayScene(thunder, 'day')).toBe(weatherThunder)

    const cloudy: WeatherInfo = {
      condition: 'cloudy',
      temperature: 14,
      isDay: true,
      city: 'Trabzon',
      fetchedAt: Date.now(),
    }
    expect(weatherOrDayScene(cloudy, 'day')).toBe(weatherCloudy)

    const clear: WeatherInfo = {
      condition: 'clear',
      temperature: 24,
      isDay: true,
      city: 'İzmir',
      fetchedAt: Date.now(),
    }
    expect(weatherOrDayScene(clear, 'day')).toBe(noon)

    expect(weatherOrDayScene(null, 'day')).toBe(noon)
  })
})

describe('DayMark with weather', () => {
  let root: ReturnType<typeof createRoot> | undefined

  afterEach(() => {
    act(() => root?.unmount())
    document.body.innerHTML = ''
  })

  it('renders standard time scene when weather is null', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const atNoon = new Date('2026-10-16T13:00:00')
    await act(async () => root!.render(<DayMark now={atNoon} />))
    const img = host.querySelector('img.day-scene') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe(noon)
    expect(host.querySelector('.weather-badge-pill')).toBeNull()
  })

  it('renders weather rain scene and temperature badge when weather is rainy', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const atNoon = new Date('2026-10-16T13:00:00')
    const rain: WeatherInfo = {
      condition: 'rain',
      temperature: 16,
      isDay: true,
      city: 'İstanbul',
      fetchedAt: Date.now(),
    }
    await act(async () => root!.render(<DayMark now={atNoon} weather={rain} />))
    const img = host.querySelector('img.day-scene') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe(weatherRain)
    const badge = host.querySelector('.weather-badge-pill')
    expect(badge?.textContent).toBe('16°')
  })
})
