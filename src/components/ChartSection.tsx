import React, { useState } from 'react';
import type { YearRow, Scenario } from '../domain/types';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea, Cell 
} from 'recharts';
import { TrendingUp, BarChart2 } from 'lucide-react';

interface ChartSectionProps {
  currentResults: YearRow[];
  scenarios: Scenario[];
  // 各シナリオの計算結果をマージしたデータマップ
  // { age: number, [scenarioId: string]: number }[]
  mergedChartData: any[];
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  currentResults,
  scenarios,
  mergedChartData,
}) => {
  const [activeTab, setActiveTab] = useState<'asset' | 'balance'>('asset');

  // カスタムツールチップのコンポーネント
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}歳`}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="tooltip-data-row" style={{ color: pld.color }}>
              <span className="tooltip-dot" style={{ backgroundColor: pld.color }}></span>
              <span className="tooltip-name">{pld.name}:</span>
              <span className="tooltip-value font-semibold">
                {Math.round(pld.value).toLocaleString()}万円
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card chart-section-card">
      <div className="chart-header">
        <div className="chart-tabs">
          <button 
            className={`chart-tab-btn ${activeTab === 'asset' ? 'active' : ''}`}
            onClick={() => setActiveTab('asset')}
          >
            <TrendingUp size={16} /> 累計資産推移 (シナリオ比較)
          </button>
          <button 
            className={`chart-tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            <BarChart2 size={16} /> 年間収支 (単年度)
          </button>
        </div>
      </div>

      <div className="chart-body">
        {currentResults.length === 0 ? (
          <div className="no-data-placeholder">
            データがありません。パラメータを入力してください。
          </div>
        ) : activeTab === 'asset' ? (
          /* 1. 累計資産の推移グラフ (折れ線) */
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart 
                data={mergedChartData}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="age" 
                  stroke="var(--text-muted)" 
                  tick={{ fontSize: 12 }} 
                  unit="歳"
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  tick={{ fontSize: 12 }} 
                  unit="万"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                
                {/* 0ラインの強調 */}
                <ReferenceLine y={0} stroke="var(--danger)" strokeWidth={1} />
                
                {/* マイナス領域を薄い赤背景にする */}
                <ReferenceArea y1={-99999} y2={0} fill="var(--danger)" fillOpacity={0.03} />

                {/* 現在の編集パラメータの線 (太い実線で表す) */}
                <Line 
                  type="monotone" 
                  dataKey="現在のプラン" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6 }}
                />

                {/* 保存されているシナリオの線 */}
                {scenarios.map(sc => (
                  <Line 
                    key={sc.id}
                    type="monotone" 
                    dataKey={sc.name} 
                    stroke={sc.color} 
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray={
                      sc.dashStyle === 'dashed' ? '5 5' : 
                      sc.dashStyle === 'dotted' ? '2 2' : undefined
                    }
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* 2. 年間収支の推移グラフ (棒グラフ、赤字年は赤) */
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={currentResults}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="age" 
                  stroke="var(--text-muted)" 
                  tick={{ fontSize: 12 }} 
                  unit="歳"
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  tick={{ fontSize: 12 }} 
                  unit="万"
                />
                <Tooltip 
                  formatter={(value: any) => [`${Math.round(value).toLocaleString()}万円`, '年間収支']}
                  contentStyle={{ backgroundColor: 'var(--bg-surface-solid)', borderColor: 'var(--border-color)' }}
                  labelFormatter={(label) => `${label}歳`}
                />
                
                <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />
                
                <Bar dataKey="annualBalance">
                  {currentResults.map((entry, index) => {
                    const isNegative = entry.annualBalance < 0;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isNegative ? 'var(--danger)' : 'var(--success)'} 
                        fillOpacity={0.7}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
