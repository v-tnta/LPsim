import React, { useState } from 'react';
import { Download, Upload, RotateCcw, LineChart, MoreHorizontal, FileText } from 'lucide-react';

interface HeaderProps {
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onLoadSample: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onExportJSON, onImportJSON, onClear, onLoadSample }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="header-container">
      <div className="header-logo">
        <LineChart className="logo-icon" />
        <div className="header-title">
          <h1>ライフプラン</h1>
          <span className="header-subtitle">将来のお金シミュレーター</span>
        </div>
      </div>

      <div className="header-actions">
        <button className="btn btn-ghost btn-sample" onClick={onLoadSample}>
          <FileText size={16} />
          <span>記入例</span>
        </button>

        <div className="menu-wrap">
          <button
            className="btn btn-ghost"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={18} />
            <span className="menu-label">メニュー</span>
          </button>

          {menuOpen && (
            <>
              <div className="menu-overlay" onClick={close} />
              <div className="menu-dropdown" role="menu">
                <label className="menu-item" role="menuitem">
                  <Upload size={16} /> 設定を読み込む
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      onImportJSON(e);
                      close();
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                <button
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    onExportJSON();
                    close();
                  }}
                >
                  <Download size={16} /> 設定を保存する
                </button>
                <button
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    onLoadSample();
                    close();
                  }}
                >
                  <FileText size={16} /> 記入例を読み込む
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-item menu-item-danger"
                  role="menuitem"
                  onClick={() => {
                    onClear();
                    close();
                  }}
                >
                  <RotateCcw size={16} /> すべて消去
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
