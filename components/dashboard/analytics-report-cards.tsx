"use client"

import { useCallback, useState } from "react"
import { FileText, BarChart3, Database, Bell, Loader2 } from "lucide-react"
import type { Device, Alert } from "@/types"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import {
  downloadTextFile,
  rowsToCsv,
  buildReadingsCsvRows,
  computeThresholdBreaches,
  buildAlertLogCsvRows,
  buildWeeklyReportHtml,
  buildCpcbMonthlyReportHtml,
} from "@/lib/report-exports"

interface AnalyticsReportCardsProps {
  devices: Device[]
  alerts: Alert[]
}

export default function AnalyticsReportCards({ devices, alerts }: AnalyticsReportCardsProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const { data: readings, loading } = useFirebaseData<Record<string, Record<string, unknown>>>("readings")

  const run = useCallback(
    async (key: string, fn: () => void | Promise<void>) => {
      setBusy(key)
      try {
        await Promise.resolve(fn())
      } finally {
        setBusy(null)
      }
    },
    []
  )

  const onWeeklyReport = () => {
    if (!readings || devices.length === 0) {
      window.alert("No readings or devices available yet.")
      return
    }
    const html = buildWeeklyReportHtml(devices, readings, new Date())
    const stamp = new Date().toISOString().slice(0, 10)
    downloadTextFile(html, `weekly-report-${stamp}.html`, "text/html;charset=utf-8")
  }

  const onCpcbReport = () => {
    if (!readings || devices.length === 0) {
      window.alert("No readings or devices available yet.")
      return
    }
    const html = buildCpcbMonthlyReportHtml(devices, readings, new Date())
    const stamp = formatMonthStamp(new Date())
    downloadTextFile(html, `cpcb-monthly-summary-${stamp}.html`, "text/html;charset=utf-8")
  }

  const onCsvExport = () => {
    if (!readings || devices.length === 0) {
      window.alert("No readings or devices available yet.")
      return
    }
    const end = Math.floor(Date.now() / 1000)
    const start = end - 30 * 24 * 60 * 60
    const rows = buildReadingsCsvRows(readings, devices, start, end)
    if (rows.length <= 1) {
      window.alert("No readings found in the last 30 days for export.")
      return
    }
    downloadTextFile(rowsToCsv(rows), `sensor-readings-last-30d-${end}.csv`, "text/csv;charset=utf-8")
  }

  const onAlertLog = () => {
    if (!readings || devices.length === 0) {
      window.alert("No readings or devices available yet.")
      return
    }
    const end = Math.floor(Date.now() / 1000)
    const start = end - 365 * 24 * 60 * 60
    const breaches = computeThresholdBreaches(readings, devices, start, end)
    if (breaches.length === 0 && alerts.length === 0) {
      window.alert("No threshold breaches or app alerts in the last year.")
      return
    }
    const rows = buildAlertLogCsvRows(breaches, alerts)
    downloadTextFile(rowsToCsv(rows), `alert-history-${end}.csv`, "text/csv;charset=utf-8")
  }

  const disabled = loading || devices.length === 0

  const cards = [
    {
      key: "weekly",
      icon: FileText,
      title: "Weekly report (HTML / print as PDF)",
      description: "Auto-generated · Covers all stations. Noise, PM2.5, Leq, CPCB compliance.",
      action: "Download latest week",
      onClick: () => run("weekly", onWeeklyReport),
    },
    {
      key: "cpcb",
      icon: BarChart3,
      title: "CPCB-style monthly summary",
      description: "Monthly breach summary. Formatted for regulatory submission.",
      action: "Generate current month",
      onClick: () => run("cpcb", onCpcbReport),
    },
    {
      key: "csv",
      icon: Database,
      title: "Raw Data Export (CSV)",
      description: "All sensor readings · Select date range. Noise, freq, PM2.5, temperature.",
      action: "Export last 30 days",
      onClick: () => run("csv", onCsvExport),
    },
    {
      key: "alerts",
      icon: Bell,
      title: "Alert History Log",
      description: "All threshold breaches with timestamps. Per station, per sensor type.",
      action: "View full log",
      onClick: () => run("alerts", onAlertLog),
    },
  ]

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Reports & export</h2>
      <p className="text-sm text-gray-500 mb-4">Regulatory and operational outputs</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(({ key, icon: Icon, title, description, action, onClick }) => (
          <div
            key={key}
            className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4 shadow-sm hover:border-gray-300 transition-colors"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
              <button
                type="button"
                disabled={disabled || busy === key}
                onClick={onClick}
                className="mt-3 text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {action} →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatMonthStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}
