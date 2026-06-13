import React from 'react';
import type { SimulationAnalysis } from '../domain/simulation';
import { ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react';

interface MobileResultBarProps {
  analysis: SimulationAnalysis | null;
  onSeeResult: () => void;
}

/**
 * スマホで「条件を入力」タブを表示している間も、画面下部に固定で
 * 現在の試算結果サマリーを出して、入力しながら結果が見えるようにします。
 */
export const MobileResultBar: React.FC<MobileResultBarProps> = ({ analysis, onSeeResult }) => {
  if (!analysis) return null;

  const healthy = analysis.isHealthy;

  return (
    <button className="mobile-result-bar" onClick={onSeeResult}>
      <div className="mrb-left">
        {healthy ? (
          <TrendingUp size={20} className="mrb-icon mrb-ok" />
        ) : (
          <AlertTriangle size={20} className="mrb-icon mrb-warn" />
        )}
        <div className="mrb-text">
          <span className="mrb-label">{analysis.finalAge}歳時点の資産</span>
          <span className={`mrb-value ${analysis.finalAsset >= 0 ? 'positive-value' : 'negative-value'}`}>
            {analysis.finalAsset >= 0 ? '' : '▲'}
            {Math.abs(analysis.finalAsset).toLocaleString()}万円
          </span>
        </div>
      </div>
      <div className="mrb-cta">
        結果を見る <ChevronRight size={16} />
      </div>
    </button>
  );
};
