import React from 'react';
import { Download, Upload, RotateCcw, TrendingUp } from 'lucide-react';

interface HeaderProps {
  onExportJSON?: () => void;
  onImportJSON?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExportJSON = () => console.log('Export JSON clicked'),
  onImportJSON = () => console.log('Import JSON clicked'),
  onReset = () => console.log('Reset clicked'),
}) => {
  return (
    <header className="header-container">
      <div className="header-logo">
        <TrendingUp className="logo-icon" />
        <h1>ライフプラン・シミュレーター</h1>
      </div>
      
      <div className="header-actions">
        {/* ファイルインポート用の隠しinput */}
        <label className="btn btn-secondary">
          <Upload size={16} />
          設定読込 (JSON)
          <input
            type="file"
            accept=".json"
            onChange={onImportJSON}
            style={{ display: 'none' }}
          />
        </label>

        <button className="btn" onClick={onExportJSON}>
          <Download size={16} />
          設定保存 (JSON)
        </button>

        <button className="btn btn-danger" onClick={onReset}>
          <RotateCcw size={16} />
          リセット
        </button>
      </div>
    </header>
  );
};
