"use client"

import type { Device, Alert } from "@/types"
import { AlertTriangle, Volume2, Waves, Wind, Thermometer } from "lucide-react"
import { getDeviceStatus } from "@/lib/utils"

interface SummaryInsightsProps {
  devices: Device[]
  alerts: Alert[]
}

export default function SummaryInsights({ devices, alerts }: SummaryInsightsProps) {
  if (!devices || devices.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary Insights</h2>
          <p className="text-sm text-gray-500">Key metrics and device performance highlights</p>
        </div>
        <div className="text-center text-gray-500 py-8">No devices available</div>
      </div>
    )
  }

  const criticalDevices = devices.filter((d) => getDeviceStatus(d) === "critical")
  const mostCriticalDevice = criticalDevices.sort((a, b) => {
    const aAlerts = alerts.filter((alert) => alert.deviceId === a.id).length
    const bAlerts = alerts.filter((alert) => alert.deviceId === b.id).length
    return bAlerts - aAlerts
  })[0]

  const highestNoiseDevice = [...devices].sort((a, b) => b.noise - a.noise)[0]

  const highestPM25Device = [...devices].sort((a, b) => b.pm25 - a.pm25)[0]

  const heatStressDevices = devices.filter((d) => d.temperature > 35)

  const getFrequencyBand = (freq: number) => {
    if (freq < 250) return { band: "Low", color: "text-blue-600", bg: "bg-blue-100" }
    if (freq < 2000) return { band: "Mid", color: "text-green-600", bg: "bg-green-100" }
    return { band: "High", color: "text-red-600", bg: "bg-red-100" }
  }

  const getFrequencyBandCounts = () => {
    const low = devices.filter((d) => d.frequency < 250).length
    const mid = devices.filter((d) => d.frequency >= 250 && d.frequency < 2000).length
    const high = devices.filter((d) => d.frequency >= 2000).length
    return { low, mid, high }
  }

  const getDominantFrequencyBand = () => {
    const counts = getFrequencyBandCounts()
    if (counts.low >= counts.mid && counts.low >= counts.high) return { band: "Low", count: counts.low, description: "Machinery, HVAC, traffic" }
    if (counts.mid >= counts.low && counts.mid >= counts.high) return { band: "Mid", count: counts.mid, description: "Speech, general environment" }
    return { band: "High", count: counts.high, description: "Alarms, mechanical sounds" }
  }

  const getAverageNoiseLevel = () => {
    const avg = devices.reduce((sum, d) => sum + d.noise, 0) / devices.length
    return avg
  }

  const dominantBand = getDominantFrequencyBand()
  const avgNoise = getAverageNoiseLevel()
  const freqCounts = getFrequencyBandCounts()

  const insights = [
    {
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      title: "Most Critical Device",
      deviceId: mostCriticalDevice?.id || "N/A",
      location: mostCriticalDevice?.location || "N/A",
      value: mostCriticalDevice
        ? `${alerts.filter((a) => a.deviceId === mostCriticalDevice.id).length} active alerts`
        : "No critical devices",
      valueColor: "text-red-600",
      status: "critical",
    },
    {
      icon: Volume2,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
      title: "Highest Noise Level",
      deviceId: highestNoiseDevice?.id || "N/A",
      location: highestNoiseDevice?.location || "N/A",
      value: highestNoiseDevice ? `${highestNoiseDevice.noise.toFixed(1)} dB(A)` : "N/A",
      valueColor: "text-gray-900",
      status: getDeviceStatus(highestNoiseDevice),
    },
    {
      icon: Waves,
      iconBg: getFrequencyBand(highestNoiseDevice?.frequency || 1000).bg,
      iconColor: getFrequencyBand(highestNoiseDevice?.frequency || 1000).color,
      title: "Dominant Frequency",
      deviceId: `${dominantBand.band} Frequency`,
      location: `${dominantBand.count} devices`,
      value: dominantBand.description,
      valueColor: "text-gray-700",
      status: "normal",
      extra: (
        <div className="flex items-center gap-1 mt-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-blue-400" style={{ width: `${(freqCounts.low / devices.length) * 100}%` }} />
            <div className="bg-green-400" style={{ width: `${(freqCounts.mid / devices.length) * 100}%` }} />
            <div className="bg-red-400" style={{ width: `${(freqCounts.high / devices.length) * 100}%` }} />
          </div>
        </div>
      ),
    },
    {
      icon: Wind,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
      title: "Highest PM2.5 Exposure",
      deviceId: highestPM25Device?.id || "N/A",
      location: highestPM25Device?.location || "N/A",
      value: highestPM25Device ? `${highestPM25Device.pm25} µg/m³` : "N/A",
      valueColor: "text-gray-900",
      status: getDeviceStatus(highestPM25Device),
    },
    {
      icon: Thermometer,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      title: "Heat Stress Devices",
      deviceId: "",
      location: "",
      value: `${heatStressDevices.length} devices above 35°C`,
      valueColor: "text-red-600",
      status: heatStressDevices.length > 0 ? "critical" : "normal",
    },
    {
      icon: Volume2,
      iconBg: avgNoise > 70 ? "bg-yellow-100" : "bg-green-100",
      iconColor: avgNoise > 70 ? "text-yellow-600" : "text-green-600",
      title: "Average Noise Level",
      deviceId: "",
      location: "",
      value: `${avgNoise.toFixed(1)} dB(A)`,
      valueColor: avgNoise > 70 ? "text-yellow-600" : "text-green-600",
      status: avgNoise > 85 ? "critical" : avgNoise > 70 ? "warning" : "normal",
      extra: (
        <p className="text-xs text-gray-500 mt-1">
          {avgNoise < 50 ? "Quiet environment" : avgNoise < 70 ? "Moderate noise" : avgNoise < 85 ? "Elevated noise levels" : "High noise - hearing protection advised"}
        </p>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Summary Insights</h2>
        <p className="text-sm text-gray-500">Key metrics and device performance highlights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          const statusDot =
            insight.status === "critical"
              ? "bg-red-500"
              : insight.status === "warning"
                ? "bg-yellow-500"
                : "bg-green-500"

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className={`w-10 h-10 rounded-lg ${insight.iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${insight.iconColor}`} />
              </div>

              <p className="text-sm text-gray-500 mb-1">{insight.title}</p>

              {insight.deviceId && (
                <>
                  <p className="font-semibold text-gray-900">{insight.deviceId}</p>
                  <p className="text-xs text-gray-400 mb-2">{insight.location}</p>
                </>
              )}

              <p className={`text-2xl font-bold ${insight.valueColor}`}>{insight.value}</p>

              {insight.extra}

              {insight.deviceId && !insight.extra && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                  <span className="text-xs text-gray-500 capitalize">{insight.status}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sound Classification Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Waves className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Low Freq</p>
              <p className="text-xs text-gray-500">{freqCounts.low} devices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Waves className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Mid Freq</p>
              <p className="text-xs text-gray-500">{freqCounts.mid} devices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Waves className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">High Freq</p>
              <p className="text-xs text-gray-500">{freqCounts.high} devices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Avg Level</p>
              <p className="text-xs text-gray-500">{avgNoise.toFixed(1)} dB(A)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
