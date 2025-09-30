"use client";

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SimpleLineChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  title,
  data,
  xKey,
  yKey,
  color = '#ef4444',
  height = 400,
}) => {
  console.log('🎨 SimpleLineChart:', { title, dataLength: data.length, xKey, yKey, firstItem: data[0] });

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl" style={{ height: `${height}px` }}>
        <h3 className="text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Veri yok</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d[xKey]),
    datasets: [
      {
        label: yKey,
        data: data.map(d => d[yKey]),
        borderColor: color,
        backgroundColor: `${color}40`,
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#fff',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#666',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        display: true,
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 10,
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-6 rounded-xl border border-blue-500/30">
      <h3 className="text-lg font-semibold text-white mb-4">
        {title} <span className="text-sm text-green-400">({data.length} nokta)</span>
      </h3>
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SimpleLineChart;
