"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Device } from "@/types"
import { getDeviceStatus } from "@/lib/utils"
import { ArrowUpRight, Loader2 } from "lucide-react"

interface MitigationStrategiesProps {
  devices: Device[]
}

const SESSION_KEY = "emission-mitigation-conversation-id"

function buildFleetContext(devices: Device[]) {
  return devices.map((d) => ({
    id: d.id,
    location: d.location,
    status: getDeviceStatus(d),
    noise_dBA: d.noise,
    frequency_Hz: d.frequency,
    pm25_ug_m3: d.pm25,
    temperature_C: d.temperature,
    lastUpdate: d.lastUpdate?.toISOString?.() ?? String(d.lastUpdate),
  }))
}

const SUGGESTED = [
  "Which station needs attention now?",
  "Which stations are at highest risk from traffic peaks this week?",
  "Summarize CPCB-relevant exceedances across the fleet.",
  "Recommend mitigation for the noisiest station.",
]

export default function MitigationStrategies({ devices }: MitigationStrategiesProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [conversationId, setConversationId] = useState("")

  useEffect(() => {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    setConversationId(id)
  }, [])

  const fleetContext = useMemo(() => buildFleetContext(devices), [devices])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, sending])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      setError(null)
      setMessages((m) => [...m, { role: "user", text: trimmed }])
      setInput("")
      setSending(true)

      try {
        const res = await fetch("/api/mitigation-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationId,
            fleetContext,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setMessages((m) => m.slice(0, -1))
          setError(typeof data.error === "string" ? data.error : "Request failed")
          return
        }
        setMessages((m) => [...m, { role: "assistant", text: data.reply as string }])
      } catch {
        setMessages((m) => m.slice(0, -1))
        setError("Network error — try again.")
      } finally {
        setSending(false)
      }
    },
    [sending, conversationId, fleetContext],
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Environmental Intelligence Assistant</h2>
          <p className="text-sm text-gray-500 mt-1">
            Powered by MemoryLayer · Fed live sensor snapshots from {devices.length} station
            {devices.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 w-fit">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" aria-hidden />
          Live data context on send
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={sending || devices.length === 0 || !conversationId}
            className="text-left text-sm px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50/50 disabled:opacity-50 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="bg-white border border-gray-200 rounded-xl min-h-[320px] max-h-[55vh] overflow-y-auto p-4 space-y-4 shadow-sm"
      >
        {messages.length === 0 && !sending && (
          <p className="text-sm text-gray-400 text-center py-12">
            Ask about thresholds, stations, events, or mitigation. Each message includes a structured snapshot of
            current readings.
          </p>
        )}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 text-white px-4 py-2 text-sm">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start gap-2">
              <div
                className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 shrink-0"
                aria-hidden
              >
                AI
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap">
                {msg.text}
              </div>
            </div>
          ),
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask about any station, threshold, event, or mitigation strategy…"
          rows={2}
          disabled={sending || devices.length === 0 || !conversationId}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={sending || !input.trim() || devices.length === 0 || !conversationId}
          className="shrink-0 h-[52px] px-5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          Send
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
