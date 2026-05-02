"use client"

import { useMemo, type ComponentType } from "react"
import { Volume2, Waves, Wind, Thermometer, Download, Settings } from "lucide-react"
import type { Device } from "@/types"
import { getDeviceStatus } from "@/lib/utils"
import { LineChart, Line, ResponsiveContainer } from "recharts"

interface DeviceDetailContentProps {
  device: Device
}

export default function DeviceDetailContent({ device }: DeviceDetailContentProps) {
  const status = getDeviceStatus(device)

  const getStatusBadge = () => {
    switch (status) {
      case "normal":
        return { bg: "bg-green-50", text: "text-green-700", label: "Normal" }
      case "warning":
        return { bg: "bg-yellow-50", text: "text-yellow-700", label: "Warning" }
      case "critical":
        return { bg: "bg-red-50", text: "text-red-700", label: "Critical" }
    }
  }

  const badge = getStatusBadge()

  const getFrequencyBand = (freq: number) => {
    if (freq < 250)
      return {
        band: "Low Frequency",
        range: "20-250 Hz",
        color: "text-blue-600",
        bg: "bg-blue-100",
        description: "Rumble, bass, machinery, HVAC systems",
        sources: "Vehicles, industrial equipment, thunder",
      }
    if (freq < 2000)
      return {
        band: "Mid Frequency",
        range: "250-2000 Hz",
        color: "text-green-600",
        bg: "bg-green-100",
        description: "Speech, music, general environment",
        sources: "Human voice, traffic noise, office sounds",
      }
    return {
      band: "High Frequency",
      range: "2000-20000 Hz",
      color: "text-red-600",
      bg: "bg-red-100",
      description: "Treble, sharp sounds, alarms",
      sources: "Alarms, whistles, mechanical squeals, birds",
    }
  }

  const getNoiseCategory = (dB: number) => {
    if (dB < 40) return { category: "Very Quiet", example: "Library, whisper", risk: "None" }
    if (dB < 60) return { category: "Moderate", example: "Normal conversation", risk: "None" }
    if (dB < 80) return { category: "Loud", example: "Busy traffic, vacuum cleaner", risk: "Low" }
    if (dB < 100) return { category: "Very Loud", example: "Motorcycle, lawn mower", risk: "Medium" }
    return { category: "Dangerous", example: "Chainsaw, rock concert", risk: "High" }
  }

  const getSoundProfile = (dB: number, freq: number) => {
    const band = getFrequencyBand(freq)
    const noise = getNoiseCategory(dB)

    let interpretation = ""
    if (dB < 50 && freq < 250) {
      interpretation = "Low ambient hum - likely HVAC or distant traffic"
    } else if (dB < 50 && freq >= 250 && freq < 2000) {
      interpretation = "Quiet environment with mid-frequency background noise"
    } else if (dB < 50 && freq >= 2000) {
      interpretation = "Faint high-frequency sound - possibly electronic equipment"
    } else if (dB >= 50 && dB < 80 && freq < 250) {
      interpretation = "Moderate low-frequency noise - typical urban environment"
    } else if (dB >= 50 && dB < 80 && freq >= 250 && freq < 2000) {
      interpretation = "Normal activity noise - speech or general environment"
    } else if (dB >= 50 && dB < 80 && freq >= 2000) {
      interpretation = "Noticeable high-frequency - check for alarms or machinery"
    } else if (dB >= 80 && freq < 250) {
      interpretation = "Loud low-frequency source - heavy machinery or vehicles"
    } else if (dB >= 80 && freq >= 250 && freq < 2000) {
      interpretation = "Loud mid-frequency - possible industrial activity"
    } else {
      interpretation = "Loud high-frequency alert - potential hazard, investigate"
    }

    return { interpretation, band, noise }
  }

  const getFrequencyPosition = (freq: number) => {
    const minFreq = 20
    const maxFreq = 20000
    const logMin = Math.log10(minFreq)
    const logMax = Math.log10(maxFreq)
    const logFreq = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)))
    return ((logFreq - logMin) / (logMax - logMin)) * 100
  }

  const timelineData = useMemo(
    () => [
      {
        time: 0,
        noise: device.noise,
        frequency: device.frequency,
        pm25: device.pm25,
        temp: device.temperature,
      },
    ],
    [device.noise, device.frequency, device.pm25, device.temperature],
  )

  const SensorGauge = ({
    icon: Icon,
    label,
    unit,
    value,
    warningThreshold,
    dangerThreshold,
    max,
  }: {
    icon: ComponentType<{ className?: string }>
    label: string
    unit: string
    value: number
    warningThreshold: number
    dangerThreshold: number
    max: number
  }) => {
    const percentage = (value / max) * 100

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-900">{label}</span>
              <span className="text-xs text-gray-400 ml-1">{unit}</span>
            </div>
          </div>
          <span className="text-2xl font-semibold text-gray-900">{value}</span>
        </div>

        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`absolute h-full rounded-full transition-all ${
              value >= dangerThreshold ? "bg-red-500" : value >= warningThreshold ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0</span>
          <span className="text-yellow-600">Warning: {warningThreshold}</span>
          <span className="text-red-600">Danger: {dangerThreshold}</span>
          <span>{max}</span>
        </div>
      </div>
    )
  }

  const FrequencyGauge = ({ frequency }: { frequency: number }) => {
    const freqBand = getFrequencyBand(frequency)
    const position = getFrequencyPosition(frequency)

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-900">Frequency</span>
              <span className="text-xs text-gray-400 ml-1">Hz</span>
            </div>
          </div>
          <span className="text-2xl font-semibold text-gray-900">{frequency.toFixed(1)}</span>
        </div>

        <div className="relative h-2 rounded-full overflow-hidden flex">
          <div className="flex-1 bg-blue-300" />
          <div className="flex-1 bg-green-300" />
          <div className="flex-1 bg-red-300" />
          <div
            className={`absolute top-0 bottom-0 w-1.5 ${freqBand.bg} rounded-full shadow-sm`}
            style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          />
        </div>

        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>20 Hz</span>
          <span className={freqBand.color}>{freqBand.band}</span>
          <span>20 kHz</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{freqBand.description}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Device Status</h3>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Battery Level</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div className="h-full bg-gray-600 rounded-full" style={{ width: `${device.battery}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900">{device.battery}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Signal Strength</p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-900">{device.signal}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Device Metadata</h3>
          <div className="space-y-3 bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Installation Date</span>
              <span className="text-sm font-medium text-gray-900">{device.installDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Firmware Version</span>
              <span className="text-sm font-medium text-gray-900">{device.firmware}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Calibration Status</span>
              <span className="text-sm font-medium text-green-600">Calibrated</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Last Maintenance</span>
              <span className="text-sm font-medium text-gray-900">3 days ago</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Sound Profile</h3>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">{device.noise.toFixed(1)} dB(A)</span>
              </div>
              <div className="flex items-center gap-2">
                <Waves className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">{device.frequency.toFixed(1)} Hz</span>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Frequency Band</p>
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-300 rounded-l-full" />
                <div className="absolute inset-y-0 left-1/3 w-1/3 bg-green-300" />
                <div className="absolute inset-y-0 right-0 w-1/3 bg-red-300 rounded-r-full" />
                <div
                  className={`absolute top-0 bottom-0 w-2 ${getFrequencyBand(device.frequency).bg} rounded-full shadow-md border-2 border-white`}
                  style={{ left: `${getFrequencyPosition(device.frequency)}%`, transform: "translateX(-50%)" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>20 Hz</span>
                <span>250 Hz</span>
                <span>2 kHz</span>
                <span>20 kHz</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getFrequencyBand(device.frequency).bg} ${getFrequencyBand(device.frequency).color}`}
                >
                  {getFrequencyBand(device.frequency).band}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    getNoiseCategory(device.noise).risk === "High"
                      ? "bg-red-100 text-red-700"
                      : getNoiseCategory(device.noise).risk === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {getNoiseCategory(device.noise).category}
                </span>
              </div>
              <p className="text-xs text-gray-600">{getSoundProfile(device.noise, device.frequency).interpretation}</p>
              <p className="text-[10px] text-gray-400">Typical sources: {getFrequencyBand(device.frequency).sources}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Live Sensor Readings</h3>

          <SensorGauge
            icon={Volume2}
            label="Noise Level"
            unit="dB(A)"
            value={device.noise}
            warningThreshold={80}
            dangerThreshold={90}
            max={140}
          />

          <FrequencyGauge frequency={device.frequency} />

          <SensorGauge
            icon={Wind}
            label="PM2.5 Concentration"
            unit="µg/m³"
            value={device.pm25}
            warningThreshold={50}
            dangerThreshold={100}
            max={200}
          />

          <SensorGauge
            icon={Thermometer}
            label="Temperature"
            unit="°C"
            value={device.temperature}
            warningThreshold={30}
            dangerThreshold={35}
            max={50}
          />
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Last 60 Minutes Timeline</h3>
          <div className="bg-gray-50 rounded-lg p-3 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <Line type="monotone" dataKey="noise" stroke="#22c55e" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>60 min ago</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configure
        </button>
      </div>
    </>
  )
}
