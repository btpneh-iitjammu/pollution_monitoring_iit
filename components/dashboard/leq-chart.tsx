"use client"

import { useState, useMemo, useEffect } from "react"
import type { Device, TimePeriod, LeqResult } from "@/types"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import {
  LEQ_INTERVALS,
  calculateLeqForPeriod,
  getLeqCategory,
  getDataAvailability,
  formatLastReadingAge,
  getReadingsForPeriod,
  type DataAvailability,
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
  ReferenceLine,
} from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LeqChartProps {
  devices: Device[]
}

export default function LeqChart({ devices }: LeqChartProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("24hr")
  const [showLeqChart, setShowLeqChart] = useState(true)
  const [allLeqResults, setAllLeqResults] = useState<LeqResult[]>([])
  const [dataAvailability, setDataAvailability] = useState<DataAvailability | null>(null)
  const [deviceReadings, setDeviceReadings] = useState<Record<string, any> | null>(null)

  const { data: readings } = useFirebaseData<Record<string, Record<string, any>>>("readings")

  useEffect(() => {
    if (devices.length === 0) {
      setSelectedDeviceId("")
      return
    }
    setSelectedDeviceId((prev) => {
      if (prev && devices.some((d) => d.id === prev)) return prev
      return [...devices].reduce((a, b) => (b.noise > a.noise ? b : a)).id
    })
  }, [devices])

  useEffect(() => {
    if (!readings) {
      setDeviceReadings(null)
      return
    }
    setDeviceReadings(readings)
  }, [readings])

  const currentDevice = useMemo(() => {
    return devices.find((d) => d.id === selectedDeviceId)
  }, [devices, selectedDeviceId])

  const currentStationReadings = useMemo(() => {
    if (!deviceReadings || !currentDevice) return null
    return deviceReadings[currentDevice.locationId] || null
  }, [deviceReadings, currentDevice])

  useEffect(() => {
    if (!currentStationReadings) {
      setDataAvailability(null)
      return
    }
    setDataAvailability(getDataAvailability(currentStationReadings))
  }, [currentStationReadings])

  const strictResult = useMemo(() => {
    if (!currentStationReadings || !selectedDeviceId) return null
    return calculateLeqForPeriod(currentStationReadings, selectedPeriod, selectedDeviceId)
  }, [currentStationReadings, selectedDeviceId, selectedPeriod])

  const periodSampleCount = useMemo(() => {
    if (!currentStationReadings) return 0
    return getReadingsForPeriod(currentStationReadings, selectedPeriod).length
  }, [currentStationReadings, selectedPeriod])

  useEffect(() => {
    if (!currentStationReadings || !selectedDeviceId) {
      setAllLeqResults([])
      return
    }
    const results: LeqResult[] = []
    for (const opt of LEQ_INTERVALS) {
      const result = calculateLeqForPeriod(currentStationReadings, opt.value, selectedDeviceId)
      if (result && result.sampleCount > 0) results.push(result)
    }
    setAllLeqResults(results)
  }, [currentStationReadings, selectedDeviceId])

  const category = strictResult ? getLeqCategory(strictResult.leq) : null

  const chartData = useMemo(() => {
    return allLeqResults.map((result) => ({
      name: LEQ_INTERVALS.find((p) => p.value === result.timePeriod)?.label ?? result.timePeriod,
      value: result.leq,
      samples: result.sampleCount,
      category: getLeqCategory(result.leq).category,
    }))
  }, [allLeqResults])

  const intervalLabel = LEQ_INTERVALS.find((p) => p.value === selectedPeriod)?.label ?? selectedPeriod

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Leq — Equivalent Continuous Sound Level</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Energy-average LAeq from samples:{" "}
              <span className="font-mono text-xs text-gray-600">Leq = 10·log₁₀(Σ10^(Lᵢ/10) / N)</span> (equal-time
              samples, IEC 61672 / ISO 1996 style).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLeqChart(!showLeqChart)}
            className="text-sm text-green-600 hover:text-green-700 shrink-0 self-start"
          >
            {showLeqChart ? "Hide chart" : "Show chart"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Station</label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId} disabled={devices.length === 0}>
              <SelectTrigger className="w-full sm:w-[260px] bg-white border-gray-200">
                <SelectValue placeholder="Select station" />
              </SelectTrigger>
              <SelectContent className="z-[1200]">
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.id} — {d.location.split(" - ")[0] || d.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Averaging window</label>
            <Select
              value={selectedPeriod}
              onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}
              disabled={devices.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[220px] bg-white border-gray-200">
                <SelectValue placeholder="Interval" />
              </SelectTrigger>
              <SelectContent className="z-[1200]">
                {LEQ_INTERVALS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {strictResult && (
          <div className="md:col-span-2">
            <div className={`h-full rounded-xl p-4 border ${category?.bg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm text-gray-600">Leq for {intervalLabel}</p>
                  <p className={`text-3xl font-bold ${category?.color}`}>
                    {strictResult.leq.toFixed(1)} <span className="text-lg font-normal">dB(A)</span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category?.bg} ${category?.color}`}
                >
                  {category?.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{category?.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                N = {strictResult.sampleCount.toLocaleString()} sound level samples in window · Station {selectedDeviceId}
              </p>
            </div>
          </div>
        )}

        {periodSampleCount === 0 && selectedDeviceId && dataAvailability?.hasData && (
          <div className="md:col-span-2 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            <p className="font-medium">No samples in this window</p>
            <p className="text-xs mt-1 text-amber-800">
              There are no noise readings between now and the start of &ldquo;{intervalLabel}&rdquo;. Try All time, 1
              day, or a longer interval, or check that this station is uploading data.
            </p>
          </div>
        )}
      </div>

      {selectedDeviceId && dataAvailability && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Total in DB: <span className="font-medium">{dataAvailability.totalReadings.toLocaleString()}</span>
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
                  <span className="text-green-600 font-medium">Recent data</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Data may be stale</span>
                </>
              )}
            </div>
            <div className="text-gray-500">
              Range: <span className="font-medium">{dataAvailability.dataRange}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Selected window uses <span className="font-medium">{periodSampleCount}</span> samples (after any subsampling
            cap for very large sets).
          </p>
        </div>
      )}

      {strictResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs">Min</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{strictResult.min.toFixed(1)} dB</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Average L</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{strictResult.avg.toFixed(1)} dB</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Max</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{strictResult.max.toFixed(1)} dB</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Gauge className="w-4 h-4" />
              <span className="text-xs">Samples (N)</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{strictResult.sampleCount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {showLeqChart && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Leq by window (all intervals with data) · {selectedDeviceId || "—"}
          </h4>
          <div className="h-[300px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                {selectedDeviceId ? "No multi-interval Leq to chart yet" : "Select a station"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 48, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    stroke="#9ca3af"
                    angle={-35}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    domain={[0, 100]}
                    label={{ value: "dB(A)", angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`${Number(value).toFixed(1)} dB(A)`, "Leq"]}
                    labelFormatter={(label) => `Window: ${label}`}
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
                <span className="text-gray-600">&lt;50–60 dB: Quiet/Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-400" />
                <span className="text-gray-600">60–70 dB: Elevated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-gray-600">70–80 dB: Loud</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-gray-600">&gt;80 dB: Dangerous</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {devices.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Add stations to calculate Leq</p>
        </div>
      )}

      {selectedDeviceId && !dataAvailability?.hasData && currentStationReadings && (
        <div className="text-center py-8 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No valid noise samples for this station</p>
        </div>
      )}
    </div>
  )
}
