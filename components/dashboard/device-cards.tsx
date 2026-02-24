"use client"

import type { Device } from "@/types"
import { Volume2, Waves, Wind, Thermometer, ArrowDown, ArrowUp, Minus } from "lucide-react"
import { getDeviceStatus } from "@/lib/utils"

interface DeviceCardsProps {
  devices: Device[]
  onSelectDevice: (id: string) => void
}

export default function DeviceCards({ devices, onSelectDevice }: DeviceCardsProps) {
  const getStatusBadge = (status: "normal" | "warning" | "critical") => {
    switch (status) {
      case "normal":
        return { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Normal" }
      case "warning":
        return { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500", label: "Warning" }
      case "critical":
        return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Critical" }
    }
  }

  const getValueColor = (status: "normal" | "warning" | "critical") => {
    switch (status) {
      case "normal":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "critical":
        return "text-red-600"
    }
  }

  const getSensorStatus = (device: Device, sensor: "noise" | "pm25" | "temperature") => {
    switch (sensor) {
      case "noise":
        if (device.noise > 90) return "critical"
        if (device.noise > 80) return "warning"
        return "normal"
      case "pm25":
        if (device.pm25 > 70) return "critical"
        if (device.pm25 > 50) return "warning"
        return "normal"
      case "temperature":
        if (device.temperature > 35) return "critical"
        if (device.temperature > 30) return "warning"
        return "normal"
    }
  }

  const getFrequencyBand = (freq: number) => {
    if (freq < 250) return { band: "Low", range: "20-250 Hz", color: "bg-blue-500", description: "Rumble/Bass" }
    if (freq < 2000) return { band: "Mid", range: "250-2kHz", color: "bg-green-500", description: "Speech/Music" }
    return { band: "High", range: "2k-20kHz", color: "bg-red-500", description: "Treble/Sharp" }
  }

  const getFrequencyPosition = (freq: number) => {
    const minFreq = 20
    const maxFreq = 20000
    const logMin = Math.log10(minFreq)
    const logMax = Math.log10(maxFreq)
    const logFreq = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)))
    return ((logFreq - logMin) / (logMax - logMin)) * 100
  }

  const formatLastUpdate = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 5) return "Just now"
    if (seconds < 60) return `${seconds} sec ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes} min ago`
  }

  // Always show stable trend since we only have current readings
  const TrendIcon = () => <Minus className="w-3 h-3" />

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Device Overview</h2>
        <p className="text-sm text-gray-500">
          Real-time status of all monitored devices · Click card for detailed view
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices && devices.length > 0 ? devices.map((device) => {
          const status = getDeviceStatus(device)
          const badge = getStatusBadge(status)
          const noiseStatus = getSensorStatus(device, "noise")
          const pm25Status = getSensorStatus(device, "pm25")
          const tempStatus = getSensorStatus(device, "temperature")

          return (
            <button
              key={device.id}
              onClick={() => onSelectDevice(device.id)}
              className={`bg-white border rounded-xl p-4 text-left transition-all hover:shadow-md ${
                status === "critical"
                  ? "border-red-200 bg-red-50/30"
                  : status === "warning"
                    ? "border-yellow-200 bg-yellow-50/30"
                    : "border-gray-200"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{device.id}</h3>
                  <p className="text-xs text-gray-500">{device.location}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    📍 {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </div>

              {/* Sensor Readings */}
              <div className="space-y-2 mb-3">
                {/* Noise Level */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm">Noise:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${getValueColor(noiseStatus)}`}>{device.noise.toFixed(1)} dB(A)</span>
                    <span className={getValueColor(noiseStatus)}>
                       <TrendIcon />
                     </span>
                    </div>
                    </div>

                    {/* Frequency */}
                    <div>
                     <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-gray-500">
                      <Waves className="w-4 h-4" />
                      <span className="text-sm">Frequency:</span>
                     </div>
                     <span className="text-sm font-medium text-gray-700">{device.frequency.toFixed(1)} Hz</span>
                    </div>
                    <div className="mt-1.5 ml-6">
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-200 rounded-l-full" />
                        <div className="absolute inset-y-0 left-1/3 w-1/3 bg-green-200" />
                        <div className="absolute inset-y-0 right-0 w-1/3 bg-red-200 rounded-r-full" />
                        <div 
                          className={`absolute top-0 bottom-0 w-1 ${getFrequencyBand(device.frequency).color} rounded-full shadow-sm`}
                          style={{ left: `${getFrequencyPosition(device.frequency)}%`, transform: 'translateX(-50%)' }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>Low</span>
                        <span className={`font-medium ${getFrequencyBand(device.frequency).color.replace('bg-', 'text-')}`}>
                          {getFrequencyBand(device.frequency).band}
                        </span>
                        <span>High</span>
                      </div>
                    </div>
                    </div>

                    {/* PM2.5 */}
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                     <Wind className="w-4 h-4" />
                     <span className="text-sm">PM2.5:</span>
                    </div>
                    <div className="flex items-center gap-1">
                     <span className={`text-sm font-medium ${getValueColor(pm25Status)}`}>{device.pm25} µg/m³</span>
                     <span className={getValueColor(pm25Status)}>
                       <TrendIcon />
                     </span>
                    </div>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                     <Thermometer className="w-4 h-4" />
                     <span className="text-sm">Temperature:</span>
                    </div>
                    <div className="flex items-center gap-1">
                     <span className={`text-sm font-medium ${getValueColor(tempStatus)}`}>{device.temperature} °C</span>
                     <span className={getValueColor(tempStatus)}>
                       <TrendIcon />
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{formatLastUpdate(device.lastUpdate)}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-2.5 border border-gray-300 rounded-sm relative">
                      <div
                        className="absolute inset-0.5 bg-gray-600 rounded-sm"
                        style={{ width: `${Math.min(device.battery, 100) * 0.85}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{device.battery}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-500">{device.signal}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        }) : (
          <div className="col-span-full text-center text-gray-500 py-8">
            No devices available. Loading data...
          </div>
        )}
      </div>
    </div>
  )
}
