"use client"

import { Map, BarChart3, Lightbulb } from "lucide-react"

export type DashboardSection = "dashboard" | "analytics" | "mitigation"

interface SidebarProps {
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
}

const navItems: { key: DashboardSection; label: string; icon: typeof Map }[] = [
  { key: "dashboard", label: "Dashboard", icon: Map },
  { key: "analytics", label: "Data Analytics", icon: BarChart3 },
  { key: "mitigation", label: "Mitigation Strategies", icon: Lightbulb },
]

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Navigation</p>
        <div className="space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSectionChange(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  isActive ? "bg-green-50 text-green-700 border border-green-200 font-medium" : "text-gray-600 hover:bg-gray-50 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-green-600" : "text-gray-400"}`} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
