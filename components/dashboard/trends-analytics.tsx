"use client"

import { useState, useMemo, useEffect } from "react"
import type { Device } from "@/types"
import type { DateRange } from "react-day-picker"
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ComposedChart,
  ReferenceLine,
} from "recharts"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import { format, startOfDay, endOfDay, subDays } from "date-fns"
import { CalendarIcon, Radio } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const ALL_STATIONS = "__all__"
const MAX_CHART_POINTS = 280
/** Rolling window when Live is on (seconds). */
const LIVE_WINDOW_SEC = 60 * 60
const LIVE_CLOCK_MS = 10_000

interface TrendsAnalyticsProps {
  devices: Device[]
}

function subsampleSorted(sorted: number[], max: number): number[] {
  if (sorted.length <= max) return sorted
  const result: number[] = []
  const n = sorted.length
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (n - 1)) / Math.max(max - 1, 1))
    result.push(sorted[idx])
  }
  return result
}

function readingAt(stationData: Record<string, unknown>, ts: number): Record<string, unknown> | null {
  const raw = stationData[String(ts)]
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>
  return null
}

function defaultRange(): DateRange {
  const to = endOfDay(new Date())
  const from = startOfDay(subDays(to, 6))
  return { from, to }
}

export default function TrendsAnalytics({ devices }: TrendsAnalyticsProps) {
  const [stationFilter, setStationFilter] = useState<string>(ALL_STATIONS)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [historicalData, setHistoricalData] = useState<Record<string, unknown>[]>([])
  const [liveMode, setLiveMode] = useState(false)
  const [liveTick, setLiveTick] = useState(0)

  const { data: readings } = useFirebaseData<Record<string, Record<string, unknown>>>("readings")

  useEffect(() => {
    if (!liveMode) return
    setLiveTick(Date.now())
    const id = window.setInterval(() => setLiveTick(Date.now()), LIVE_CLOCK_MS)
    return () => window.clearInterval(id)
  }, [liveMode])

  useEffect(() => {
    if (stationFilter !== ALL_STATIONS && !devices.some((d) => d.id === stationFilter)) {
      setStationFilter(ALL_STATIONS)
    }
  }, [devices, stationFilter])

  const selectedDeviceIds = useMemo(() => {
    if (stationFilter === ALL_STATIONS) return devices.map((d) => d.id)
    return devices.filter((d) => d.id === stationFilter).map((d) => d.id)
  }, [devices, stationFilter])

  const devicesForChart = useMemo(() => {
    if (stationFilter === ALL_STATIONS) return devices
    return devices.filter((d) => d.id === stationFilter)
  }, [devices, stationFilter])

  const rangeBounds = useMemo(() => {
    if (liveMode) {
      const nowMs = liveTick || Date.now()
      const nowSec = Math.floor(nowMs / 1000)
      const startSec = nowSec - LIVE_WINDOW_SEC
      return {
        startSec,
        endSec: nowSec,
        start: new Date(startSec * 1000),
        end: new Date(nowSec * 1000),
      }
    }
    const from = dateRange?.from
    const to = dateRange?.to ?? dateRange?.from
    if (!from || !to) return null
    const start = startOfDay(from <= to ? from : to)
    const end = endOfDay(to >= from ? to : from)
    return {
      startSec: Math.floor(start.getTime() / 1000),
      endSec: Math.floor(end.getTime() / 1000),
      start,
      end,
    }
  }, [dateRange, liveMode, liveTick])

  useEffect(() => {
    if (!readings || devices.length === 0 || !rangeBounds) {
      setHistoricalData([])
      return
    }

    const selectedDevicesList = selectedDeviceIds
    if (selectedDevicesList.length === 0) {
      setHistoricalData([])
      return
    }

    const deviceToStation: Record<string, string> = {}
    devices.forEach((device) => {
      deviceToStation[device.id] = device.locationId
    })

    const inRange = new Set<number>()
    const { startSec, endSec } = rangeBounds

    selectedDevicesList.forEach((deviceId) => {
      const station = deviceToStation[deviceId]
      if (!station || !readings[station]) return
      Object.keys(readings[station])
        .filter((k) => k !== "0")
        .map(Number)
        .forEach((ts) => {
          if (ts >= startSec && ts <= endSec) inRange.add(ts)
        })
    })

    const timestamps = subsampleSorted(Array.from(inRange).sort((a, b) => a - b), MAX_CHART_POINTS)

    const spanMs = rangeBounds.end.getTime() - rangeBounds.start.getTime()
    const spanDays = spanMs / 86400000

    const dataPoints = timestamps.map((timestamp) => {
      const date = new Date(timestamp * 1000)
      let timeLabel: string
      if (spanDays <= 1) {
        timeLabel = format(date, "HH:mm")
      } else if (spanDays <= 7) {
        timeLabel = format(date, "EEE HH:mm")
      } else {
        timeLabel = format(date, "MMM d, HH:mm")
      }

      const dataPoint: Record<string, unknown> = {
        time: timeLabel,
        timestamp,
      }

      selectedDevicesList.forEach((deviceId) => {
        const station = deviceToStation[deviceId]
        const stationData = station ? readings[station] : undefined
        const r = stationData ? readingAt(stationData, timestamp) : null
        if (r) {
          dataPoint[`${deviceId}_noise`] =
            typeof r.sound_dBA === "number"
              ? r.sound_dBA
              : typeof r.noise === "number"
                ? r.noise
                : undefined
          dataPoint[`${deviceId}_pm25`] =
            typeof r.emissions === "number" ? r.emissions : undefined
        }
      })

      return dataPoint
    })

    setHistoricalData(dataPoints)
  }, [readings, devices, selectedDeviceIds, rangeBounds])

  const trendData = useMemo(() => {
    if (historicalData.length > 0) return historicalData
    if (devicesForChart.length === 0) return []
    return devicesForChart.map((device) => ({
      time: "Current",
      [`${device.id}_noise`]: device.noise ?? 0,
      [`${device.id}_pm25`]: device.pm25 ?? 0,
    }))
  }, [historicalData, devicesForChart])

  const rangeLabel =
    dateRange?.from && (dateRange.to ?? dateRange.from)
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to ?? dateRange.from, "MMM d, yyyy")}`
      : "Select date range"

  const applyPresetDays = (days: number) => {
    const to = endOfDay(new Date())
    const from = startOfDay(subDays(to, days - 1))
    setDateRange({ from, to })
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Trends & Analytics</h2>
          <p className="text-sm text-gray-500">
            {liveMode
              ? `Live: rolling last ${LIVE_WINDOW_SEC / 60} minutes — updates as new readings arrive via Firebase.`
              : "Noise (dB) and PM2.5 (µg/m³) — filtered by station and date range"}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 flex-wrap">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Station</label>
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="w-full sm:w-[220px] bg-white border-gray-200">
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent className="z-[1200]">
                  <SelectItem value={ALL_STATIONS}>All stations</SelectItem>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.id} — {d.location.split(" - ")[0] || d.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date range</label>
              <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={liveMode}
                    className={cn(
                      "w-full sm:w-[280px] justify-start text-left font-normal border-gray-200 bg-white",
                      !dateRange?.from && "text-muted-foreground",
                      liveMode && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {liveMode ? "Date range (disabled while live)" : rangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[1200]" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(r) => {
                      setLiveMode(false)
                      setDateRange(r)
                    }}
                    numberOfMonths={2}
                    defaultMonth={dateRange?.from}
                  />
                  <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLiveMode(false)
                        setDateRange(defaultRange())
                      }}
                    >
                      Reset (7 days)
                    </Button>
                    <Button type="button" size="sm" onClick={() => setRangeOpen(false)}>
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 items-center">
            <Button
              type="button"
              variant={liveMode ? "default" : "secondary"}
              size="sm"
              className={cn(
                "text-xs border gap-1.5",
                liveMode
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-700 shadow-sm"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200",
              )}
              disabled={devices.length === 0}
              onClick={() => {
                if (devices.length === 0) return
                setLiveMode((v) => !v)
                setRangeOpen(false)
              }}
            >
              <Radio className={cn("w-3.5 h-3.5", liveMode && "animate-pulse")} />
              {liveMode ? "Live on" : "Live data"}
            </Button>
            {[
              { label: "24h", days: 1 },
              { label: "7d", days: 7 },
              { label: "30d", days: 30 },
            ].map(({ label, days }) => (
              <Button
                key={label}
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                onClick={() => {
                  setLiveMode(false)
                  applyPresetDays(days)
                }}
              >
                Last {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="h-[400px]">
          {!rangeBounds ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Choose a start and end date in the calendar
            </div>
          ) : devices.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">No devices to chart</div>
          ) : trendData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-1">
              <span>No readings in this range</span>
              <span className="text-xs">Try widening the date range or check Firebase data</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9ca3af" interval="preserveStartEnd" />
                <YAxis
                  yAxisId="noise"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  stroke="#16a34a"
                  domain={[20, "auto"]}
                  label={{ value: "dB(A)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#15803d" }}
                />
                <YAxis
                  yAxisId="pm25"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  stroke="#2563eb"
                  domain={[0, "auto"]}
                  label={{
                    value: "PM2.5 (µg/m³)",
                    angle: 90,
                    position: "insideRight",
                    fontSize: 11,
                    fill: "#1d4ed8",
                  }}
                />
                <Tooltip />
                <Legend />
                <ReferenceLine
                  yAxisId="noise"
                  y={80}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{ value: "80 dB", position: "insideTopRight", fontSize: 10, fill: "#f97316" }}
                />
                {devicesForChart.flatMap((device) => {
                  const deviceId = device.id
                  return [
                    <Line
                      key={`${deviceId}_noise`}
                      yAxisId="noise"
                      type="monotone"
                      dataKey={`${deviceId}_noise`}
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name={`${deviceId} Noise (dB)`}
                      connectNulls
                    />,
                    <Line
                      key={`${deviceId}_pm25`}
                      yAxisId="pm25"
                      type="monotone"
                      dataKey={`${deviceId}_pm25`}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      name={`${deviceId} PM2.5 (µg/m³)`}
                      connectNulls
                    />,
                  ]
                })}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500" />
            <span className="text-sm text-gray-500">Noise (dB) — left axis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500 border-dashed border-t-2 border-blue-500 h-0 bg-transparent" />
            <span className="text-sm text-gray-500">PM2.5 — right axis</span>
          </div>
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-2 min-w-0">
            {liveMode && rangeBounds ? (
              <>
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                <span className="truncate">
                  Live window: {format(rangeBounds.start, "MMM d, HH:mm")} → now
                </span>
              </>
            ) : rangeBounds ? (
              `${format(rangeBounds.start, "MMM d, yyyy")} → ${format(rangeBounds.end, "MMM d, yyyy")}`
            ) : (
              "—"
            )}
          </span>
          <span>
            {historicalData.length > 0 && trendData.length > 0
              ? `${trendData.length} points`
              : ""}
          </span>
        </div>
      </div>
    </div>
  )
}
