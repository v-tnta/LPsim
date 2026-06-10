import React, { useState } from 'react';
import type { YearRow, Scenario } from '../domain/types';
import { AlertTriangle, Award, Landmark, Trash2, Plus, Calendar } from 'lucide-react';
import { simulate } from '../domain/simulation';

interface SummarySectionProps {
  scenarios: Scenario[];
  currentResults: YearRow[];
  onSaveScenario: (name: string) => void;
  onDeleteScenario: (id: string) => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  scenarios,
  currentResults,
  onSaveScenario,
  onDeleteScenario,
}) => {
  const [newScenarioName, setNewScenarioName] = useState('');

  // シミュレーション結果の分析を行う共通のヘルパー関数
  const analyzeResults = (results: YearRow[]) => {
    if (results.length === 0) return null;

    let minAsset = Infinity;
    let minAssetAge = -1;
    const minusPeriods: { start: number; end: number }[] = [];
    let inMinus = false;
    let currentStart = -1;

    results.forEach(row => {
      // 最小累計資産の検出
      if (row.cumulativeAsset < minAsset) {
        minAsset = row.cumulativeAsset;
        minAssetAge = row.age;
      }

      // マイナス期間の検出
      if (row.cumulativeAsset < 0) {
        if (!inMinus) {
          inMinus = true;
          currentStart = row.age;
        }
      } else {
        if (inMinus) {
          inMinus = false;
          minusPeriods.push({ start: currentStart, end: row.age - 1 });
        }
      }
    });

    if (inMinus) {
      minusPeriods.push({ start: currentStart, end: results[results.length - 1].age });
    }

    const finalRow = results[results.length - 1];

    return {
      minAsset,
      minAssetAge,
      minusPeriods,
      finalAsset: finalRow.cumulativeAsset,
      finalAge: finalRow.age,
    };
  };

  const analysis = analyzeResults(currentResults);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    console.log(`Save scenario requested: ${newScenarioName}`);
    onSaveScenario(newScenarioName.trim());
    setNewScenarioName('');
  };

  return (
    <div className="summary-section">
      {/* 1. 現在の分析アラート */}
      {analysis && (
        <div className="card analysis-card">
          <div className="card-title">
            <Calendar size={20} className="text-primary" />
            <h3>シミュレーション分析サマリー</h3>
          </div>

          <div className="analysis-grid">
            <div className="analysis-metric">
              <span className="metric-label">65歳時点の累計資産</span>
              <span className={`metric-value ${analysis.finalAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
                {analysis.finalAsset >= 0 ? '+' : ''}{analysis.finalAsset.toLocaleString()}万円
              </span>
            </div>

            <div className="analysis-metric">
              <span className="metric-label">一生の最低資産額</span>
              <span className={`metric-value ${analysis.minAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
                {analysis.minAsset.toLocaleString()}万円 ({analysis.minAssetAge}歳)
              </span>
            </div>
          </div>

          {analysis.minusPeriods.length > 0 ? (
            <div className="alert-box alert-danger">
              <AlertTriangle size={18} />
              <div>
                <strong>資産赤字警報: </strong>
                {analysis.minusPeriods.map((p, idx) => (
                  <span key={idx}>
                    {p.start}〜{p.end}歳（{p.end - p.start + 1}年間）
                    {idx < analysis.minusPeriods.length - 1 ? '、' : ''}
                  </span>
                ))}
                の期間、累計資産がマイナスになります。
                最大赤字額は <strong>▲{Math.abs(analysis.minAsset).toLocaleString()}万円</strong> ({analysis.minAssetAge}歳時点) です。
              </div>
            </div>
          ) : (
            <div className="alert-box alert-success">
              <Award size={18} />
              <div>
                <strong>健全な資金計画:</strong> シミュレーション期間を通じて累計資産がマイナスになる時期はありません。
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. シナリオの保存と一覧 */}
      <div className="card scenario-card">
        <div className="card-title">
          <Landmark size={20} className="text-primary" />
          <h3>シナリオ比較・保存</h3>
        </div>

        {/* 新規シナリオ保存フォーム */}
        <form onSubmit={handleSave} className="scenario-save-form">
          <input
            type="text"
            className="form-control"
            placeholder="現在の条件をシナリオ名で保存"
            value={newScenarioName}
            onChange={e => setNewScenarioName(e.target.value)}
            maxLength={20}
          />
          <button type="submit" className="btn btn-primary" disabled={scenarios.length >= 5}>
            <Plus size={16} /> 保存
          </button>
        </form>
        {scenarios.length >= 5 && (
          <p className="form-help text-danger">※ シナリオは最大5つまで保存可能です。不要なものを削除してください。</p>
        )}

        {/* 保存済みシナリオカードリスト */}
        <div className="scenario-list">
          {scenarios.map(sc => {
            // 各シナリオについて実際のシミュレーションを実行して指標を計算
            const scResults = simulate(sc.params);
            const scAnalysis = analyzeResults(scResults);

            return (
              <div key={sc.id} className="scenario-item-card" style={{ borderLeftColor: sc.color }}>
                <div className="scenario-item-header">
                  <div className="scenario-info">
                    <span className="color-badge" style={{ backgroundColor: sc.color }}></span>
                    <span className="scenario-name">{sc.name}</span>
                  </div>
                  <button 
                    className="btn-delete-scenario" 
                    onClick={() => onDeleteScenario(sc.id)}
                    title="シナリオ削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                {scAnalysis && (
                  <div className="scenario-metrics-mini">
                    <div>
                      <span className="lbl">65歳累計:</span>
                      <span className={`val font-semibold ${scAnalysis.finalAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
                        {scAnalysis.finalAsset.toLocaleString()}万円
                      </span>
                    </div>
                    <div>
                      <span className="lbl">最小資産:</span>
                      <span className={`val font-semibold ${scAnalysis.minAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
                        {scAnalysis.minAsset.toLocaleString()}万円 ({scAnalysis.minAssetAge}歳)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {scenarios.length === 0 && (
            <p className="no-data-text text-muted">保存された比較シナリオはありません。</p>
          )}
        </div>
      </div>
    </div>
  );
};
