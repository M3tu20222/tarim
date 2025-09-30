"use client";

import React, { useState } from 'react';
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
  Area,
  AreaChart,
} from 'recharts';

interface LineConfig {
  dataKey: string;
  stroke: string;
  name: string;
  yAxisId?: 'left' | 'right';
  unit?: string;
}

interface BarConfig {
  dataKey: string;
  fill: string;
  name: string;
  yAxisId?: 'left' | 'right';
  unit?: string;
}

interface ChartProps {
  title: string;
  data: any[];
  type: 'line' | 'bar' | 'composed' | 'area';
  xAxisDataKey: string;
  lines?: LineConfig[];
  bars?: BarConfig[];
  areas?: LineConfig[];
  icon?: React.ReactNode;
  yAxisUnit?: string;
  yAxis2Unit?: string;
  animated?: boolean;
  showGrid?: boolean;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-600/50 animate-scale-up">
        <p className="text-white font-semibold mb-2 text-sm">{`📅 ${label}`}</p>
        <div className="space-y-1">
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: pld.color }}
                />
                <span className="text-gray-300 text-sm">{pld.name}:</span>
              </div>
              <span className="text-white font-medium text-sm">
                {typeof pld.value === 'number' ? pld.value.toFixed(1) : pld.value}
                {pld.unit || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const WeatherChartWorking: React.FC<ChartProps> = ({
  title,
  data,
  type,
  xAxisDataKey,
  lines = [],
  bars = [],
  areas = [],
  icon,
  yAxisUnit,
  yAxis2Unit,
  animated = true,
  showGrid = true,
  height = 384,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasSecondYAxis = !!yAxis2Unit || lines.some(line => line.yAxisId === 'right') || bars.some(bar => bar.yAxisId === 'right');

  console.log(`🎯 WORKING Chart - ${title}:`, {
    dataLength: data.length,
    type,
    xAxisDataKey,
    firstItem: data[0],
    lines,
    bars
  });

  const renderChart = () => {
    const commonProps = {
      data: data,
      margin: { top: 20, right: 30, left: 0, bottom: 20 },
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    };

    const chartContent = (
      <>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isHovered ? "#6B7280" : "#4A5568"}
            strokeOpacity={isHovered ? 0.8 : 0.3}
            className="transition-all duration-300"
          />
        )}
        <XAxis
          dataKey={xAxisDataKey}
          tick={{ fill: '#D1D5DB', fontSize: 11 }}
          axisLine={{ stroke: '#6B7280' }}
          tickLine={{ stroke: '#6B7280' }}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: '#D1D5DB', fontSize: 11 }}
          axisLine={{ stroke: '#6B7280' }}
          tickLine={{ stroke: '#6B7280' }}
          width={60}
        />
        {hasSecondYAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#D1D5DB', fontSize: 11 }}
            axisLine={{ stroke: '#6B7280' }}
            tickLine={{ stroke: '#6B7280' }}
            width={60}
          />
        )}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeOpacity: 0.5 }}
          animationDuration={200}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            fontSize: '12px',
            color: '#D1D5DB'
          }}
        />

        {/* Areas */}
        {areas.map((area, index) => (
          <Area
            key={`area-${index}`}
            yAxisId={area.yAxisId || 'left'}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.stroke}
            fill={`${area.stroke}20`}
            name={area.name}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animated}
            animationDuration={1000}
            animationBegin={index * 200}
          />
        ))}

        {/* Lines */}
        {lines.map((line, index) => (
          <Line
            key={`line-${index}`}
            yAxisId={line.yAxisId || 'left'}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            name={line.name}
            strokeWidth={isHovered ? 3 : 2}
            dot={isHovered ? { fill: line.stroke, strokeWidth: 2, r: 4 } : false}
            activeDot={{ r: 6, stroke: line.stroke, strokeWidth: 2, fill: '#fff' }}
            isAnimationActive={animated}
            animationDuration={1000}
            animationBegin={index * 200}
            className="transition-all duration-300"
          />
        ))}

        {/* Bars */}
        {bars.map((bar, index) => (
          <Bar
            key={`bar-${index}`}
            yAxisId={bar.yAxisId || 'left'}
            dataKey={bar.dataKey}
            fill={bar.fill}
            name={bar.name}
            isAnimationActive={animated}
            animationDuration={1000}
            animationBegin={index * 300}
            radius={[2, 2, 0, 0]}
            className="hover:opacity-80 transition-opacity duration-200"
          />
        ))}
      </>
    );

    switch (type) {
      case 'line':
        return <LineChart {...commonProps}>{chartContent}</LineChart>;
      case 'bar':
        return <BarChart {...commonProps}>{chartContent}</BarChart>;
      case 'area':
        return <AreaChart {...commonProps}>{chartContent}</AreaChart>;
      case 'composed':
        return <ComposedChart {...commonProps}>{chartContent}</ComposedChart>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm
        p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700/50
        transition-all duration-300 hover:shadow-2xl hover:border-gray-600/50
        ${isHovered ? 'scale-[1.01]' : ''}
      `}
      style={{ height: height + 'px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-lg
                  bg-gradient-to-br from-primary-500/20 to-primary-600/20
                  border border-primary-500/30
                  ${isHovered ? 'scale-110' : ''}
                  transition-transform duration-300
                `}>
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>

            {data.length > 0 && (
              <div className="text-xs text-gray-400">
                {data.length} veri noktası
              </div>
            )}
          </div>
        )}

        <div className="flex-grow relative">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>

          {/* Loading overlay for empty data */}
          {data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Veri yükleniyor...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherChartWorking;
