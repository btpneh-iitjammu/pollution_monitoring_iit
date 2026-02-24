"use client"

import { useState } from "react"
import type { Device, Location, Alert } from "@/types"
import MapView from "./map-view"
import DeviceCards from "./device-cards"
import DeviceDetailPanel from "./device-detail-panel"
import TrendsAnalytics from "./trends-analytics"
import AlertsPanel from "./alerts-panel"
import SummaryInsights from "./summary-insights"
import { getDeviceStatus } from "@/lib/utils"

interface MainContentProps {
  devices: Device[]
  locations: Location[]
  alerts: Alert[]
  selectedDevice: string | null
  onSelectDevice: (id: string | null) => void
  statusFilter: "all" | "normal" | "warning" | "critical"
  activeView: "map" | "trends" | "insights"
  onViewChange: (view: "map" | "trends" | "insights") => void
}

export default function MainContent({
  devices,
  locations,
  alerts,
  selectedDevice,
  onSelectDevice,
  statusFilter,
  activeView,
  onViewChange,
}: MainContentProps) {
  const [showDevicePanel, setShowDevicePanel] = useState(false)
  const [panelDevice, setPanelDevice] = useState<Device | null>(null)

  const handleDeviceClick = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId)
    if (device) {
      setPanelDevice(device)
      setShowDevicePanel(true)
    }
  }

  const handleClosePanel = () => {
    setShowDevicePanel(false)
    setPanelDevice(null)
  }

  // Filter devices based on status filter
  const filteredDevices = statusFilter === "all" ? devices : devices.filter((d) => getDeviceStatus(d) === statusFilter)

  return (
    <main className="flex-1 overflow-hidden flex">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Map View */}
          <MapView
            devices={filteredDevices}
            locations={locations}
            selectedDevice={selectedDevice}
            onSelectDevice={handleDeviceClick}
          />

          {/* Device Overview Cards */}
          <DeviceCards devices={filteredDevices} onSelectDevice={handleDeviceClick} />

          {/* Trends & Analytics */}
          <TrendsAnalytics devices={filteredDevices} />

          {/* Summary Insights */}
          <SummaryInsights devices={devices} alerts={alerts} />
        </div>
      </div>

      {/* Right Panel - Device Detail or Alerts */}
      {showDevicePanel && panelDevice ? (
        <DeviceDetailPanel device={panelDevice} onClose={handleClosePanel} />
      ) : (
        <AlertsPanel alerts={alerts} devices={devices} />
      )}
    </main>
  )
}
