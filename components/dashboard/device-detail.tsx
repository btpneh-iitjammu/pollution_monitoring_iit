"use client"

import type { Device } from "@/types"

interface DeviceDetailProps {
  device: Device
}

export default function DeviceDetail({ device }: DeviceDetailProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Device Metadata</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Device ID</label>
          <p className="text-sm text-gray-900 font-mono">{device.id}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Installation Date</label>
          <p className="text-sm text-gray-900">{device.installDate}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Firmware Version</label>
          <p className="text-sm text-gray-900">{device.firmware}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Battery Level</label>
          <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${device.battery}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{device.battery}%</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Signal Strength</label>
          <p className="text-sm text-green-600 font-medium">{device.signal}</p>
        </div>
      </div>
    </div>
  )
}
