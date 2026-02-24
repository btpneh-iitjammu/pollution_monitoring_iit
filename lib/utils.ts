import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Device } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDeviceStatus(device: Device | undefined): "normal" | "warning" | "critical" {
  if (!device) return "normal"
  // Critical thresholds
  if (device.noise > 90 || device.pm25 > 70 || device.temperature > 35) {
    return "critical"
  }
  // Warning thresholds
  if (device.noise > 85 || device.pm25 > 55 || device.temperature > 30) {
    return "warning"
  }
  return "normal"
}

export function getSensorStatus(
  device: Device,
  sensor: "noise" | "pm25" | "temperature",
): "normal" | "warning" | "critical" {
  switch (sensor) {
    case "noise":
      if (device.noise > 90) return "critical"
      if (device.noise > 85) return "warning"
      return "normal"
    case "pm25":
      if (device.pm25 > 70) return "critical"
      if (device.pm25 > 55) return "warning"
      return "normal"
    case "temperature":
      if (device.temperature > 35) return "critical"
      if (device.temperature > 30) return "warning"
      return "normal"
  }
}
