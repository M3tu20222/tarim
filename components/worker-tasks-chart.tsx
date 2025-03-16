"use client"

import { useEffect, useRef } from "react"

export function WorkerTasksChart() {
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
    const irrigationTasks = Array.from({ length: 30 }, () => Math.floor(Math.random() * 3))
    const cultivationTasks = Array.from({ length: 30 }, () => Math.floor(Math.random() * 2))

    // Chart settings
    const padding = 40
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2
    const maxValue = Math.max(...irrigationTasks.map((v, i) => v + cultivationTasks[i])) * 1.5
    const barWidth = Math.max(4, (chartWidth / days.length) * 0.6)
    const barSpacing = chartWidth / days.length - barWidth

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
      ctx.fillText(value.toString(), padding - 10, y + 4)
    }

    // Draw stacked bars
    for (let i = 0; i < days.length; i++) {
      const irrigationValue = irrigationTasks[i]
      const cultivationValue = cultivationTasks[i]

      const x = padding + (chartWidth / days.length) * i + barSpacing / 2

      // Draw irrigation bar (bottom)
      if (irrigationValue > 0) {
        const irrigationHeight = (irrigationValue / maxValue) * chartHeight
        const y = padding + chartHeight - irrigationHeight

        // Create gradient for irrigation bar
        const irrigationGradient = ctx.createLinearGradient(x, y, x, y + irrigationHeight)
        irrigationGradient.addColorStop(0, "rgba(45, 212, 191, 0.8)")
        irrigationGradient.addColorStop(1, "rgba(45, 212, 191, 0.3)")

        ctx.fillStyle = irrigationGradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, irrigationHeight, [4, 4, 0, 0])
        ctx.fill()

        // Add glow effect
        ctx.shadowColor = "rgba(45, 212, 191, 0.5)"
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Draw cultivation bar (top)
      if (cultivationValue > 0) {
        const irrigationHeight = (irrigationValue / maxValue) * chartHeight
        const cultivationHeight = (cultivationValue / maxValue) * chartHeight
        const y = padding + chartHeight - irrigationHeight - cultivationHeight

        // Create gradient for cultivation bar
        const cultivationGradient = ctx.createLinearGradient(x, y, x, y + cultivationHeight)
        cultivationGradient.addColorStop(0, "rgba(236, 72, 153, 0.8)")
        cultivationGradient.addColorStop(1, "rgba(236, 72, 153, 0.3)")

        ctx.fillStyle = cultivationGradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, cultivationHeight, [4, 4, 0, 0])
        ctx.fill()

        // Add glow effect
        ctx.shadowColor = "rgba(236, 72, 153, 0.5)"
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // Draw legend
    const legendX = padding
    const legendY = padding - 15

    // Irrigation legend
    ctx.fillStyle = "rgba(45, 212, 191, 0.8)"
    ctx.fillRect(legendX, legendY, 12, 4)
    ctx.fillStyle = "#9CA3AF"
    ctx.textAlign = "left"
    ctx.fillText("Sulama Görevleri", legendX + 20, legendY + 4)

    // Cultivation legend
    ctx.fillStyle = "rgba(236, 72, 153, 0.8)"
    ctx.fillRect(legendX + 150, legendY, 12, 4)
    ctx.fillStyle = "#9CA3AF"
    ctx.fillText("İşleme Görevleri", legendX + 170, legendY + 4)
  }, [])

  return (
    <div className="w-full h-[300px] relative">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  )
}

