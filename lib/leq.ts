import type { TimePeriod, TimePeriodOption, LeqResult, ReadingData } from "@/types"

/**
 * Leq (equivalent continuous sound level) from discrete sound-level samples.
 * Assumes each sample represents the same effective averaging time (typical for evenly spaced logs).
 *
 * Formula (energy average, IEC 61672 / ISO 1996):\
 * **Leq = 10 · log₁₀((1/N) · Σᵢ 10^(Lᵢ/10))** where Lᵢ are samples in dB.
 */
export const LEQ_INTERVALS: TimePeriodOption[] = [
  { value: "15sec", label: "15 seconds", durationMs: 15 * 1000, description: "Very short window" },
  { value: "60sec", label: "60 seconds", durationMs: 60 * 1000, description: "1 minute" },
  { value: "15min", label: "15 minutes", durationMs: 15 * 60 * 1000, description: "Short-term exposure" },
  { value: "1hr", label: "1 hour", durationMs: 60 * 60 * 1000, description: "1 hour" },
  { value: "24hr", label: "1 day", durationMs: 24 * 60 * 60 * 1000, description: "Daily average" },
  { value: "15days", label: "15 days", durationMs: 15 * 24 * 60 * 60 * 1000, description: "15-day window" },
  { value: "1month", label: "1 month", durationMs: 30 * 24 * 60 * 60 * 1000, description: "~30 days" },
  { value: "3months", label: "3 months", durationMs: 90 * 24 * 60 * 60 * 1000, description: "~90 days" },
  { value: "6months", label: "6 months", durationMs: 180 * 24 * 60 * 60 * 1000, description: "~180 days" },
  { value: "1year", label: "1 year", durationMs: 365 * 24 * 60 * 60 * 1000, description: "365 days" },
  { value: "alltime", label: "All time", durationMs: 0, description: "Full history in database" },
]

/** @deprecated Use LEQ_INTERVALS */
export const TIME_PERIODS = LEQ_INTERVALS

export function getTimePeriodDuration(period: TimePeriod): number {
  if (period === "alltime") return 0
  const option = LEQ_INTERVALS.find((p) => p.value === period)
  return option?.durationMs ?? 24 * 60 * 60 * 1000
}

export function getNoiseValue(reading: ReadingData): number | null {
  if (reading.sound_dBA !== undefined && reading.sound_dBA !== null) {
    const val = Number(reading.sound_dBA)
    if (!isNaN(val) && val >= 0 && val <= 140) return val
  }
  if (reading.noise !== undefined && reading.noise !== null) {
    const val = Number(reading.noise)
    if (!isNaN(val) && val >= 0 && val <= 140) return val
  }
  return null
}

