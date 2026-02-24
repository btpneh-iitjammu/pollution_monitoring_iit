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
  pm25: number
  temperature: number
}
