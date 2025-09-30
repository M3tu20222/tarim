"use client";

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Bar,
} from 'recharts';

interface LineConfig {
  dataKey: string;
  stroke: string;
  name: string;
  yAxisId?: 'left' | 'right';
}

interface BarConfig {
  dataKey: string;
  fill: string;
  name: string;
  yAxisId?: 'left' | 'right';
}

interface ChartProps {
  title: string;
  data: any[];
  type: 'line' | 'bar' | 'composed';
  xAxisDataKey: string;
  lines?: LineConfig[];
  bars?: BarConfig[];
  icon?: React.ReactNode;
  yAxisUnit?: string;
  yAxis2Unit?: string;
  height?: number;
}

const ForecastChartV2: React.FC<ChartProps> = ({
  title,
  data,
  type,
  xAxisDataKey,
  lines = [],
  bars = [],
  icon,
  height = 400,
}) => {
  console.log(`🎨 ChartV2 Rendering - ${title}:`, {
    dataLength: data.length,
    type,
    xAxisDataKey,
    firstItem: data[0],
    lines,
    bars
  });

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl" style={{ height: `${height}px` }}>
        <h3 className="text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Veri yükleniyor...</p>
        </div>
      </div>
    );
  }

  const commonProps = {
    data: data,
    margin: { top: 20, right: 30, left: 20, bottom: 60 },
  };

  const renderChart = () => {
    const chartContent = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" strokeOpacity={0.3} />
        <XAxis
          dataKey={xAxisDataKey}
          tick={{ fill: '#FFFFFF', fontSize: 12 }}
          axisLine={{ stroke: '#FFFFFF' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: '#FFFFFF', fontSize: 12 }}
          axisLine={{ stroke: '#FFFFFF' }}
        />
        {lines.some(l => l.yAxisId === 'right') && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={{ stroke: '#6B7280' }}
          />
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px'
          }}
        />
        <Legend />

        {lines.map((line, idx) => (
          <Line
            key={idx}
            yAxisId={line.yAxisId || 'left'}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            name={line.name}
            strokeWidth={3}
            dot={{ fill: line.stroke, r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}

        {bars.map((bar, idx) => (
          <Bar
            key={idx}
            yAxisId={bar.yAxisId || 'left'}
            dataKey={bar.dataKey}
            fill={bar.fill}
            name={bar.name}
          />
        ))}
      </>
    );

    switch (type) {
      case 'line':
        return <LineChart {...commonProps}>{chartContent}</LineChart>;
      case 'bar':
        return <BarChart {...commonProps}>{chartContent}</BarChart>;
      case 'composed':
        return <ComposedChart {...commonProps}>{chartContent}</ComposedChart>;
      default:
        return <LineChart {...commonProps}>{chartContent}</LineChart>;
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-6 rounded-xl shadow-lg border-2 border-blue-500/30">
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="text-xs text-green-400 font-bold">✅ {data.length} veri noktası</span>
        </div>
      )}

      <div style={{ width: '100%', height: `${height}px`, backgroundColor: '#1a1a2e' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Debug bilgisi */}
      <div className="mt-2 text-xs text-gray-400 font-mono">
        Debug: Chart container {height}px yükseklikte, {data.length} veri
      </div>
    </div>
  );
};

export default ForecastChartV2;
