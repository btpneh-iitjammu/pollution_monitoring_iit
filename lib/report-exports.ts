import type { Device, Alert } from "@/types"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"

export function downloadTextFile(content: string, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n")
}

function readingValues(raw: unknown): {
  noise: number | null
  freq: number | null
  pm: number | null
  temp: number | null
} {
  if (!raw || typeof raw !== "object") {
    return { noise: null, freq: null, pm: null, temp: null }
  }
  const o = raw as Record<string, unknown>
  const noise =
    typeof o.sound_dBA === "number"
      ? o.sound_dBA
      : typeof o.noise === "number"
        ? o.noise
        : null
  const freq = typeof o.sound_freq === "number" ? o.sound_freq : null
  const pm = typeof o.emissions === "number" ? o.emissions : null
  const temp = typeof o.temperature === "number" ? o.temperature : null
  return { noise, freq, pm, temp }
}

export function buildReadingsCsvRows(
  readings: Record<string, Record<string, unknown>>,
  devices: Device[],
  startSec: number,
  endSec: number
): string[][] {
  const header = [
    "station_key",
    "device_id",
    "location",
    "timestamp_unix",
    "timestamp_iso",
    "noise_dBA",
    "frequency_Hz",
    "pm25_ug_m3",
    "temp_C",
  ]
  const rows: string[][] = [header]

  for (const device of devices) {
    const stationData = readings[device.locationId]
    if (!stationData) continue
    for (const [key, raw] of Object.entries(stationData)) {
      if (key === "0") continue
      const ts = Number(key)
      if (!Number.isFinite(ts) || ts < startSec || ts > endSec) continue
      const { noise, freq, pm, temp } = readingValues(raw)
      rows.push([
        device.locationId,
        device.id,
        device.location,
        String(ts),
        new Date(ts * 1000).toISOString(),
        noise != null ? String(noise) : "",
        freq != null ? String(freq) : "",
        pm != null ? String(pm) : "",
        temp != null ? String(temp) : "",
      ])
    }
  }

  return rows
}

const DEFAULT_NOISE_ALERT = 75
const DEFAULT_PM25_ALERT = 60

export type ThresholdBreach = {
  station: string
  deviceId: string
  location: string
  ts: number
  sensor: string
  value: number
  threshold: number
}

export function computeThresholdBreaches(
  readings: Record<string, Record<string, unknown>>,
  devices: Device[],
  startSec: number,
  endSec: number,
  noiseThreshold = DEFAULT_NOISE_ALERT,
  pm25Threshold = DEFAULT_PM25_ALERT
): ThresholdBreach[] {
  const out: ThresholdBreach[] = []
  for (const device of devices) {
    const stationData = readings[device.locationId]
    if (!stationData) continue
    for (const [key, raw] of Object.entries(stationData)) {
      if (key === "0") continue
      const ts = Number(key)
      if (!Number.isFinite(ts) || ts < startSec || ts > endSec) continue
      const { noise, pm } = readingValues(raw)
      if (noise !== null && noise > noiseThreshold) {
        out.push({
          station: device.locationId,
          deviceId: device.id,
          location: device.location,
          ts,
          sensor: "noise_dBA",
          value: noise,
          threshold: noiseThreshold,
        })
      }
      if (pm !== null && pm > pm25Threshold) {
        out.push({
          station: device.locationId,
          deviceId: device.id,
          location: device.location,
          ts,
          sensor: "pm25_ug_m3",
          value: pm,
          threshold: pm25Threshold,
        })
      }
    }
  }
  return out.sort((a, b) => b.ts - a.ts)
}

export function buildAlertLogCsvRows(breaches: ThresholdBreach[], appAlerts: Alert[]): string[][] {
  const header = ["source", "timestamp_iso", "device_id", "location", "sensor", "value", "threshold", "message"]
  const rows: string[][] = [header]
  for (const b of breaches) {
    rows.push([
      "computed_from_readings",
      new Date(b.ts * 1000).toISOString(),
      b.deviceId,
      b.location,
      b.sensor,
      String(b.value),
      String(b.threshold),
      `Value exceeded threshold (${b.sensor})`,
    ])
  }
  for (const a of appAlerts) {
    rows.push([
      "app_alert",
      a.timestamp.toISOString(),
      a.deviceId,
      "",
      a.sensor,
      "",
      a.severity,
      a.message,
    ])
  }
  return rows
}

