import React, { useState } from 'react';
import type { YearRow, Scenario } from '../domain/types';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea, Cell,
} from 'recharts';
import { TrendingUp, BarChart2 } from 'lucide-react';

interface ChartSectionProps {
  currentResults: YearRow[];
  scenarios: Scenario[];
  mergedChartData: Record<string, number>[];
  showNetWorth: boolean;
}

interface TooltipItem { color?: string; name?: string; value?: number }
interface ChartTooltipProps { active?: boolean; payload?: TooltipItem[]; label?: string | number }

const CustomTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="custom-tooltip">
      <p className="tooltip-label">{`${label}歳`}</p>
      {payload.map((pld, i) => (
        <div key={i} className="tooltip-row" style={{ color: pld.color }}>
          <span className="tooltip-dot" style={{ backgroundColor: pld.color }} />
          <span className="tooltip-name">{pld.name}</span>
          <span className="tooltip-value">{Math.round(pld.value ?? 0).toLocaleString()}万円</span>
        </div>
      ))}
    </div>
  );
};

export const ChartSection: React.FC<ChartSectionProps> = ({ currentResults, scenarios, mergedChartData, showNetWorth }) => {
  const [activeTab, setActiveTab] = useState<'asset' | 'balance'>('asset');

  return (
    <div className="card chart-card">
      <div className="chart-tabs">
        <button className={`chart-tab ${activeTab === 'asset' ? 'active' : ''}`} onClick={() => setActiveTab('asset')}>
          <TrendingUp size={16} /> 資産の推移
        </button>
        <button className={`chart-tab ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>
          <BarChart2 size={16} /> 年間の収支
        </button>
      </div>

      <div className="chart-body">
        {currentResults.length === 0 ? (
          <div className="no-data-placeholder">条件を入力すると、ここにグラフが表示されます。</div>
        ) : activeTab === 'asset' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="age" stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="歳" minTickGap={20} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <ReferenceLine y={0} stroke="var(--danger)" strokeWidth={1} />
              <ReferenceArea y1={-9999999} y2={0} fill="var(--danger)" fillOpacity={0.04} />
              <Line type="monotone" dataKey="現在のプラン" stroke="var(--primary)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              {showNetWorth && (
                <Line type="monotone" dataKey="純資産（住宅含む）" stroke="var(--success)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              )}
              {scenarios.map((sc) => (
                <Line
                  key={sc.id}
                  type="monotone"
                  dataKey={sc.name}
                  stroke={sc.color}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray={sc.dashStyle === 'dashed' ? '5 5' : sc.dashStyle === 'dotted' ? '2 2' : undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentResults} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="age" stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="歳" minTickGap={20} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={44} />
              <Tooltip
                formatter={(value) => [`${Math.round(Number(value)).toLocaleString()}万円`, '年間収支']}
                contentStyle={{ backgroundColor: 'var(--bg-surface-solid)', borderColor: 'var(--border-color)', borderRadius: 8 }}
                labelFormatter={(label) => `${label}歳`}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />
              <Bar dataKey="annualBalance" radius={[2, 2, 0, 0]}>
                {currentResults.map((entry, i) => (
                  <Cell key={i} fill={entry.annualBalance < 0 ? 'var(--danger)' : 'var(--success)'} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
