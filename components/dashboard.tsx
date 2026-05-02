"use client"
import type { Device, Location, Alert } from "@/types"
import Sidebar, { type DashboardSection } from "./dashboard/sidebar"
import MainContent from "./dashboard/main-content"
import Header from "./dashboard/header"
import { getDeviceStatus } from "@/lib/utils"

interface DashboardProps {
  devices: Device[]
  locations: Location[]
  alerts: Alert[]
  selectedDevice: string | null
  onSelectDevice: (id: string | null) => void
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
}

export default function Dashboard({
  devices,
  locations,
  alerts,
  selectedDevice,
  onSelectDevice,
  activeSection,
  onSectionChange,
}: DashboardProps) {
  const statusCounts = {
    all: devices.length,
    normal: devices.filter((d) => getDeviceStatus(d) === "normal").length,
    warning: devices.filter((d) => getDeviceStatus(d) === "warning").length,
    critical: devices.filter((d) => getDeviceStatus(d) === "critical").length,
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa]">
      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header statusCounts={statusCounts} />
        <MainContent
          devices={devices}
          locations={locations}
          alerts={alerts}
          selectedDevice={selectedDevice}
          onSelectDevice={onSelectDevice}
          activeSection={activeSection}
        />
      </div>
    </div>
  )
}
