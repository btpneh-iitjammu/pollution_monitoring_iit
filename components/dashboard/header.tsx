"use client"

import { useState, useEffect } from "react"
import { Download, Settings } from "lucide-react"

interface HeaderProps {
  statusCounts: {
    normal: number
    warning: number
    critical: number
  }
}

export default function Header({ statusCounts }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = currentTime
    ? currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "--:--:-- --"

  const dateString = currentTime
    ? currentTime.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""

  const hasCritical = statusCounts.critical > 0

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Smart Road & Tunnel Emission Monitoring</h1>
          <p className="text-sm text-gray-500">Real-time Multi-Device Environmental Intelligence</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Time and Date */}
          <div className="text-right">
            <p className="text-lg font-medium text-gray-900">{timeString}</p>
            <p className="text-sm text-gray-500">{dateString}</p>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${hasCritical ? "bg-red-50" : "bg-green-50"}`}>
            <div className={`w-2 h-2 rounded-full ${hasCritical ? "bg-red-500" : "bg-green-500"}`} />
            <div>
              <p className={`text-sm font-medium ${hasCritical ? "text-red-600" : "text-green-600"}`}>
                {hasCritical ? "Critical Alerts Active" : "All Systems Normal"}
              </p>
              <p className="text-xs text-gray-500">
                {statusCounts.normal} Normal · {statusCounts.warning} Warning · {statusCounts.critical} Critical
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-5 h-5 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
