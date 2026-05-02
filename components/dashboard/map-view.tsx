"use client"

import { useEffect } from "react"
import type { Device, Location } from "@/types"
import { getDeviceStatus } from "@/lib/utils"

interface MapViewProps {
  devices: Device[]
  locations: Location[]
  selectedDevice: string | null
  onSelectDevice: (id: string) => void
}

export default function MapView({ devices, locations, selectedDevice, onSelectDevice }: MapViewProps) {
  const getStatusColor = (status: "normal" | "warning" | "critical") => {
    switch (status) {
      case "normal":
        return "#22c55e"
      case "warning":
        return "#eab308"
      case "critical":
        return "#ef4444"
    }
  }

  useEffect(() => {
    // Ensure DOM is ready
    if (typeof window === "undefined") return

    const mapContainer = document.getElementById("map")
    if (!mapContainer) return

    let map: any = null
    let handleSelectDevice: ((e: Event) => void) | null = null

    const setupMap = async () => {
      try {
        // Check if map is already initialized
        if (map) return

        // Load Leaflet dynamically
        const leaflet = await import("leaflet")
        const L = leaflet.default
        
        // Import Leaflet CSS
        await import("leaflet/dist/leaflet.css")

        // Clear any existing map instance
        if (mapContainer._leaflet_id) {
          const existingMap = (window as any).L?.map?.instances?.[mapContainer._leaflet_id]
          if (existingMap) {
            existingMap.remove()
          }
        }

        // Create map centered on India
        map = L.map("map").setView([23.1815, 79.9864], 5)

        // Add OpenStreetMap tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        // Add device markers
        devices.forEach((device) => {
          const status = getDeviceStatus(device)
          const color = getStatusColor(status)

          // Create custom icon
          const icon = L.divIcon({
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background-color: ${color};
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transition: transform 0.2s;
              " class="device-marker">
                <div style="
                  width: 8px;
                  height: 8px;
                  background-color: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })

          // Create marker
          const marker = L.marker([device.latitude, device.longitude], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="font-size: 12px; width: 250px;">
                <strong>${device.id}</strong><br/>
                <small>${device.location}</small><br/>
                📍 ${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}<br/>
                <br/>
                <strong>Current Readings:</strong><br/>
                🔊 Noise: ${device.noise} dB(A)<br/>
                💨 PM2.5: ${device.pm25} µg/m³<br/>
                🌡️ Temperature: ${device.temperature.toFixed(2)}°C<br/>
                <br/>
                <button onclick="document.dispatchEvent(new CustomEvent('selectDevice', { detail: '${device.id}' }))" 
                  style="background-color: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                  View Details
                </button>
              </div>
            `)

          // Handle marker click
          marker.on("click", () => {
            onSelectDevice(device.id)
          })

          // Highlight selected device
          if (selectedDevice === device.id) {
            marker.openPopup()
          }
        })

        // Handle custom select event from popup button
        handleSelectDevice = (e: Event) => {
          const customEvent = e as CustomEvent<string>
          onSelectDevice(customEvent.detail)
        }
        document.addEventListener("selectDevice", handleSelectDevice)

        // Fit bounds to show all markers
        if (devices.length > 0) {
          const bounds = L.latLngBounds(devices.map((d) => [d.latitude, d.longitude]))
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      } catch (error) {
        console.error("Failed to load map:", error)
      }
    }

    setupMap()

    return () => {
      if (handleSelectDevice) {
        document.removeEventListener("selectDevice", handleSelectDevice)
      }
      if (map) {
        map.remove()
        map = null
      }
    }
  }, [devices, selectedDevice, onSelectDevice])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Device Location Map</h2>
          <p className="text-sm text-gray-500">{devices.length} devices monitored · Click pin for details</p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { status: "normal", label: "Normal", color: "bg-green-500" },
            { status: "warning", label: "Warning", color: "bg-yellow-500" },
            { status: "critical", label: "Critical", color: "bg-red-500" },
          ].map((item) => (
            <div key={item.status} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden relative z-0 isolate h-[320px]">
        <div id="map" className="absolute inset-0 z-0" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  )
}
