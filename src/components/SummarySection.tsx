import React, { useState } from 'react';
import type { Scenario, YearRow } from '../domain/types';
import type { SimulationAnalysis } from '../domain/simulation';
import { AlertTriangle, CheckCircle2, Layers, Trash2, Plus } from 'lucide-react';

interface ScenarioStat {
  scenario: Scenario;
  rows: YearRow[];
  analysis: SimulationAnalysis | null;
}

interface SummarySectionProps {
  analysis: SimulationAnalysis | null;
  scenarios: Scenario[];
  scenarioStats: ScenarioStat[];
  onSaveScenario: (name: string) => void;
  onDeleteScenario: (id: string) => void;
}

const fmt = (n: number) => `${n < 0 ? '▲' : ''}${Math.abs(n).toLocaleString()}`;

export const SummarySection: React.FC<SummarySectionProps> = ({
  analysis, scenarios, scenarioStats, onSaveScenario, onDeleteScenario,
}) => {
  const [newName, setNewName] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onSaveScenario(newName.trim());
    setNewName('');
  };

  return (
    <div className="summary-section">
      {analysis && (
        <div className={`hero-card ${analysis.isHealthy ? 'hero-ok' : 'hero-warn'}`}>
          <div className="hero-status">
            {analysis.isHealthy ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {analysis.isHealthy ? '資金はもつ見込みです' : '資産が不足する時期があります'}
          </div>

          <div className="hero-main">
            <span className="hero-label">{analysis.finalAge}歳時点の資産</span>
            <span className={`hero-value ${analysis.finalAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
              {fmt(analysis.finalAsset)}<span className="hero-unit">万円</span>
            </span>
          </div>

          <div className="hero-metrics">
            <div className="hero-metric">
              <span className="hm-label">いちばん少ないとき</span>
              <span className={`hm-value ${analysis.minAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
                {fmt(analysis.minAsset)}万円
                <span className="hm-sub">（{analysis.minAssetAge}歳）</span>
              </span>
            </div>
            <div className="hero-metric">
              <span className="hm-label">資産が尽きる年齢</span>
              <span className={`hm-value ${analysis.depletionAge === null ? 'positive-value' : 'negative-value'}`}>
                {analysis.depletionAge === null ? 'なし' : `${analysis.depletionAge}歳`}
              </span>
            </div>
          </div>

          {!analysis.isHealthy && (
            <div className="hero-alert">
              <AlertTriangle size={16} />
              <span>
                {analysis.minusPeriods.map((p, i) => (
                  <span key={i}>{p.start}〜{p.end}歳{i < analysis.minusPeriods.length - 1 ? '、' : ''}</span>
                ))}
                に資産がマイナスになります。最大で <strong>▲{Math.abs(analysis.minAsset).toLocaleString()}万円</strong>（{analysis.minAssetAge}歳）。
              </span>
            </div>
          )}
        </div>
      )}

      <div className="card scenario-card">
        <div className="card-title">
          <Layers size={18} className="text-primary" />
          <h3>シナリオを比較</h3>
        </div>
        <p className="card-desc">今の条件に名前を付けて保存すると、グラフ上で比べられます（最大5つ）。</p>

        <form onSubmit={handleSave} className="scenario-save-form">
          <input
            type="text"
            className="text-input"
            placeholder="例：今のプラン / 車を買わない"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={20}
          />
          <button type="submit" className="btn btn-primary" disabled={scenarios.length >= 5}>
            <Plus size={16} /> 保存
          </button>
        </form>
        {scenarios.length >= 5 && <p className="field-note text-danger">シナリオは最大5つまでです。</p>}

        <div className="scenario-list">
          {scenarioStats.map(({ scenario, analysis: a }) => (
            <div key={scenario.id} className="scenario-item" style={{ borderLeftColor: scenario.color }}>
              <div className="scenario-item-head">
                <span className="scenario-name">
                  <span className="color-dot" style={{ backgroundColor: scenario.color }} />
                  {scenario.name}
                </span>
                <button className="row-del" onClick={() => onDeleteScenario(scenario.id)} aria-label="シナリオ削除"><Trash2 size={15} /></button>
              </div>
              {a && (
                <div className="scenario-metrics">
                  <span><span className="lbl">{a.finalAge}歳:</span> <span className={a.finalAsset >= 0 ? 'positive-value' : 'negative-value'}>{fmt(a.finalAsset)}万</span></span>
                  <span><span className="lbl">最小:</span> <span className={a.minAsset >= 0 ? 'positive-value' : 'negative-value'}>{fmt(a.minAsset)}万</span></span>
                </div>
              )}
            </div>
          ))}
          {scenarios.length === 0 && <p className="empty-cell">保存したシナリオはまだありません。</p>}
        </div>
      </div>
    </div>
  );
};
