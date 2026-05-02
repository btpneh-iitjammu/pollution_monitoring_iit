export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface Device {
  id: string
  locationId: string
  location: string
  latitude: number
  longitude: number
  noise: number
  frequency: number
  pm25: number
  temperature: number
  lastUpdate: Date
  battery: number
  signal: "Weak" | "Moderate" | "Strong"
  installDate: string
  firmware: string
}

export interface Alert {
  id: string
  deviceId: string
  severity: "warning" | "critical"
  sensor: "noise" | "pm25" | "temperature"
  timestamp: Date
  message: string
  acknowledged?: boolean
}

export type DeviceStatus = "normal" | "warning" | "critical"

export interface TrendDataPoint {
  time: string
  noise: number
  frequency: number
  pm25: number
  temperature: number
}

/** Averaging windows for LAeq-style calculators (see lib/leq.ts). */
export type TimePeriod =
  | "15sec"
  | "60sec"
  | "15min"
  | "1hr"
  | "24hr"
  | "15days"
  | "1month"
  | "3months"
  | "6months"
  | "1year"
  | "alltime"

export interface TimePeriodOption {
  value: TimePeriod
  label: string
  durationMs: number
  description: string
}

export interface LeqResult {
  leq: number
  min: number
  max: number
  avg: number
  sampleCount: number
  timePeriod: TimePeriod
  calculatedAt: Date
  deviceId: string
}

export interface ReadingData {
  timestamp: number
  sound_dBA?: number
  sound_freq?: number
  noise?: number
  emissions?: number
  temperature?: number
  datetime?: string
}
