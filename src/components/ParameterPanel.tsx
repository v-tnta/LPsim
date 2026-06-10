import React, { useState } from 'react';
import type { SimulationParams, IncomeAnchor } from '../domain/types';
import { 
  User, TrendingUp, Home, Heart, Baby, Car, Plus, Trash2, Settings
} from 'lucide-react';

interface ParameterPanelProps {
  params: SimulationParams;
  onChangeParams: (newParams: SimulationParams) => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onChangeParams,
}) => {
  // アコーディオンの開閉状態 (排他制御のため、現在開いているセクションのIDを1つだけ持ちます)
  const [activeSection, setActiveSection] = useState<string | null>('basic');

  const toggleSection = (section: string) => {
    setActiveSection(prev => {
      const next = prev === section ? null : section;
      console.log(`Toggle section: "${prev}" -> "${next}"`);
      return next;
    });
  };

  // パラメータを更新する汎用関数
  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    console.log(`Update param: ${key} =`, value);
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  // 年収カーブの値を更新
  const updateIncomeCurve = (index: number, field: keyof IncomeAnchor, value: number) => {
    const newCurve = [...params.incomeCurve];
    newCurve[index] = { ...newCurve[index], [field]: value };
    // 年齢でソートしておく（線形補間をやりやすくするため）
    newCurve.sort((a, b) => a.age - b.age);
    updateParam('incomeCurve', newCurve);
  };

  // 年収カーブの行追加
  const addIncomeCurveRow = () => {
    const lastAge = params.incomeCurve[params.incomeCurve.length - 1]?.age || 23;
    const lastSalary = params.incomeCurve[params.incomeCurve.length - 1]?.salary || 450;
    const newCurve = [...params.incomeCurve, { age: lastAge + 2, salary: lastSalary }];
    updateParam('incomeCurve', newCurve);
  };

  // 年収カーブの行削除
  const removeIncomeCurveRow = (index: number) => {
    if (params.incomeCurve.length <= 1) return; // 最低1行は残す
    const newCurve = params.incomeCurve.filter((_, i) => i !== index);
    updateParam('incomeCurve', newCurve);
  };

  return (
    <div className="parameter-panel">
      <div className="panel-header">
        <Settings size={20} />
        <h2>シミュレーション条件</h2>
      </div>

      {/* 1. 基本設定 */}
      <div className={`accordion-item ${activeSection === 'basic' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('basic')}>
          <span className="trigger-title"><User size={18} /> 基本設定</span>
        </button>
        <div className="accordion-content">
          <div className="form-row">
            <div className="form-group col">
              <label className="form-label">開始年齢（本人）</label>
              <input 
                type="number" 
                className="form-control" 
                value={params.startAge} 
                onChange={e => updateParam('startAge', Number(e.target.value))} 
              />
            </div>
            <div className="form-group col">
              <label className="form-label">終了年齢</label>
              <input 
                type="number" 
                className="form-control" 
                value={params.endAge} 
                onChange={e => updateParam('endAge', Number(e.target.value))} 
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">初期資産（万円）</label>
            <input 
              type="number" 
              className="form-control" 
              value={params.initialAsset} 
              onChange={e => updateParam('initialAsset', Number(e.target.value))} 
            />
          </div>
        </div>
      </div>

      {/* 2. 収入設定 */}
      <div className={`accordion-item ${activeSection === 'income' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('income')}>
          <span className="trigger-title"><TrendingUp size={18} /> 収入・手取り</span>
        </button>
        <div className="accordion-content">
          <div className="form-group">
            <label className="form-label">年収上限（頭打ち額）: {params.salaryCap}万円</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="600" 
                max="1500" 
                step="50"
                value={params.salaryCap} 
                onChange={e => updateParam('salaryCap', Number(e.target.value))} 
              />
              <input 
                type="number" 
                className="form-control short" 
                value={params.salaryCap} 
                onChange={e => updateParam('salaryCap', Number(e.target.value))} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">手取り計算モード</label>
            <div className="radio-group">
              <label>
                <input 
                  type="radio" 
                  name="taxMode" 
                  checked={params.taxMode === 'anchor'} 
                  onChange={() => updateParam('taxMode', 'anchor')} 
                /> アンカー補間
              </label>
              <label>
                <input 
                  type="radio" 
                  name="taxMode" 
                  checked={params.taxMode === 'rate'} 
                  onChange={() => updateParam('taxMode', 'rate')} 
                /> 一律比率
              </label>
            </div>
          </div>

          {params.taxMode === 'rate' ? (
            <div className="form-group">
              <label className="form-label">一律手取り率 (%)</label>
              <input 
                type="number" 
                className="form-control" 
                value={params.taxRate} 
                onChange={e => updateParam('taxRate', Number(e.target.value))} 
              />
            </div>
          ) : null}

          <div className="form-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={params.isFirstYearNoResidentTax} 
                onChange={e => updateParam('isFirstYearNoResidentTax', e.target.checked)} 
              /> 初年度は住民税なし (手取り364万に差替)
            </label>
          </div>

          <div className="table-input-section">
            <div className="section-subtitle-row">
              <span>年収推移カーブ</span>
              <button className="btn-icon-add" onClick={addIncomeCurveRow}><Plus size={14} /></button>
            </div>
            <table className="table-mini">
              <thead>
                <tr>
                  <th>年齢</th>
                  <th>額面 (万円)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {params.incomeCurve.map((curve, idx) => (
                  <tr key={idx}>
                    <td>
                      <input 
                        type="number" 
                        value={curve.age} 
                        onChange={e => updateIncomeCurve(idx, 'age', Number(e.target.value))} 
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={curve.salary} 
                        onChange={e => updateIncomeCurve(idx, 'salary', Number(e.target.value))} 
                      />
                    </td>
                    <td>
                      <button 
                        className="btn-delete" 
                        onClick={() => removeIncomeCurveRow(idx)}
                        disabled={params.incomeCurve.length <= 1}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr className="divider-mini" />

          {/* 配偶者収入 */}
          <div className="form-row">
            <div className="form-group col">
              <label className="form-label">配偶者収入 開始年齢</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="なし"
                value={params.spouseIncomeStartAge ?? ''} 
                onChange={e => updateParam('spouseIncomeStartAge', e.target.value ? Number(e.target.value) : null)} 
              />
            </div>
            <div className="form-group col">
              <label className="form-label">配偶者収入 (年額万)</label>
              <input 
                type="number" 
                className="form-control" 
                value={params.spouseIncomeAmount} 
                onChange={e => updateParam('spouseIncomeAmount', Number(e.target.value))} 
              />
            </div>
          </div>

          {/* 退職金 */}
          <div className="form-row">
            <div className="form-group col">
              <label className="form-label">退職金 受取年齢</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="なし"
                value={params.retirementAge ?? ''} 
                onChange={e => updateParam('retirementAge', e.target.value ? Number(e.target.value) : null)} 
              />
            </div>
            <div className="form-group col">
              <label className="form-label">退職金 金額 (万円)</label>
              <input 
                type="number" 
                className="form-control" 
                value={params.retirementAmount} 
                onChange={e => updateParam('retirementAmount', Number(e.target.value))} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 住宅設定 */}
      <div className={`accordion-item ${activeSection === 'housing' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('housing')}>
          <span className="trigger-title"><Home size={18} /> 住宅（マイホーム）</span>
        </button>
        <div className="accordion-content">
          <div className="form-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={params.buyAge !== null} 
                onChange={e => updateParam('buyAge', e.target.checked ? 27 : null)} 
              /> 住宅を購入する
            </label>
          </div>

          {params.buyAge !== null && (
            <>
              <div className="form-row">
                <div className="form-group col">
                  <label className="form-label">購入年齢</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={params.buyAge} 
                    onChange={e => updateParam('buyAge', Number(e.target.value))} 
                  />
                </div>
                <div className="form-group col">
                  <label className="form-label">物件価格 (万円)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={params.propertyPrice} 
                    onChange={e => updateParam('propertyPrice', Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col">
                  <label className="form-label">頭金・諸費用 (万円)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={params.downPayment} 
                    onChange={e => updateParam('downPayment', Number(e.target.value))} 
                  />
                </div>
                <div className="form-group col">
                  <label className="form-label">借入額 (万円)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={params.loanAmount} 
                    onChange={e => updateParam('loanAmount', Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">金利 (年率%): {params.interestRate}%</label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    min="0.3" 
                    max="5.0" 
                    step="0.1"
                    value={params.interestRate} 
                    onChange={e => updateParam('interestRate', Number(e.target.value))} 
                  />
                  <input 
                    type="number" 
                    className="form-control short" 
                    value={params.interestRate} 
                    onChange={e => updateParam('interestRate', Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col">
                  <label className="form-label">返済年数 (年)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={params.loanTerm} 
                    onChange={e => updateParam('loanTerm', Number(e.target.value))} 
                  />
                </div>
                <div className="form-group col">
                  <label className="form-label">維持費・固資産税 (年額万)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={params.maintenanceCost} 
                    onChange={e => updateParam('maintenanceCost', Number(e.target.value))} 
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">購入前の家賃（年額万円）</label>
            <input 
              type="number" 
              className="form-control" 
              value={params.rentBeforeBuy} 
              onChange={e => updateParam('rentBeforeBuy', Number(e.target.value))} 
            />
          </div>
        </div>
      </div>

      {/* 4. 生活費設定 */}
      <div className={`accordion-item ${activeSection === 'living' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('living')}>
          <span className="trigger-title"><Heart size={18} /> 生活費</span>
        </button>
        <div className="accordion-content">
          <div className="form-group">
            <label className="form-label">独身基礎生活費（家賃除・年額万円）</label>
            <input 
              type="number" 
              className="form-control" 
              value={params.basicLivingCost} 
              onChange={e => updateParam('basicLivingCost', Number(e.target.value))} 
            />
          </div>

          <div className="form-row">
            <div className="form-group col">
              <label className="form-label">結婚年齢</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="なし"
                value={params.marriageAge ?? ''} 
                onChange={e => updateParam('marriageAge', e.target.value ? Number(e.target.value) : null)} 
              />
            </div>
            <div className="form-group col">
              <label className="form-label">配偶者加算 (年額万円)</label>
              <input 
                type="number" 
                className="form-control" 
                value={params.spouseLivingCost} 
                onChange={e => updateParam('spouseLivingCost', Number(e.target.value))} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">子ども世帯スケール加算（1人あたり年額万）</label>
            <input 
              type="number" 
              className="form-control" 
              value={params.childLivingCost} 
              onChange={e => updateParam('childLivingCost', Number(e.target.value))} 
            />
          </div>

          <div className="table-input-section">
            <div className="section-subtitle-row">
              <span>期間限定上乗せ (年金追納など)</span>
              <button 
                className="btn-text-link"
                onClick={() => {
                  if (params.tempExtraLivingCost) {
                    updateParam('tempExtraLivingCost', null);
                  } else {
                    updateParam('tempExtraLivingCost', { startAge: 23, endAge: 25, amount: 20 });
                  }
                }}
              >
                {params.tempExtraLivingCost ? '削除' : '追加'}
              </button>
            </div>
            {params.tempExtraLivingCost && (
              <div className="form-row-mini">
                <input 
                  type="number" 
                  placeholder="開始" 
                  value={params.tempExtraLivingCost.startAge} 
                  onChange={e => updateParam('tempExtraLivingCost', {
                    ...params.tempExtraLivingCost!,
                    startAge: Number(e.target.value)
                  })}
                />
                <span>〜</span>
                <input 
                  type="number" 
                  placeholder="終了" 
                  value={params.tempExtraLivingCost.endAge} 
                  onChange={e => updateParam('tempExtraLivingCost', {
                    ...params.tempExtraLivingCost!,
                    endAge: Number(e.target.value)
                  })}
                />
                <span>歳:</span>
                <input 
                  type="number" 
                  placeholder="金額" 
                  value={params.tempExtraLivingCost.amount} 
                  onChange={e => updateParam('tempExtraLivingCost', {
                    ...params.tempExtraLivingCost!,
                    amount: Number(e.target.value)
                  })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. 子ども・教育費設定 */}
      <div className={`accordion-item ${activeSection === 'children' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('children')}>
          <span className="trigger-title"><Baby size={18} /> 子ども・教育費</span>
        </button>
        <div className="accordion-content">
          <div className="form-group">
            <label className="form-label">出生時の親年齢（カンマ区切り、例: 29, 33）</label>
            <input 
              type="text" 
              className="form-control" 
              value={params.childrenBirthAges.join(', ')} 
              onChange={e => {
                const ages = e.target.value.split(',')
                  .map(s => s.trim())
                  .filter(s => s !== '' && !isNaN(Number(s)))
                  .map(Number);
                updateParam('childrenBirthAges', ages);
              }} 
            />
          </div>

          <div className="table-input-section">
            <div className="section-subtitle-row">
              <span>教育費バンド（子ども年齢→年額万）</span>
            </div>
            <table className="table-mini">
              <thead>
                <tr>
                  <th>年齢範囲</th>
                  <th>年額 (万円)</th>
                </tr>
              </thead>
              <tbody>
                {params.educationCostBand.map((band, idx) => (
                  <tr key={idx}>
                    <td>{band.ageStart}〜{band.ageEnd}歳</td>
                    <td>
                      <input 
                        type="number" 
                        value={band.cost} 
                        onChange={e => {
                          const newBands = [...params.educationCostBand];
                          newBands[idx] = { ...newBands[idx], cost: Number(e.target.value) };
                          updateParam('educationCostBand', newBands);
                        }} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. 車・イベント設定 */}
      <div className={`accordion-item ${activeSection === 'carEvent' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('carEvent')}>
          <span className="trigger-title"><Car size={18} /> 車・一時イベント</span>
        </button>
        <div className="accordion-content">
          <div className="table-input-section">
            <div className="section-subtitle-row">
              <span>車の購入イベント</span>
              <button 
                className="btn-icon-add" 
                onClick={() => {
                  const newPurchases = [...params.carPurchases, { age: 40, price: 300 }];
                  newPurchases.sort((a, b) => a.age - b.age);
                  updateParam('carPurchases', newPurchases);
                }}
              >
                <Plus size={14} />
              </button>
            </div>
            <table className="table-mini">
              <thead>
                <tr>
                  <th>親年齢</th>
                  <th>価格 (万円)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {params.carPurchases.map((purchase, idx) => (
                  <tr key={idx}>
                    <td>
                      <input 
                        type="number" 
                        value={purchase.age} 
                        onChange={e => {
                          const newP = [...params.carPurchases];
                          newP[idx] = { ...newP[idx], age: Number(e.target.value) };
                          newP.sort((a, b) => a.age - b.age);
                          updateParam('carPurchases', newP);
                        }} 
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={purchase.price} 
                        onChange={e => {
                          const newP = [...params.carPurchases];
                          newP[idx] = { ...newP[idx], price: Number(e.target.value) };
                          updateParam('carPurchases', newP);
                        }} 
                      />
                    </td>
                    <td>
                      <button 
                        className="btn-delete" 
                        onClick={() => {
                          const newP = params.carPurchases.filter((_, i) => i !== idx);
                          updateParam('carPurchases', newP);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr className="divider-mini" />

          {/* 一時イベント */}
          <div className="table-input-section">
            <div className="section-subtitle-row">
              <span>一時イベント</span>
              <button 
                className="btn-icon-add" 
                onClick={() => {
                  const newEvents = [...params.tempEvents, { 
                    id: `event-${Date.now()}`, 
                    age: 30, 
                    name: '旅行など', 
                    amount: 50 
                  }];
                  newEvents.sort((a, b) => a.age - b.age);
                  updateParam('tempEvents', newEvents);
                }}
              >
                <Plus size={14} />
              </button>
            </div>
            <table className="table-mini">
              <thead>
                <tr>
                  <th>年齢</th>
                  <th>名称</th>
                  <th>金額 (万)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {params.tempEvents.map((event, idx) => (
                  <tr key={event.id || idx}>
                    <td>
                      <input 
                        type="number" 
                        style={{ width: '45px' }}
                        value={event.age} 
                        onChange={e => {
                          const newE = [...params.tempEvents];
                          newE[idx] = { ...newE[idx], age: Number(e.target.value) };
                          newE.sort((a, b) => a.age - b.age);
                          updateParam('tempEvents', newE);
                        }} 
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        style={{ width: '80px' }}
                        value={event.name} 
                        onChange={e => {
                          const newE = [...params.tempEvents];
                          newE[idx] = { ...newE[idx], name: e.target.value };
                          updateParam('tempEvents', newE);
                        }} 
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        style={{ width: '50px' }}
                        value={event.amount} 
                        onChange={e => {
                          const newE = [...params.tempEvents];
                          newE[idx] = { ...newE[idx], amount: Number(e.target.value) };
                          updateParam('tempEvents', newE);
                        }} 
                      />
                    </td>
                    <td>
                      <button 
                        className="btn-delete" 
                        onClick={() => {
                          const newE = params.tempEvents.filter((_, i) => i !== idx);
                          updateParam('tempEvents', newE);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. 資産運用設定 */}
      <div className={`accordion-item ${activeSection === 'investment' ? 'open' : ''}`}>
        <button className="accordion-trigger" onClick={() => toggleSection('investment')}>
          <span className="trigger-title"><TrendingUp size={18} /> 資産運用 (オプション)</span>
        </button>
        <div className="accordion-content">
          <div className="form-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={params.isInvestmentEnabled} 
                onChange={e => updateParam('isInvestmentEnabled', e.target.checked)} 
              /> 資産運用シミュレーションを有効にする
            </label>
          </div>

          {params.isInvestmentEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">投資に回す割合: {params.investmentRate}%</label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={params.investmentRate} 
                    onChange={e => updateParam('investmentRate', Number(e.target.value))} 
                  />
                  <input 
                    type="number" 
                    className="form-control short" 
                    value={params.investmentRate} 
                    onChange={e => updateParam('investmentRate', Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">想定利回り (年率%): {params.investmentYield}%</label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    min="-2.0" 
                    max="10.0" 
                    step="0.5"
                    value={params.investmentYield} 
                    onChange={e => updateParam('investmentYield', Number(e.target.value))} 
                  />
                  <input 
                    type="number" 
                    className="form-control short" 
                    value={params.investmentYield} 
                    onChange={e => updateParam('investmentYield', Number(e.target.value))} 
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
