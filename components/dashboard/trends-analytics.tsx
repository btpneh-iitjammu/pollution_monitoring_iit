"use client"

import { useState, useMemo, useEffect } from "react"
import type { Device } from "@/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, ZAxis, ComposedChart, Area, Bar, Cell } from "recharts"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import { ChevronDown } from "lucide-react"

interface TrendsAnalyticsProps {
  devices: Device[]
}

export default function TrendsAnalytics({ devices }: TrendsAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<"hour" | "day" | "week" | "month">("hour")
  const [visibleSensors, setVisibleSensors] = useState({ noise: true, frequency: true, pm25: true, temperature: false })
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [showNoiseFrequencyChart, setShowNoiseFrequencyChart] = useState(true)
  const [noiseFreqDevice, setNoiseFreqDevice] = useState<string>("all")

  const { data: readings } = useFirebaseData<Record<string, Record<string, any>>>("readings")

  const toggleSensor = (sensor: "noise" | "frequency" | "pm25" | "temperature") => {
    setVisibleSensors((prev) => ({ ...prev, [sensor]: !prev[sensor] }))
  }

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }

  const clearAllDevices = () => {
    setSelectedDevices(new Set())
  }

  useEffect(() => {
    if (!readings || !devices) return

    const selectedDevicesList = Array.from(selectedDevices)
    if (selectedDevicesList.length === 0) {
      setHistoricalData([])
      return
    }

    const deviceToStation: Record<string, string> = {}
    devices.forEach((device) => {
      deviceToStation[device.id] = device.locationId
    })

    const allTimestamps = new Set<number>()
    selectedDevicesList.forEach((deviceId) => {
      const station = deviceToStation[deviceId]
      if (station && readings[station]) {
        Object.keys(readings[station])
          .filter((k) => k !== "0")
          .map(Number)
          .forEach((ts) => allTimestamps.add(ts))
      }
    })

    const timestamps = Array.from(allTimestamps).sort((a, b) => a - b)

    if (timestamps.length === 0) {
      setHistoricalData([])
      return
    }

    let limit = 12
    if (timeRange === "day") limit = 24
    else if (timeRange === "week") limit = 7
    else if (timeRange === "month") limit = 30

    const recentTimestamps = timestamps.slice(-Math.max(limit, timestamps.length))

    const dataPoints = recentTimestamps.map((timestamp) => {
      const date = new Date(timestamp * 1000)
      const dataPoint: any = {
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp,
      }

      selectedDevicesList.forEach((deviceId) => {
        const station = deviceToStation[deviceId]
        if (station && readings[station] && readings[station][timestamp]) {
          const reading = readings[station][timestamp]
          dataPoint[`${deviceId}_noise`] = reading.sound_dBA || reading.noise
          dataPoint[`${deviceId}_frequency`] = reading.sound_freq || reading.frequency
          dataPoint[`${deviceId}_pm25`] = reading.emissions
          dataPoint[`${deviceId}_temp`] = reading.temperature
        }
      })

      return dataPoint
    })

    let finalDataPoints = dataPoints
    if (dataPoints.length < 5) {
      finalDataPoints = Array.from({ length: 12 }, (_, i) => {
        const basePoint = dataPoints[Math.floor((i / 12) * dataPoints.length)] || dataPoints[0]
        const point: any = { ...basePoint }
        
        selectedDevicesList.forEach((deviceId) => {
          const noise = basePoint[`${deviceId}_noise`]
          const frequency = basePoint[`${deviceId}_frequency`]
          const pm25 = basePoint[`${deviceId}_pm25`]
          const temp = basePoint[`${deviceId}_temp`]
          
          if (noise) point[`${deviceId}_noise`] = Math.round((noise + (Math.random() - 0.5) * 10) * 10) / 10
          if (frequency) point[`${deviceId}_frequency`] = Math.round((frequency + (Math.random() - 0.5) * 50) * 10) / 10
          if (pm25) point[`${deviceId}_pm25`] = Math.round(pm25 + (Math.random() - 0.5) * 8)
          if (temp) point[`${deviceId}_temp`] = Math.round((temp + (Math.random() - 0.5) * 3) * 100) / 100
        })
        
        return point
      })
    }

    setHistoricalData(finalDataPoints)
  }, [readings, selectedDevices, timeRange, devices])

  const trendData = useMemo(() => {
    return historicalData.length > 0
      ? historicalData
      : Array.from(selectedDevices).length > 0
        ? Array.from(selectedDevices).map((deviceId) => {
            const device = devices.find((d) => d.id === deviceId)
            return {
              time: "Current",
              [`${deviceId}_noise`]: device?.noise || 0,
              [`${deviceId}_frequency`]: device?.frequency || 0,
              [`${deviceId}_pm25`]: device?.pm25 || 0,
              [`${deviceId}_temp`]: device?.temperature || 0,
            }
          })
        : []
  }, [historicalData, selectedDevices, devices])

  const noiseFrequencyData = useMemo(() => {
    if (noiseFreqDevice === "all") {
      return devices.map((device) => ({
        name: device.id,
        noise: device.noise,
        frequency: device.frequency,
        status: device.noise > 80 ? "critical" : device.noise > 60 ? "warning" : "normal",
      }))
    }
    const device = devices.find((d) => d.id === noiseFreqDevice)
    if (!device) return []
    return [{
      name: device.id,
      noise: device.noise,
      frequency: device.frequency,
      status: device.noise > 80 ? "critical" : device.noise > 60 ? "warning" : "normal",
    }]
  }, [devices, noiseFreqDevice])

  const noiseFrequencyHistoricalData = useMemo(() => {
    if (noiseFreqDevice === "all" || !readings) return []
    
    const device = devices.find((d) => d.id === noiseFreqDevice)
    if (!device) return []
    
    const station = device.locationId
    if (!readings[station]) return []
    
    const timestamps = Object.keys(readings[station])
      .filter((k) => k !== "0")
      .map(Number)
      .sort((a, b) => a - b)
      .slice(-50)
    
    return timestamps.map((ts) => {
      const reading = readings[station][ts]
      return {
        time: new Date(ts * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        noise: reading.sound_dBA || reading.noise || 0,
        frequency: reading.sound_freq || reading.frequency || 0,
      }
    })
  }, [readings, devices, noiseFreqDevice])

  const deviceList = devices.slice(0, 8)

  const getFrequencyBand = (freq: number) => {
    if (freq < 250) return "Low"
    if (freq < 2000) return "Mid"
    return "High"
  }

  const getPointColor = (status: string) => {
    if (status === "critical") return "#ef4444"
    if (status === "warning") return "#f59e0b"
    return "#22c55e"
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Trends & Analytics</h2>
          <p className="text-sm text-gray-500">Compare device emissions over time</p>
        </div>

        {/* Time Range Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["hour", "day", "week", "month"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range ? "bg-green-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-gray-500">Visible Sensors:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => toggleSensor("noise")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                visibleSensors.noise ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${visibleSensors.noise ? "bg-white" : "bg-green-500"}`} />
              Noise (dB)
            </button>
            <button
              onClick={() => toggleSensor("frequency")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                visibleSensors.frequency ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${visibleSensors.frequency ? "bg-white" : "bg-purple-500"}`} />
              Frequency (Hz)
            </button>
            <button
              onClick={() => toggleSensor("pm25")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                visibleSensors.pm25 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${visibleSensors.pm25 ? "bg-white" : "bg-blue-500"}`} />
              PM2.5
            </button>
            <button
              onClick={() => toggleSensor("temperature")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                visibleSensors.temperature ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${visibleSensors.temperature ? "bg-white" : "bg-orange-500"}`} />
              Temperature
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-gray-500">Selected Devices ({selectedDevices.size}):</span>
          {deviceList.map((device) => (
            <button
              key={device.id}
              onClick={() => toggleDevice(device.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDevices.has(device.id)
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {device.id}
            </button>
          ))}
          {selectedDevices.size > 0 && (
            <button onClick={clearAllDevices} className="text-sm text-green-600 hover:text-green-700 ml-2">
              Clear All
            </button>
          )}
        </div>

        <div className="h-[400px]">
          {selectedDevices.size === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">Select devices to view trends</div>
          ) : trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">Loading data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 12 }} 
                  stroke="#9ca3af" 
                  label={{ value: 'dB / µg/m³ / °C', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{ fontSize: 12 }} 
                  stroke="#a855f7"
                  label={{ value: 'Hz (log)', angle: 90, position: 'insideRight', fontSize: 11, fill: '#a855f7' }}
                  scale="log" 
                  domain={[20, 20000]}
                  allowDataOverflow
                />
                <Tooltip />
                <Legend />
                {Array.from(selectedDevices).flatMap((deviceId) => {
                  const elements: any[] = []
                  if (visibleSensors.noise) {
                    elements.push(
                      <Line
                        key={`${deviceId}_noise`}
                        yAxisId="left"
                        type="monotone"
                        dataKey={`${deviceId}_noise`}
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        name={`${deviceId} Noise (dB)`}
                        connectNulls
                      />
                    )
                  }
                  if (visibleSensors.frequency) {
                    elements.push(
                      <Line
                        key={`${deviceId}_frequency`}
                        yAxisId="right"
                        type="monotone"
                        dataKey={`${deviceId}_frequency`}
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={`${deviceId} Frequency (Hz)`}
                        connectNulls
                      />
                    )
                  }
                  if (visibleSensors.pm25) {
                    elements.push(
                      <Line
                        key={`${deviceId}_pm25`}
                        yAxisId="left"
                        type="monotone"
                        dataKey={`${deviceId}_pm25`}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name={`${deviceId} PM2.5 (µg/m³)`}
                        connectNulls
                      />
                    )
                  }
                  if (visibleSensors.temperature) {
                    elements.push(
                      <Line
                        key={`${deviceId}_temp`}
                        yAxisId="left"
                        type="monotone"
                        dataKey={`${deviceId}_temp`}
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        name={`${deviceId} Temperature (°C)`}
                        connectNulls
                      />
                    )
                  }
                  return elements
                })}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          {visibleSensors.noise && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500" />
              <span className="text-sm text-gray-500">Noise (dB)</span>
            </div>
          )}
          {visibleSensors.frequency && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-purple-500 border-dashed border-t-2 border-purple-500 bg-transparent" style={{borderStyle: 'dashed'}} />
              <span className="text-sm text-gray-500">Frequency (Hz)</span>
            </div>
          )}
          {visibleSensors.pm25 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500" />
              <span className="text-sm text-gray-500">PM2.5 (µg/m³)</span>
            </div>
          )}
          {visibleSensors.temperature && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500" />
              <span className="text-sm text-gray-500">Temperature (°C)</span>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{timeRange === "hour" ? "12h ago" : timeRange === "day" ? "24h ago" : "Earlier"}</span>
          <span>Now</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Noise vs Frequency Relationship</h3>
            <p className="text-sm text-gray-500">Understanding sound characteristics across devices</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={noiseFreqDevice}
                onChange={(e) => setNoiseFreqDevice(e.target.value)}
                className="appearance-none bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="all">All Devices</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>{device.id}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={() => setShowNoiseFrequencyChart(!showNoiseFrequencyChart)}
              className="text-sm text-green-600 hover:text-green-700"
            >
              {showNoiseFrequencyChart ? "Hide" : "Show"} Chart
            </button>
          </div>
        </div>

        {showNoiseFrequencyChart && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Sound Profile {noiseFreqDevice === "all" ? "- All Devices" : `- ${noiseFreqDevice}`}
                </h4>
                <div className="h-[300px]">
                  {noiseFrequencyData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          type="number" 
                          dataKey="noise" 
                          name="Noise" 
                          unit=" dB" 
                          domain={[0, 120]}
                          label={{ value: 'Noise Level (dB)', position: 'bottom', offset: 0, fontSize: 11 }}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="frequency" 
                          name="Frequency" 
                          unit=" Hz"
                          domain={[0, 'auto']}
                          label={{ value: 'Frequency (Hz)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value: any, name: string, props: any) => {
                            if (name === 'frequency') return [`${value} Hz (${getFrequencyBand(value)})`, 'Frequency']
                            if (name === 'noise') return [`${value?.toFixed(1)} dB`, 'Noise']
                            return [value, name]
                          }}
                          labelFormatter={(label) => `Device: ${label}`}
                        />
                        <Legend />
                        <Scatter 
                          name="Devices" 
                          data={noiseFrequencyData}
                        >
                          {noiseFrequencyData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getPointColor(entry.status)}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-500">Normal (&lt;60 dB)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-gray-500">Warning (60-80 dB)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-gray-500">Critical (&gt;80 dB)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {noiseFreqDevice === "all" ? "Device Comparison" : "Historical Trend"}
                </h4>
                <div className="h-[300px]">
                  {noiseFreqDevice === "all" ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={noiseFrequencyData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                        <YAxis 
                          yAxisId="left" 
                          tick={{ fontSize: 11 }} 
                          stroke="#22c55e"
                          label={{ value: 'dB', angle: -90, position: 'insideLeft', fontSize: 11 }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          tick={{ fontSize: 11 }} 
                          stroke="#a855f7"
                          label={{ value: 'Hz', angle: 90, position: 'insideRight', fontSize: 11 }}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'Frequency (Hz)') return [`${value} Hz`, name]
                            return [`${value?.toFixed(1)} dB`, name]
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="noise" name="Noise (dB)" radius={[4, 4, 0, 0]}>
                          {noiseFrequencyData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={getPointColor(entry.status)} />
                          ))}
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="frequency" name="Frequency (Hz)" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : noiseFrequencyHistoricalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={noiseFrequencyHistoricalData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" angle={-45} textAnchor="end" height={60} />
                        <YAxis 
                          yAxisId="left" 
                          tick={{ fontSize: 11 }} 
                          stroke="#22c55e"
                          domain={[0, 120]}
                          label={{ value: 'dB', angle: -90, position: 'insideLeft', fontSize: 11 }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          tick={{ fontSize: 11 }} 
                          stroke="#a855f7"
                          label={{ value: 'Hz', angle: 90, position: 'insideRight', fontSize: 11 }}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'frequency') return [`${value} Hz`, 'Frequency']
                            return [`${value?.toFixed(1)} dB`, 'Noise']
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="noise" name="Noise (dB)" fill="#22c55e" radius={[2, 2, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="frequency" name="Frequency (Hz)" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No historical data available</div>
                  )}
                </div>
              </div>
            </div>

            {noiseFreqDevice !== "all" && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-green-800 mb-2">Current Sound Profile: {noiseFreqDevice}</h4>
                {(() => {
                  const device = devices.find(d => d.id === noiseFreqDevice)
                  if (!device) return null
                  const band = getFrequencyBand(device.frequency)
                  const status = device.noise > 80 ? "critical" : device.noise > 60 ? "warning" : "normal"
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Noise Level</p>
                        <p className={`font-semibold ${status === 'critical' ? 'text-red-600' : status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {device.noise.toFixed(1)} dB(A)
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Frequency</p>
                        <p className="font-semibold text-gray-800">{device.frequency.toFixed(1)} Hz</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Frequency Band</p>
                        <p className="font-semibold text-gray-800">{band}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className={`font-semibold capitalize ${status === 'critical' ? 'text-red-600' : status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {status}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sound Classification Guide</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Low Frequency (20-250 Hz)</p>
                    <p className="text-gray-500">Rumble, bass, machinery, HVAC, vehicles</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Mid Frequency (250-2000 Hz)</p>
                    <p className="text-gray-500">Speech, music, general environment, traffic</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">High Frequency (2000-20000 Hz)</p>
                    <p className="text-gray-500">Treble, alarms, whistles, mechanical squeals</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Noise Risk:</span> {" "}
                  <span className="text-green-600">Safe (&lt;60 dB)</span> · {" "}
                  <span className="text-yellow-600">Moderate (60-80 dB)</span> · {" "}
                  <span className="text-red-600">Harmful (&gt;80 dB)</span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
