import React, { useState } from 'react';
import type { YearRow } from '../domain/types';
import { FileDown, Table, ChevronDown } from 'lucide-react';

interface TableSectionProps {
  results: YearRow[];
  isInvestmentEnabled: boolean;
  isNisa: boolean;
  showNetWorth: boolean;
}

export const TableSection: React.FC<TableSectionProps> = ({ results, isInvestmentEnabled, isNisa, showNetWorth }) => {
  const [open, setOpen] = useState(false);

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const headers = [
      '年齢', '額面年収', '手取り年収', '配偶者収入', '退職金', '公的年金',
      '基礎生活費', '住居費', '教育費', '車関連費', '一時イベント',
      ...(isInvestmentEnabled ? ['想定運用益'] : []),
      '年間収支', '累計資産',
      ...(isInvestmentEnabled ? ['現金口座残高', isNisa ? 'NISA口座残高' : '特定口座残高'] : []),
      ...(showNetWorth ? ['住宅評価額', '純資産'] : []),
    ];
    const rows = results.map((row) => [
      row.age, row.salary, row.takeHome, row.spouseIncome, row.retirementPay, row.pensionIncome,
      row.basicLivingCost, row.housingCost, row.educationCost, row.carCost, row.eventCost,
      ...(isInvestmentEnabled ? [row.investmentYieldIncome] : []),
      row.annualBalance, row.cumulativeAsset,
      ...(isInvestmentEnabled ? [row.cumulativeCash, row.cumulativeInvestment] : []),
      ...(showNetWorth ? [row.homeValue, row.netWorth] : []),
    ]);
    const csv = '﻿' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifeplan_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card table-card">
      <div className="table-head">
        <button className="table-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Table size={18} className="text-primary" />
          <h3>年ごとの内訳</h3>
          <ChevronDown size={18} className={`table-chevron ${open ? 'open' : ''}`} />
        </button>
        <button className="btn btn-ghost" onClick={handleExportCSV} disabled={results.length === 0}>
          <FileDown size={16} /> CSV
        </button>
      </div>

      {open && (
        <>
          <p className="field-note table-scroll-hint">← 横にスクロールできます →</p>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-col">年齢</th>
                  <th>額面</th><th>手取り</th><th>配偶者</th><th>退職金</th><th>年金</th>
                  <th>生活費</th><th>住居費</th><th>教育費</th><th>車</th><th>イベント</th>
                  {isInvestmentEnabled && <th>運用益</th>}
                  <th>年間収支</th><th>累計資産</th>
                  {showNetWorth && <th>純資産</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => {
                  const negBal = row.annualBalance < 0;
                  const negAsset = row.cumulativeAsset < 0;
                  return (
                    <tr key={idx} className={`${negAsset ? 'row-neg' : ''} ${row.retirementPay > 0 ? 'row-retire' : ''}`}>
                      <td className="sticky-col font-semibold">{row.age}歳</td>
                      <td>{row.salary.toLocaleString()}</td>
                      <td>{row.takeHome.toLocaleString()}</td>
                      <td>{row.spouseIncome > 0 ? row.spouseIncome.toLocaleString() : '–'}</td>
                      <td>{row.retirementPay > 0 ? row.retirementPay.toLocaleString() : '–'}</td>
                      <td>{row.pensionIncome > 0 ? row.pensionIncome.toLocaleString() : '–'}</td>
                      <td>{row.basicLivingCost.toLocaleString()}</td>
                      <td>{row.housingCost.toLocaleString()}</td>
                      <td>{row.educationCost > 0 ? row.educationCost.toLocaleString() : '–'}</td>
                      <td>{row.carCost > 0 ? row.carCost.toLocaleString() : '–'}</td>
                      <td>{row.eventCost > 0 ? row.eventCost.toLocaleString() : '–'}</td>
                      {isInvestmentEnabled && (
                        <td className="positive-value">{row.investmentYieldIncome > 0 ? `+${row.investmentYieldIncome.toLocaleString()}` : '–'}</td>
                      )}
                      <td className={`font-semibold ${negBal ? 'negative-value' : 'positive-value'}`}>
                        {row.annualBalance > 0 ? '+' : ''}{row.annualBalance.toLocaleString()}
                      </td>
                      <td className={`font-semibold ${negAsset ? 'negative-value' : 'positive-value'}`}>
                        {row.cumulativeAsset.toLocaleString()}
                      </td>
                      {showNetWorth && (
                        <td className={`font-semibold ${row.netWorth < 0 ? 'negative-value' : 'positive-value'}`}>
                          {row.netWorth.toLocaleString()}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="table-unit-note">単位：万円</p>
        </>
      )}
    </div>
  );
};
