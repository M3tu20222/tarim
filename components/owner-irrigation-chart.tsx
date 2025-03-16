"use client"

import { useEffect, useRef } from "react"

export function OwnerIrrigationChart() {
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
    const irrigationData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 100))

    // Chart settings
    const padding = 40
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2
    const barWidth = Math.max(4, (chartWidth / days.length) * 0.6)
    const barSpacing = chartWidth / days.length - barWidth
    const maxValue = Math.max(...irrigationData) * 1.2

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
      ctx.fillText(`${value} L`, padding - 10, y + 4)
    }

    // Draw bars
    for (let i = 0; i < days.length; i++) {
      const value = irrigationData[i]
      const barHeight = (value / maxValue) * chartHeight
      const x = padding + (chartWidth / days.length) * i + barSpacing / 2
      const y = padding + chartHeight - barHeight

      // Create gradient for bar
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
      gradient.addColorStop(0, "rgba(45, 212, 191, 0.8)")
      gradient.addColorStop(1, "rgba(45, 212, 191, 0.3)")

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0])
      ctx.fill()

      // Add glow effect
      ctx.shadowColor = "rgba(45, 212, 191, 0.5)"
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Draw title
    ctx.fillStyle = "#9CA3AF"
    ctx.textAlign = "left"
    ctx.font = "12px Inter, sans-serif"
    ctx.fillText("Günlük Sulama Miktarı (Litre)", padding, 20)
  }, [])

  return (
    <div className="w-full h-[300px] relative">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  )
}

