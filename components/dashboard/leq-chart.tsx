"use client"

import { useState, useMemo, useEffect } from "react"
import type { Device, TimePeriod, LeqResult } from "@/types"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import { 
  TIME_PERIODS, 
  calculateLeqForPeriod, 
  calculateLeqWithFallback,
  getLeqCategory,
  getDataAvailability,
  formatLastReadingAge,
  type DataAvailability
} from "@/lib/leq"
import {
  Volume2,
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
} from "lucide-react"
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  ReferenceLine
} from "recharts"

interface LeqChartProps {
  devices: Device[]
}

/** Analytics view: no station/period dropdowns — focus on highest current-noise station, fixed 24 h window. */
export default function LeqChart({ devices }: LeqChartProps) {
  const selectedPeriod: TimePeriod = "24hr"
  const selectedDevice = useMemo(() => {
    if (devices.length === 0) return ""
    return [...devices].reduce((a, b) => (b.noise > a.noise ? b : a)).id
  }, [devices])

  const [showLeqChart, setShowLeqChart] = useState(true)
  const [allLeqResults, setAllLeqResults] = useState<LeqResult[]>([])
  const [dataAvailability, setDataAvailability] = useState<DataAvailability | null>(null)
  const [deviceReadings, setDeviceReadings] = useState<Record<string, any> | null>(null)

  const { data: readings } = useFirebaseData<Record<string, Record<string, any>>>("readings")

  useEffect(() => {
    if (!readings) {
      setDeviceReadings(null)
      return
    }
    setDeviceReadings(readings)
  }, [readings])

  const currentDevice = useMemo(() => {
    return devices.find(d => d.id === selectedDevice)
  }, [devices, selectedDevice])

  const currentStationReadings = useMemo(() => {
    if (!deviceReadings || !currentDevice) return null
    return deviceReadings[currentDevice.locationId] || null
  }, [deviceReadings, currentDevice])

  useEffect(() => {
    if (!currentStationReadings) {
      setDataAvailability(null)
      return
    }

    const availability = getDataAvailability(currentStationReadings)
    setDataAvailability(availability)
  }, [currentStationReadings])

  const leqResult = useMemo(() => {
    if (!currentStationReadings || !selectedDevice) return null
    
    const result = calculateLeqWithFallback(currentStationReadings, selectedPeriod, selectedDevice)
    return result
  }, [currentStationReadings, selectedDevice, selectedPeriod])

  useEffect(() => {
    if (!currentStationReadings || !selectedDevice) {
      setAllLeqResults([])
      return
    }

    const results: LeqResult[] = []
    
    for (const period of TIME_PERIODS) {
      const result = calculateLeqForPeriod(currentStationReadings, period.value, selectedDevice)
      if (result && result.sampleCount > 0) {
        results.push(result)
      }
    }

    setAllLeqResults(results)
  }, [currentStationReadings, selectedDevice])

  const category = leqResult?.leq ? getLeqCategory(leqResult.leq.leq) : null

  const chartData = useMemo(() => {
    return allLeqResults.map((result) => ({
      name: TIME_PERIODS.find(p => p.value === result.timePeriod)?.label ?? result.timePeriod,
      value: result.leq,
      samples: result.sampleCount,
      category: getLeqCategory(result.leq).category,
    }))
  }, [allLeqResults])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Leq — Equivalent Continuous Sound Level</h3>
          <p className="text-sm text-gray-500">
            Noise exposure averaged over time · Highest-noise station now · 24 h window (WHO / CPCB thresholds)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLeqChart(!showLeqChart)}
          className="text-sm text-green-600 hover:text-green-700"
        >
          {showLeqChart ? "Hide" : "Show"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {leqResult && leqResult.leq && (
          <>
            <div className="md:col-span-2">
              <div className={`h-full rounded-xl p-4 border ${category?.bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {leqResult.isFallback ? "Historical Leq" : "Leq Value"}
                    </p>
                    <p className={`text-3xl font-bold ${category?.color}`}>
                      {leqResult.leq.leq.toFixed(1)} <span className="text-lg font-normal">dB(A)</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category?.bg} ${category?.color}`}
                    >
                      {category?.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{category?.description}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedDevice && dataAvailability && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Total: <span className="font-medium">{dataAvailability.totalReadings.toLocaleString()}</span> readings
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Last reading:{" "}
                <span className="font-medium">
                  {dataAvailability.lastReading ? formatLastReadingAge(dataAvailability.lastReadingAge!) : "N/A"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {dataAvailability.lastReadingAge !== null && dataAvailability.lastReadingAge < 24 * 60 * 60 * 1000 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">Data is fresh</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Data may be outdated</span>
                </>
              )}
            </div>
            <div className="text-gray-500">
              Range: <span className="font-medium">{dataAvailability.dataRange}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            <span className="text-gray-500">Available periods:</span>
            {TIME_PERIODS.map((period) => {
              const hasData = dataAvailability.availablePeriods.includes(period.value)
              return (
                <span
                  key={period.value}
                  className={`px-2 py-0.5 rounded text-xs ${
                    hasData ? "bg-green-100 text-green-700 font-medium" : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {hasData ? "✓" : "✗"} {period.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {leqResult && leqResult.isFallback && leqResult.leq && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Showing Historical Data</p>
              <p className="text-xs text-yellow-700 mt-1">{leqResult.message}</p>
            </div>
          </div>
        </div>
      )}

      {leqResult && leqResult.leq && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs">Min</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{leqResult.leq.min.toFixed(1)} dB</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Average</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{leqResult.leq.avg.toFixed(1)} dB</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Max</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{leqResult.leq.max.toFixed(1)} dB</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Gauge className="w-4 h-4" />
              <span className="text-xs">Samples</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{leqResult.leq.sampleCount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {showLeqChart && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Leq comparison across time periods {selectedDevice && `· ${selectedDevice}`}
          </h4>
          <div className="h-[300px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                {selectedDevice ? "No valid noise data available for this device" : "No device selected"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    domain={[0, 100]}
                    label={{ value: "dB(A)", angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === "value") {
                        return [`${Number(value).toFixed(1)} dB(A)`, "Leq"]
                      }
                      return [value, name]
                    }}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Leq (dB)" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value < 50
                            ? "#22c55e"
                            : entry.value < 60
                              ? "#22c55e"
                              : entry.value < 70
                                ? "#eab308"
                                : entry.value < 80
                                  ? "#f97316"
                                  : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                  <ReferenceLine
                    y={70}
                    stroke="#eab308"
                    strokeDasharray="3 3"
                    label={{ value: "Warning", fontSize: 10, fill: "#eab308" }}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: "Danger", fontSize: 10, fill: "#ef4444" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Leq Reference Guide</h5>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-600">&lt;50-60 dB: Quiet/Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-400" />
                <span className="text-gray-600">60-70 dB: Elevated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-gray-600">70-80 dB: Loud</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-gray-600">&gt;80 dB: Dangerous</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedDevice && (
        <div className="text-center py-8 text-gray-400">
          <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Add stations to calculate Leq</p>
        </div>
      )}

      {selectedDevice && !leqResult && (
        <div className="text-center py-8 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No valid noise data available for this device</p>
          <p className="text-sm mt-2">The device may not have sound sensors or data yet</p>
        </div>
      )}
    </div>
  )
}
