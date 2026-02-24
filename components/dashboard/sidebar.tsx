"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, MapPin, LayoutGrid, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"
import type { Device, Location } from "@/types"
import { getDeviceStatus } from "@/lib/utils"

interface SidebarProps {
  devices: Device[]
  locations: Location[]
  selectedDevice: string | null
  onSelectDevice: (id: string | null) => void
  statusFilter: "all" | "normal" | "warning" | "critical"
  onStatusFilterChange: (filter: "all" | "normal" | "warning" | "critical") => void
  statusCounts: {
    all: number
    normal: number
    warning: number
    critical: number
  }
}

export default function Sidebar({
  devices,
  locations,
  selectedDevice,
  onSelectDevice,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
}: SidebarProps) {
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())

  const toggleLocation = (locationId: string) => {
    const newExpanded = new Set(expandedLocations)
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId)
    } else {
      newExpanded.add(locationId)
    }
    setExpandedLocations(newExpanded)
  }

  const getStatusDot = (status: "normal" | "warning" | "critical") => {
    switch (status) {
      case "normal":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "critical":
        return "bg-red-500"
    }
  }

  const filterOptions = [
    { key: "all" as const, label: "All Devices", icon: LayoutGrid, count: statusCounts.all },
    { key: "normal" as const, label: "Normal", icon: CheckCircle, count: statusCounts.normal },
    { key: "warning" as const, label: "Warning", icon: AlertTriangle, count: statusCounts.warning },
    { key: "critical" as const, label: "Critical", icon: AlertCircle, count: statusCounts.critical },
  ]

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col">
      {/* Filter by Status */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Filter by Status</h2>
        <div className="space-y-1">
          {filterOptions.map((option) => {
            const Icon = option.icon
            const isActive = statusFilter === option.key
            return (
              <button
                key={option.key}
                onClick={() => onStatusFilterChange(option.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-green-50 text-green-700 border border-green-200" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? "text-green-600" : "text-gray-400"}`} />
                  <span className={isActive ? "font-medium" : ""}>{option.label}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {option.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Device List</h2>
            {statusFilter !== "all" && (
              <button
                onClick={() => onStatusFilterChange("all")}
                className="text-xs text-green-600 hover:text-green-700"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-1">
            {locations.map((location) => {
              let locationDevices = devices.filter((d) => d.locationId === location.id)

              // Apply status filter
              if (statusFilter !== "all") {
                locationDevices = locationDevices.filter((d) => getDeviceStatus(d) === statusFilter)
              }

              if (locationDevices.length === 0) return null

              const isExpanded = expandedLocations.has(location.id)

              return (
                <div key={location.id} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleLocation(location.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate max-w-[140px]">{location.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {locationDevices.length}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 py-1">
                      {locationDevices.map((device) => {
                        const status = getDeviceStatus(device)
                        const isSelected = selectedDevice === device.id

                        return (
                          <button
                            key={device.id}
                            onClick={() => onSelectDevice(isSelected ? null : device.id)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                              isSelected ? "bg-green-50" : "hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusDot(status)}`} />
                              <span className={isSelected ? "text-green-700 font-medium" : "text-gray-600"}>
                                {device.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{device.battery}%</span>
                              <div className="w-4 h-3 border border-gray-300 rounded-sm relative">
                                <div
                                  className="absolute inset-0.5 bg-gray-400 rounded-sm"
                                  style={{ width: `${device.battery * 0.8}%` }}
                                />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}
