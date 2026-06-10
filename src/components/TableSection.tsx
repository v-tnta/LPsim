import React from 'react';
import type { YearRow } from '../domain/types';
import { FileDown, Table } from 'lucide-react';

interface TableSectionProps {
  results: YearRow[];
  isInvestmentEnabled: boolean;
}

export const TableSection: React.FC<TableSectionProps> = ({
  results,
  isInvestmentEnabled,
}) => {
  // CSVエクスポートロジック
  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    console.log('Exporting CSV...');

    // ヘッダー行
    const headers = [
      '年齢', '額面年収', '手取り年収', '配偶者収入', '退職金', 
      '基礎生活費', '住居費', '教育費', '車関連費', '一時イベント',
      ...(isInvestmentEnabled ? ['想定運用益'] : []),
      '年間収支', '累計資産',
      ...(isInvestmentEnabled ? ['うち現金', 'うち運用資産'] : [])
    ];

    // データ行
    const rows = results.map(row => [
      row.age,
      row.salary,
      row.takeHome,
      row.spouseIncome,
      row.retirementPay,
      row.basicLivingCost,
      row.housingCost,
      row.educationCost,
      row.carCost,
      row.eventCost,
      ...(isInvestmentEnabled ? [row.investmentYieldIncome] : []),
      row.annualBalance,
      row.cumulativeAsset,
      ...(isInvestmentEnabled ? [row.cumulativeCash, row.cumulativeInvestment] : [])
    ]);

    // CSV文字列構築 (BOM付き UTF-8 で Excel文字化け回避)
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // ダウンロード処理
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lifeplan_simulation_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card table-section-card">
      <div className="table-header-row">
        <div className="table-header-title">
          <Table size={20} className="text-primary" />
          <h3>詳細シミュレーション年表</h3>
        </div>
        <button className="btn" onClick={handleExportCSV} disabled={results.length === 0}>
          <FileDown size={16} /> CSVエクスポート
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>年齢</th>
              <th>額面 (万)</th>
              <th>手取り (万)</th>
              <th>配偶者 (万)</th>
              <th>退職金 (万)</th>
              <th>基礎生活 (万)</th>
              <th>住居費 (万)</th>
              <th>教育費 (万)</th>
              <th>車関連 (万)</th>
              <th>一時イベ (万)</th>
              {isInvestmentEnabled && <th>運用益 (万)</th>}
              <th>年間収支 (万)</th>
              <th>累計資産 (万)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, idx) => {
              const isNegativeBalance = row.annualBalance < 0;
              const isNegativeAsset = row.cumulativeAsset < 0;

              return (
                <tr 
                  key={idx} 
                  className={`
                    ${isNegativeAsset ? 'row-negative-asset' : ''}
                    ${row.retirementPay > 0 ? 'row-retirement' : ''}
                  `}
                >
                  <td className="font-semibold">{row.age}歳</td>
                  <td>{row.salary.toLocaleString()}</td>
                  <td>{row.takeHome.toLocaleString()}</td>
                  <td>{row.spouseIncome > 0 ? `${row.spouseIncome.toLocaleString()}` : '-'}</td>
                  <td>{row.retirementPay > 0 ? `${row.retirementPay.toLocaleString()}` : '-'}</td>
                  <td>{row.basicLivingCost.toLocaleString()}</td>
                  <td>{row.housingCost.toLocaleString()}</td>
                  <td>{row.educationCost > 0 ? `${row.educationCost.toLocaleString()}` : '-'}</td>
                  <td>{row.carCost > 0 ? `${row.carCost.toLocaleString()}` : '-'}</td>
                  <td>{row.eventCost > 0 ? `${row.eventCost.toLocaleString()}` : '-'}</td>
                  {isInvestmentEnabled && (
                    <td className="positive-value">{row.investmentYieldIncome > 0 ? `+${row.investmentYieldIncome.toLocaleString()}` : '-'}</td>
                  )}
                  <td className={`font-semibold ${isNegativeBalance ? 'negative-value' : 'positive-value'}`}>
                    {row.annualBalance > 0 ? '+' : ''}{row.annualBalance.toLocaleString()}
                  </td>
                  <td className={`font-semibold ${isNegativeAsset ? 'negative-value' : 'positive-value'}`}>
                    {row.cumulativeAsset.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td colSpan={isInvestmentEnabled ? 13 : 12} className="no-data-cell">
                  データがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