export function filterValidReadings(readings: Record<string, ReadingData>): ReadingData[] {
  return Object.entries(readings)
    .filter(([key]) => key !== "0")
    .map(([timestamp, data]) => ({
      ...data,
      timestamp: Number(timestamp),
    }))
    .filter((reading) => {
      const noise = getNoiseValue(reading)
      return noise !== null
    })
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function sampleReadings(readings: ReadingData[], maxSamples: number = 10000): ReadingData[] {
  if (readings.length <= maxSamples) return readings

  const step = Math.ceil(readings.length / maxSamples)
  return readings.filter((_, index) => index % step === 0)
}

export function calculateLeq(readings: ReadingData[]): LeqResult | null {
  const validReadings = readings.filter((r) => getNoiseValue(r) !== null)

  if (validReadings.length === 0) {
    return null
  }

  let sum10Pow: number = 0
  let min: number = Infinity
  let max: number = -Infinity
  let sum: number = 0

  for (const reading of validReadings) {
    const noise = getNoiseValue(reading)
    if (noise === null) continue

    sum10Pow += Math.pow(10, noise / 10)

    if (noise < min) min = noise
    if (noise > max) max = noise
    sum += noise
  }

  const leq = 10 * Math.log10(sum10Pow / validReadings.length)
  const avg = sum / validReadings.length

  return {
    leq: Math.round(leq * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    sampleCount: validReadings.length,
    timePeriod: "24hr",
    calculatedAt: new Date(),
    deviceId: "",
  }
}

export function getReadingsForPeriod(
  readings: Record<string, ReadingData>,
  period: TimePeriod
): ReadingData[] {
  const allReadings = filterValidReadings(readings)

  if (period === "alltime") {
    return sampleReadings(allReadings, 4000)
  }

  const now = Math.floor(Date.now() / 1000)
  const durationMs = getTimePeriodDuration(period)
  const durationSec = durationMs / 1000
  const startTime = now - durationSec

  const filteredReadings = allReadings.filter((r) => r.timestamp >= startTime)

  const maxSamples =
    period === "1year" || period === "6months" || period === "3months"
      ? 1200
      : period === "1month" || period === "15days" || period === "24hr"
        ? 2500
        : period === "1hr" || period === "15min"
          ? 8000
          : 15000

  return sampleReadings(filteredReadings, maxSamples)
}

export function calculateLeqForPeriod(
  readings: Record<string, ReadingData>,
  period: TimePeriod,
  deviceId: string
): LeqResult | null {
  const periodReadings = getReadingsForPeriod(readings, period)
  const result = calculateLeq(periodReadings)

  if (result) {
    result.timePeriod = period
    result.deviceId = deviceId
  }

  return result
}

export function getLeqCategory(leq: number): {
  category: string
  color: string
  bg: string
  description: string
} {
  if (leq < 50) {
    return {
      category: "Quiet",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Safe ambient noise levels",
    }
  }
  if (leq < 60) {
    return {
      category: "Moderate",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Normal conversation level",
    }
  }
  if (leq < 70) {
    return {
      category: "Elevated",
      color: "text-yellow-600",
      bg: "bg-yellow-100",
      description: "May cause annoyance over time",
    }
  }
  if (leq < 80) {
    return {
      category: "Loud",
      color: "text-orange-600",
      bg: "bg-orange-100",
      description: "Prolonged exposure may cause damage",
    }
  }
  if (leq < 85) {
    return {
      category: "Very Loud",
      color: "text-orange-600",
      bg: "bg-orange-100",
      description: "Hearing protection recommended",
    }
  }
  return {
    category: "Dangerous",
    color: "text-red-600",
    bg: "bg-red-100",
    description: "Risk of hearing damage",
  }
}

export interface DataAvailability {
  hasData: boolean
  totalReadings: number
  firstReading: Date | null
  lastReading: Date | null
  lastReadingAge: number | null
  availablePeriods: TimePeriod[]
  dataRange: string
}

export function getDataAvailability(readings: Record<string, ReadingData>): DataAvailability {
  const validReadings = filterValidReadings(readings)

  if (validReadings.length === 0) {
    return {
      hasData: false,
      totalReadings: 0,
      firstReading: null,
      lastReading: null,
      lastReadingAge: null,
      availablePeriods: [],
      dataRange: "No data available",
    }
  }

  const timestamps = validReadings.map((r) => r.timestamp)
  const firstTs = Math.min(...timestamps)
  const lastTs = Math.max(...timestamps)

  const firstReading = new Date(firstTs * 1000)
  const lastReading = new Date(lastTs * 1000)

  const now = Date.now()
  const lastReadingAge = now - lastTs * 1000

  const availablePeriods: TimePeriod[] = []

  for (const period of LEQ_INTERVALS) {
    if (period.value === "alltime") {
      availablePeriods.push("alltime")
      continue
    }
    const periodStart = now - period.durationMs
    const hasDataInPeriod = validReadings.some((r) => r.timestamp * 1000 >= periodStart)
    if (hasDataInPeriod) {
      availablePeriods.push(period.value)
    }
  }

  const dataRange = formatDataRange(firstReading, lastReading)

  return {
    hasData: true,
    totalReadings: validReadings.length,
    firstReading,
    lastReading,
    lastReadingAge,
    availablePeriods,
    dataRange,
  }
}

function formatDataRange(first: Date, last: Date): string {
  const firstStr = first.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const lastStr = last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${firstStr} - ${lastStr}`
}

export function formatLastReadingAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / (1000 * 60))
  const hours = Math.floor(ageMs / (1000 * 60 * 60))
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  }
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  }
  return `${days} day${days !== 1 ? "s" : ""} ago`
}

export function getBestAvailablePeriod(availablePeriods: TimePeriod[]): TimePeriod | null {
  if (availablePeriods.length === 0) return null
  const preferred = [...availablePeriods].reverse().find((p) => p !== "alltime")
  return preferred ?? availablePeriods[availablePeriods.length - 1]
}

export function calculateLeqWithFallback(
  readings: Record<string, ReadingData>,
  requestedPeriod: TimePeriod,
  deviceId: string
): { leq: LeqResult | null; availablePeriod: TimePeriod; isFallback: boolean; message: string } {
  const result = calculateLeqForPeriod(readings, requestedPeriod, deviceId)

  if (result && result.sampleCount > 0) {
    return {
      leq: result,
      availablePeriod: requestedPeriod,
      isFallback: false,
      message: `Leq from ${result.sampleCount.toLocaleString()} samples (energy average: 10·log₁₀(Σ10^(L/10)/N))`,
    }
  }

  const availability = getDataAvailability(readings)

  if (!availability.hasData) {
    return {
      leq: null,
      availablePeriod: requestedPeriod,
      isFallback: true,
      message: "No noise data available for this device",
    }
  }

  const bestPeriod = getBestAvailablePeriod(availability.availablePeriods.filter((p) => p !== "15sec" && p !== "60sec"))

  if (bestPeriod) {
    const fallbackResult = calculateLeqForPeriod(readings, bestPeriod, deviceId)
    const periodLabel = LEQ_INTERVALS.find((p) => p.value === bestPeriod)?.label ?? bestPeriod

    return {
      leq: fallbackResult,
      availablePeriod: bestPeriod,
      isFallback: true,
      message: `No samples in selected window. Showing Leq for ${periodLabel} instead (${fallbackResult?.sampleCount.toLocaleString() ?? 0} readings)`,
    }
  }

  return {
    leq: null,
    availablePeriod: requestedPeriod,
    isFallback: true,
    message: "Unable to calculate Leq for any time period",
  }
}
