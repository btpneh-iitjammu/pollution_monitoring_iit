"use client"

import { FileText, BarChart3, Database, Bell } from "lucide-react"

const cards = [
  {
    icon: FileText,
    title: "Weekly PDF Report",
    description: "Auto-generated · Covers all stations. Noise, PM2.5, Leq, CPCB compliance.",
    action: "Download latest week",
  },
  {
    icon: BarChart3,
    title: "CPCB Compliance Report",
    description: "Monthly breach summary. Formatted for regulatory submission.",
    action: "Generate current month",
  },
  {
    icon: Database,
    title: "Raw Data Export (CSV)",
    description: "All sensor readings · Select date range. Noise, freq, PM2.5, temperature.",
    action: "Export last 30 days",
  },
  {
    icon: Bell,
    title: "Alert History Log",
    description: "All threshold breaches with timestamps. Per station, per sensor type.",
    action: "View full log",
  },
]

export default function AnalyticsReportCards() {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Reports & export</h2>
      <p className="text-sm text-gray-500 mb-4">Regulatory and operational outputs</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(({ icon: Icon, title, description, action }) => (
          <div
            key={title}
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
                className="mt-3 text-sm font-medium text-green-600 hover:text-green-700"
              >
                {action} →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
