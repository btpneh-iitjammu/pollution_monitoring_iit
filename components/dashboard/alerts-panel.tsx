"use client"

import { useState } from "react"
import { Check, Bell } from "lucide-react"
import type { Alert, Device } from "@/types"

interface AlertsPanelProps {
  alerts: Alert[]
  devices: Device[]
}

export default function AlertsPanel({ alerts, devices }: AlertsPanelProps) {
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())

  const handleAcknowledge = (alertId: string) => {
    setAcknowledgedAlerts((prev) => new Set([...prev, alertId]))
  }

  // Group alerts by device
  const alertsByDevice = alerts.reduce(
    (acc, alert) => {
      if (!acc[alert.deviceId]) {
        acc[alert.deviceId] = []
      }
      acc[alert.deviceId].push(alert)
      return acc
    },
    {} as Record<string, Alert[]>,
  )

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  }

  const getSeverityColor = (severity: "warning" | "critical") => {
    return severity === "critical" ? "text-red-600" : "text-yellow-600"
  }

  const activeAlerts = alerts.filter((a) => !acknowledgedAlerts.has(a.id))

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <p className="text-sm text-gray-500">Grouped by device</p>
          </div>
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
            {activeAlerts.length} alerts
          </span>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(alertsByDevice).map(([deviceId, deviceAlerts]) => {
          const device = devices.find((d) => d.id === deviceId)
          const unacknowledgedCount = deviceAlerts.filter((a) => !acknowledgedAlerts.has(a.id)).length

          if (unacknowledgedCount === 0) return null

          return (
            <div key={deviceId} className="bg-gray-50 rounded-xl p-4">
              {/* Device Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{deviceId}</h3>
                  <p className="text-xs text-gray-500">{device?.location}</p>
                </div>
                <span className="text-xs text-gray-400">{unacknowledgedCount} alerts</span>
              </div>

              {/* Alert Items */}
              <div className="space-y-3">
                {deviceAlerts
                  .filter((alert) => !acknowledgedAlerts.has(alert.id))
                  .map((alert) => (
                    <div key={alert.id} className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 leading-tight">{alert.message}</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(alert.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {alert.sensor === "noise"
                                ? "Temperature"
                                : alert.sensor === "pm25"
                                  ? "Temperature"
                                  : "Temperature"}
                            </span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className={`text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                              {alert.severity === "critical" ? "High" : "Medium"}
                            </span>
                          </div>
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )
        })}

        {activeAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">All Clear</p>
            <p className="text-xs text-gray-500">No active alerts at this time</p>
          </div>
        )}
      </div>
    </div>
  )
}
