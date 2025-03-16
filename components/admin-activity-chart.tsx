"use client"

import { useEffect, useRef } from "react"

export function AdminActivityChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const canvas = canvasRef.current
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Mock data
    const days = Array.from({ length: 30 }, (_, i) => i + 1)
    const userActivity = Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 10)
    const fieldActivity = Array.from({ length: 30 }, () => Math.floor(Math.random() * 40) + 5)

    // Chart settings
    const padding = 40
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2
    const maxValue = Math.max(...userActivity, ...fieldActivity) * 1.2

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = "rgba(124, 58, 237, 0.1)"
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
    }

    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding + (chartWidth / 6) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + chartHeight)
      ctx.stroke()
    }

    // Draw axes labels
    ctx.fillStyle = "#9CA3AF"
    ctx.font = "10px Inter, sans-serif"
    ctx.textAlign = "center"

    // X-axis labels (days)
    for (let i = 0; i <= 6; i++) {
      const day = Math.floor((days.length / 6) * i)
      const x = padding + (chartWidth / 6) * i
      ctx.fillText(day.toString(), x, canvas.height - 15)
    }

    // Y-axis labels (values)
    ctx.textAlign = "right"
    for (let i = 0; i <= 5; i++) {
      const value = Math.floor((maxValue / 5) * (5 - i))
      const y = padding + (chartHeight / 5) * i
      ctx.fillText(value.toString(), padding - 10, y + 4)
    }

    // Draw user activity line
    ctx.strokeStyle = "rgba(139, 92, 246, 0.8)"
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < days.length; i++) {
      const x = padding + (chartWidth / (days.length - 1)) * i
      const y = padding + chartHeight - (userActivity[i] / maxValue) * chartHeight

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Add glow effect to user activity line
    ctx.shadowColor = "rgba(139, 92, 246, 0.5)"
    ctx.shadowBlur = 10
    ctx.strokeStyle = "rgba(139, 92, 246, 0.8)"
    ctx.stroke()
    ctx.shadowBlur = 0

    // Draw field activity line
    ctx.strokeStyle = "rgba(45, 212, 191, 0.8)"
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < days.length; i++) {
      const x = padding + (chartWidth / (days.length - 1)) * i
      const y = padding + chartHeight - (fieldActivity[i] / maxValue) * chartHeight

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Add glow effect to field activity line
    ctx.shadowColor = "rgba(45, 212, 191, 0.5)"
    ctx.shadowBlur = 10
    ctx.strokeStyle = "rgba(45, 212, 191, 0.8)"
    ctx.stroke()
    ctx.shadowBlur = 0

    // Draw legend
    const legendX = padding
    const legendY = padding - 15

    // User activity legend
    ctx.fillStyle = "rgba(139, 92, 246, 0.8)"
    ctx.fillRect(legendX, legendY, 12, 4)
    ctx.fillStyle = "#9CA3AF"
    ctx.textAlign = "left"
    ctx.fillText("Kullanıcı Aktivitesi", legendX + 20, legendY + 4)

    // Field activity legend
    ctx.fillStyle = "rgba(45, 212, 191, 0.8)"
    ctx.fillRect(legendX + 150, legendY, 12, 4)
    ctx.fillStyle = "#9CA3AF"
    ctx.fillText("Tarla Aktivitesi", legendX + 170, legendY + 4)
  }, [])

  return (
    <div className="w-full h-[300px] relative">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  )
}

