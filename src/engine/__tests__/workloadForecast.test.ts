import { describe, expect, it } from 'vitest'
import { forecastWorkload } from '../workloadForecast'

describe('workload forecast', () => {
  it('grows with the new-word pace and settles over time', () => {
    const five = forecastWorkload(5, 0.9)
    const ten = forecastWorkload(10, 0.9)
    expect(ten.reviewsAt(30)).toBeCloseTo(five.reviewsAt(30) * 2)
    expect(five.reviewsAt(30)).toBeGreaterThan(five.reviewsAt(3))
    // Growth slows down: the second month adds less than the first.
    expect(five.reviewsAt(60) - five.reviewsAt(30)).toBeLessThan(five.reviewsAt(30))
  })

  it('costs more at a higher target retention', () => {
    expect(forecastWorkload(5, 0.95).reviewsAt(30)).toBeGreaterThan(forecastWorkload(5, 0.85).reviewsAt(30))
  })
})
