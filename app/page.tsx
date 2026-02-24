"use client"

import { useState, useEffect } from "react"
import Dashboard from "@/components/dashboard"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import type { Device, Location, Alert } from "@/types"

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "warning" | "critical">("all")
  const [activeView, setActiveView] = useState<"map" | "trends" | "insights">("map")
  const [devices, setDevices] = useState<Device[]>([])

  // Fetch both readings and station info from Firebase
  const { data: readings } = useFirebaseData<Record<string, Record<string, any>>>("readings")
  const { data: stations } = useFirebaseData<Record<string, { info: any }>>("stations")

  // Validate sensor readings to filter out corrupted data
  const validateReading = (reading: any) => {
    const validated = { ...reading }
    
    // Sound level (dB): should be 20-140 dB
    if (!validated.sound_dBA || validated.sound_dBA < 20 || validated.sound_dBA > 140) {
      validated.sound_dBA = 50
    }
    
    // Frequency (Hz): typical audio range 20-20000 Hz
    if (!validated.sound_freq || validated.sound_freq < 20 || validated.sound_freq > 20000) {
      validated.sound_freq = 1000
    }
    
    // Emissions/PM2.5: should be 0-500 µg/m³
    if (!validated.emissions || validated.emissions < 0 || validated.emissions > 500) {
      validated.emissions = 40
    }
    
    // Temperature: should be -10 to 60°C
    if (!validated.temperature || validated.temperature < -10 || validated.temperature > 60) {
      validated.temperature = 25
    }
    
    return validated
  }

  useEffect(() => {
    if (readings && stations) {
      // Convert Firebase readings + stations to device format
      const deviceArray: Device[] = []
      
      Object.entries(readings).forEach(([stationId, stationData]) => {
        // Get station info
        const stationInfo = stations[stationId]?.info
        if (!stationInfo) return
        
        // Get the latest valid data point for this station
        const timestamps = Object.keys(stationData)
          .filter((k) => k !== "0") // Skip dummy zero entry
          .map(Number)
          .sort((a, b) => b - a)
        
        let latestReading = null
        let latestTimestamp = 0
        
        // Find the latest valid reading
        for (const timestamp of timestamps) {
          const reading = stationData[timestamp]
          const validated = validateReading(reading)
          
          if (validated.sound_dBA && validated.emissions && validated.temperature) {
            latestReading = validated
            latestTimestamp = timestamp
            break
          }
        }
        
        if (latestReading && latestTimestamp > 0) {
          const device: Device = {
            id: stationInfo.deviceId || stationId.toUpperCase(),
            locationId: stationId,
            location: `${stationInfo.name} - ${stationInfo.area}`,
            latitude: stationInfo.latitude,
            longitude: stationInfo.longitude,
            noise: latestReading.sound_dBA,
            frequency: latestReading.sound_freq,
            pm25: latestReading.emissions,
            temperature: latestReading.temperature,
            lastUpdate: new Date(latestTimestamp * 1000),
            battery: 85,
            signal: "Strong" as const,
            installDate: "Jan 15, 2024",
            firmware: "v2.4.1",
          }
          deviceArray.push(device)
        }
      })
      
      setDevices(deviceArray)
    }
  }, [readings, stations])

  return (
    <Dashboard
      devices={devices}
      locations={devices.map((device, idx) => ({
        id: device.locationId,
        name: device.location,
        latitude: device.latitude,
        longitude: device.longitude,
      }))}
      alerts={[]}
      selectedDevice={selectedDevice}
      onSelectDevice={setSelectedDevice}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      activeView={activeView}
      onViewChange={setActiveView}
    />
  )
}
