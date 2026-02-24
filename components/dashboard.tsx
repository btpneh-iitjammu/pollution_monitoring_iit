"use client"
import type { Device, Location, Alert } from "@/types"
import Sidebar from "./dashboard/sidebar"
import MainContent from "./dashboard/main-content"
import Header from "./dashboard/header"
import { getDeviceStatus } from "@/lib/utils"

interface DashboardProps {
  devices: Device[]
  locations: Location[]
  alerts: Alert[]
  selectedDevice: string | null
  onSelectDevice: (id: string | null) => void
  statusFilter: "all" | "normal" | "warning" | "critical"
  onStatusFilterChange: (filter: "all" | "normal" | "warning" | "critical") => void
  activeView: "map" | "trends" | "insights"
  onViewChange: (view: "map" | "trends" | "insights") => void
}

export default function Dashboard({
  devices,
  locations,
  alerts,
  selectedDevice,
  onSelectDevice,
  statusFilter,
  onStatusFilterChange,
  activeView,
  onViewChange,
}: DashboardProps) {
  // Count devices by status
  const statusCounts = {
    all: devices.length,
    normal: devices.filter((d) => getDeviceStatus(d) === "normal").length,
    warning: devices.filter((d) => getDeviceStatus(d) === "warning").length,
    critical: devices.filter((d) => getDeviceStatus(d) === "critical").length,
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa]">
      <Sidebar
        devices={devices}
        locations={locations}
        selectedDevice={selectedDevice}
        onSelectDevice={onSelectDevice}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        statusCounts={statusCounts}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header statusCounts={statusCounts} />
        <MainContent
          devices={devices}
          locations={locations}
          alerts={alerts}
          selectedDevice={selectedDevice}
          onSelectDevice={onSelectDevice}
          statusFilter={statusFilter}
          activeView={activeView}
          onViewChange={onViewChange}
        />
      </div>
    </div>
  )
}
