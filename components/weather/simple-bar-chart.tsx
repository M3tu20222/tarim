"use client";

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SimpleBarChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  title,
  data,
  xKey,
  yKey,
  color = '#a855f7',
  height = 400,
}) => {
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
        backgroundColor: `${color}80`,
        borderColor: color,
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#fff',
          font: { size: 12 },
        },
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
        ticks: {
          color: '#9CA3AF',
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#9CA3AF',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 p-6 rounded-xl border border-purple-500/30">
      <h3 className="text-lg font-semibold text-white mb-4">
        {title} <span className="text-sm text-green-400">({data.length} nokta)</span>
      </h3>
      <div style={{ height: `${height}px` }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SimpleBarChart;
