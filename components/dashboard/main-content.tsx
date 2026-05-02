"use client"

import { useState } from "react"
import type { Device, Location, Alert } from "@/types"
import MapView from "./map-view"
import DeviceCards from "./device-cards"
import LeqChart from "./leq-chart"
import TrendsAnalytics from "./trends-analytics"
import AlertsPanel from "./alerts-panel"
import AnalyticsReportCards from "./analytics-report-cards"
import MitigationStrategies from "./mitigation-strategies"
import type { DashboardSection } from "./sidebar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DeviceDetailContent from "./device-detail-content"

interface MainContentProps {
  devices: Device[]
  locations: Location[]
  alerts: Alert[]
  selectedDevice: string | null
  onSelectDevice: (id: string | null) => void
  activeSection: DashboardSection
}

export default function MainContent({
  devices,
  locations,
  alerts,
  selectedDevice,
  onSelectDevice,
  activeSection,
}: MainContentProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [modalDevice, setModalDevice] = useState<Device | null>(null)

  const openDeviceDetail = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    setModalDevice(device)
    onSelectDevice(deviceId)
    setDetailOpen(true)
  }

  const closeDeviceDetail = () => {
    setDetailOpen(false)
    setModalDevice(null)
    onSelectDevice(null)
  }

  return (
    <main className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {activeSection === "dashboard" && (
          <div className="space-y-6">
            <MapView
              devices={devices}
              locations={locations}
              selectedDevice={selectedDevice}
              onSelectDevice={openDeviceDetail}
            />
            <DeviceCards devices={devices} onSelectDevice={openDeviceDetail} />
            <AlertsPanel alerts={alerts} devices={devices} />
          </div>
        )}
        {activeSection === "analytics" && (
          <div className="space-y-6">
            <AnalyticsReportCards devices={devices} alerts={alerts} />
            <LeqChart devices={devices} />
            <TrendsAnalytics devices={devices} />
          </div>
        )}
        {activeSection === "mitigation" && <MitigationStrategies devices={devices} />}
      </div>

      <Dialog
        open={detailOpen && modalDevice !== null}
        onOpenChange={(open) => {
          if (!open) closeDeviceDetail()
        }}
      >
        <DialogContent
          className="max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl bg-white"
          showCloseButton={true}
        >
          {modalDevice && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 shrink-0 text-left border-b border-gray-100">
                <DialogTitle className="text-lg text-gray-900">{modalDevice.id}</DialogTitle>
                <DialogDescription className="text-gray-500">{modalDevice.location}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <DeviceDetailContent device={modalDevice} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