function stationStats(
  readings: Record<string, Record<string, unknown>>,
  device: Device,
  startSec: number,
  endSec: number
) {
  const stationData = readings[device.locationId]
  if (!stationData) return null
  const noiseVals: number[] = []
  const pmVals: number[] = []
  for (const [key, raw] of Object.entries(stationData)) {
    if (key === "0") continue
    const ts = Number(key)
    if (!Number.isFinite(ts) || ts < startSec || ts > endSec) continue
    const { noise, pm } = readingValues(raw)
    if (noise !== null) noiseVals.push(noise)
    if (pm !== null) pmVals.push(pm)
  }
  const stat = (arr: number[]) => {
    if (arr.length === 0) return { min: "—", max: "—", avg: "—", n: 0 }
    const min = Math.min(...arr)
    const max = Math.max(...arr)
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length
    return { min: min.toFixed(1), max: max.toFixed(1), avg: avg.toFixed(1), n: arr.length }
  }
  return {
    deviceId: device.id,
    location: device.location,
    noise: stat(noiseVals),
    pm25: stat(pmVals),
  }
}

export function buildWeeklyReportHtml(
  devices: Device[],
  readings: Record<string, Record<string, unknown>>,
  weekEnd: Date
): string {
  const weekStart = subDays(weekEnd, 7)
  const startSec = Math.floor(weekStart.getTime() / 1000)
  const endSec = Math.floor(weekEnd.getTime() / 1000)
  const rows = devices
    .map((d) => stationStats(readings, d, startSec, endSec))
    .filter(Boolean) as NonNullable<ReturnType<typeof stationStats>>[]

  const breaches = computeThresholdBreaches(readings, devices, startSec, endSec)

  const tableRows = rows
    .map(
      (r) => `<tr>
    <td>${escapeHtml(r.deviceId)}</td>
    <td>${escapeHtml(r.location)}</td>
    <td>${r.noise.n}</td>
    <td>${r.noise.min} / ${r.noise.avg} / ${r.noise.max}</td>
    <td>${r.pm25.n}</td>
    <td>${r.pm25.min} / ${r.pm25.avg} / ${r.pm25.max}</td>
  </tr>`
    )
    .join("\n")

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Weekly environmental report</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; color: #111; }
  h1 { font-size: 1.25rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f4f4f5; }
  .note { color: #666; font-size: 0.85rem; margin-top: 1rem; }
</style></head><body>
  <h1>Weekly report — Smart Road &amp; Tunnel Emission Monitoring</h1>
  <p>Period: <strong>${format(weekStart, "PPP")}</strong> to <strong>${format(weekEnd, "PPP")}</strong></p>
  <p>Stations: ${devices.length} · Computed threshold events (noise &gt; ${DEFAULT_NOISE_ALERT} dB, PM2.5 &gt; ${DEFAULT_PM25_ALERT} µg/m³): ${breaches.length}</p>
  <table>
    <thead><tr><th>Device</th><th>Location</th><th>Noise samples</th><th>Noise min / avg / max (dB)</th><th>PM2.5 samples</th><th>PM2.5 min / avg / max (µg/m³)</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p class="note">Open this file in a browser and use Print → Save as PDF for a PDF copy.</p>
</body></html>`
}

export function buildCpcbMonthlyReportHtml(
  devices: Device[],
  readings: Record<string, Record<string, unknown>>,
  monthRef: Date
): string {
  const start = startOfMonth(monthRef)
  const end = endOfMonth(monthRef)
  const startSec = Math.floor(start.getTime() / 1000)
  const endSec = Math.floor(end.getTime() / 1000)
  const breaches = computeThresholdBreaches(readings, devices, startSec, endSec)
  const byStation: Record<string, ThresholdBreach[]> = {}
  for (const b of breaches) {
    byStation[b.deviceId] = byStation[b.deviceId] ?? []
    byStation[b.deviceId].push(b)
  }

  const stationRows = devices
    .map((d) => {
      const b = byStation[d.id] ?? []
      return `<tr><td>${escapeHtml(d.id)}</td><td>${escapeHtml(d.location)}</td><td>${b.length}</td></tr>`
    })
    .join("\n")

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>CPCB-style monthly breach summary</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f4f4f5; }
  .note { color: #555; font-size: 0.85rem; margin-top: 1.5rem; }
</style></head><body>
  <h1>Monthly exceedance summary (${format(start, "MMMM yyyy")})</h1>
  <p>Indicative thresholds used for this export: noise &gt; ${DEFAULT_NOISE_ALERT} dB(A), PM2.5 &gt; ${DEFAULT_PM25_ALERT} µg/m³. Adjust in codebase if your limits differ.</p>
  <p>Total exceedance events logged: ${breaches.length}</p>
  <table>
    <thead><tr><th>Device</th><th>Location</th><th>Exceedance count</th></tr></thead>
    <tbody>${stationRows}</tbody>
  </table>
  <p class="note">This HTML is intended for regulatory-style review. Print to PDF from your browser if required for submission.</p>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
