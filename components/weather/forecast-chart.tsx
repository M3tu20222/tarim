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
      <div className="bg-gray-900/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-700/50 animate-in fade-in duration-200">
        <p className="text-white font-semibold mb-2 text-xs">{`Saat: ${label}`}</p>
        <div className="space-y-1">
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: pld.color }}
                />
                <span className="text-gray-300 text-xs">{pld.name}:</span>
              </div>
              <span className="text-white font-medium text-xs">
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

const ForecastChart: React.FC<ChartProps> = ({
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
  height = 350,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasSecondYAxis = !!yAxis2Unit || lines.some(line => line.yAxisId === 'right') || bars.some(bar => bar.yAxisId === 'right');

  // Debug: Chart'a gelen veri
  React.useEffect(() => {
    console.log(`📈 ${title} - Chart received data:`, {
      dataLength: data.length,
      type,
      xAxisDataKey,
      firstDataPoint: data[0],
      lineConfigs: lines,
      barConfigs: bars
    });
  }, [data, title, type, xAxisDataKey, lines, bars]);

  const renderChart = () => {
    const commonProps = {
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    };

    const chartContent = (
      <>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isHovered ? "#6B7280" : "#374151"}
            strokeOpacity={isHovered ? 0.6 : 0.3}
            className="transition-all duration-300"
          />
        )}
        <XAxis
          dataKey={xAxisDataKey}
          tick={{ fill: '#9CA3AF', fontSize: 10 }}
          axisLine={{ stroke: '#4B5563' }}
          tickLine={{ stroke: '#4B5563' }}
          angle={-45}
          textAnchor="end"
          height={80}
          interval="preserveStartEnd"
          allowDataOverflow={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: '#9CA3AF', fontSize: 10 }}
          axisLine={{ stroke: '#4B5563' }}
          tickLine={{ stroke: '#4B5563' }}
          width={50}
          allowDataOverflow={false}
        />
        {hasSecondYAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
            width={50}
            allowDataOverflow={false}
          />
        )}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeOpacity: 0.3 }}
          animationDuration={150}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '16px',
            fontSize: '11px',
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
            fill={`${area.stroke}30`}
            name={area.name}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animated}
            animationDuration={800}
            animationBegin={index * 150}
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
            strokeWidth={isHovered ? 2.5 : 2}
            dot={{ r: 3, fill: line.stroke }}
            activeDot={{ r: 5, stroke: line.stroke, strokeWidth: 2, fill: '#fff' }}
            isAnimationActive={animated}
            animationDuration={800}
            animationBegin={index * 150}
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
            animationDuration={800}
            animationBegin={index * 200}
            radius={[4, 4, 0, 0]}
            className="hover:opacity-80 transition-opacity"
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
        p-4 sm:p-5 rounded-xl shadow-lg border border-gray-700/50
        transition-all duration-300 hover:shadow-xl hover:border-gray-600/50
        ${isHovered ? 'scale-[1.01]' : ''}
      `}
    >
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className={`
                w-7 h-7 flex items-center justify-center rounded-lg
                bg-blue-500/10 border border-blue-500/20
                transition-transform duration-300
                ${isHovered ? 'scale-110' : ''}
              `}>
                {icon}
              </div>
            )}
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>

          {data.length > 0 && (
            <div className="text-xs text-gray-500">
              {data.length} veri
            </div>
          )}
        </div>
      )}

      <div style={{ width: '100%', height: `${height}px` }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Veri yükleniyor...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastChart;