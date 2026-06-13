import React, { useState } from 'react';
import type { SimulationParams, IncomeAnchor } from '../domain/types';
import {
  User, TrendingUp, Home, Users, Wallet, Car, PiggyBank,
  Plus, Trash2, ChevronDown, FileText,
} from 'lucide-react';

interface ParameterPanelProps {
  params: SimulationParams;
  onChangeParams: (newParams: SimulationParams) => void;
  onLoadSample: () => void;
}

/** 万円(年額) → 「月◯万円」の補助表示 */
const monthlyHint = (annual: number) => `月 ${(annual / 12).toFixed(1)} 万円`;

/* ---------- 小さな再利用パーツ ---------- */

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="field">
    <label className="field-label">
      {label}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
    {children}
  </div>
);

const NumInput: React.FC<{
  value: number | '';
  onChange: (v: number) => void;
  unit?: string;
  placeholder?: string;
  min?: number;
}> = ({ value, onChange, unit, placeholder, min }) => (
  <div className="num-input">
    <input
      type="number"
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    {unit && <span className="num-unit">{unit}</span>}
  </div>
);

const Slider: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = ({ value, onChange, min, max, step, unit }) => (
  <div className="slider-row">
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    <div className="num-input num-input-sm">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {unit && <span className="num-unit">{unit}</span>}
    </div>
  </div>
);

const Section: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  active: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, icon, title, summary, active, onToggle, children }) => (
  <div className={`accordion-item ${active ? 'open' : ''}`}>
    <button className="accordion-trigger" onClick={() => onToggle(id)} aria-expanded={active}>
      <span className="trigger-icon">{icon}</span>
      <span className="trigger-main">
        <span className="trigger-title">{title}</span>
        <span className="trigger-summary">{summary}</span>
      </span>
      <ChevronDown size={18} className="trigger-chevron" />
    </button>
    <div className="accordion-content">{children}</div>
  </div>
);

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ params, onChangeParams, onLoadSample }) => {
  const [activeSection, setActiveSection] = useState<string | null>('basic');
  const [showIncomeAdvanced, setShowIncomeAdvanced] = useState(false);

  const toggleSection = (section: string) =>
    setActiveSection((prev) => (prev === section ? null : section));

  const update = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) =>
    onChangeParams({ ...params, [key]: value });

  const updateMany = (patch: Partial<SimulationParams>) => onChangeParams({ ...params, ...patch });

  /* 年収カーブ */
  const updateIncomeCurve = (index: number, field: keyof IncomeAnchor, value: number) => {
    const next = [...params.incomeCurve];
    next[index] = { ...next[index], [field]: value };
    next.sort((a, b) => a.age - b.age);
    update('incomeCurve', next);
  };
  const addIncomeRow = () => {
    const last = params.incomeCurve[params.incomeCurve.length - 1];
    update('incomeCurve', [...params.incomeCurve, { age: (last?.age ?? params.startAge) + 5, salary: last?.salary ?? 400 }]);
  };
  const removeIncomeRow = (index: number) => {
    if (params.incomeCurve.length <= 1) return;
    update('incomeCurve', params.incomeCurve.filter((_, i) => i !== index));
  };

  /* 住宅: 物件価格 − 頭金 = 借入額 を自動計算 */
  const setPropertyPrice = (price: number) => updateMany({ propertyPrice: price, loanAmount: Math.max(0, price - params.downPayment) });
  const setDownPayment = (down: number) => updateMany({ downPayment: down, loanAmount: Math.max(0, params.propertyPrice - down) });

  /* 公的年金のざっくり概算（老齢基礎78万 + 厚生年金の報酬比例ぶん） */
  const estimatePension = () => {
    const incomes = params.incomeCurve.map((c) => Math.min(c.salary, params.salaryCap)).filter((s) => s > 0);
    const avg = incomes.length ? incomes.reduce((a, b) => a + b, 0) / incomes.length : 0;
    const years = Math.max(0, (params.workEndAge ?? params.endAge) - params.startAge);
    const estimate = Math.round(78 + avg * 0.0055 * years);
    updateMany({ pensionStartAge: params.pensionStartAge ?? 65, pensionAnnual: estimate });
  };

  /* セクションの一行サマリー */
  const incomeFirst = params.incomeCurve[0]?.salary ?? 0;
  const incomeLast = params.incomeCurve[params.incomeCurve.length - 1]?.salary ?? 0;
  const summaries: Record<string, string> = {
    basic: `${params.startAge}歳 → ${params.endAge}歳・物価+${params.inflationRate}%`,
    income:
      (incomeFirst === incomeLast ? `年収 ${incomeFirst}万円` : `年収 ${incomeFirst}〜${incomeLast}万円`) +
      (params.pensionStartAge !== null ? `・年金${params.pensionAnnual}万` : ''),
    housing:
      params.buyAge !== null
        ? `${params.buyAge}歳で ${params.propertyPrice.toLocaleString()}万円購入`
        : `賃貸 ${monthlyHint(params.rentBeforeBuy)}`,
    family: [
      params.marriageAge !== null ? `${params.marriageAge}歳で結婚` : '独身',
      params.childrenBirthAges.length > 0 ? `子ども${params.childrenBirthAges.length}人` : '',
    ].filter(Boolean).join('・'),
    living: monthlyHint(params.basicLivingCost),
    spending: [
      params.carPurchases.length > 0 ? `車${params.carPurchases.length}回` : '',
      params.tempEvents.length > 0 ? `イベント${params.tempEvents.length}件` : '',
    ].filter(Boolean).join('・') || 'なし',
    investment: params.isInvestmentEnabled ? `利回り ${params.investmentYield}%` : 'なし',
  };

  return (
    <div className="parameter-panel">
      <div className="panel-intro">
        <p>あなたの状況を入力すると、将来の資産が自動で計算されます。</p>
        <button className="btn btn-ghost btn-block" onClick={onLoadSample}>
          <FileText size={16} /> 記入例を読み込んで試す
        </button>
      </div>

      {/* 基本 */}
      <Section id="basic" icon={<User size={18} />} title="基本" summary={summaries.basic} active={activeSection === 'basic'} onToggle={toggleSection}>
        <div className="field-row">
          <Field label="現在の年齢">
            <NumInput value={params.startAge} onChange={(v) => update('startAge', v)} unit="歳" />
          </Field>
          <Field label="何歳まで試算">
            <NumInput value={params.endAge} onChange={(v) => update('endAge', v)} unit="歳" />
          </Field>
        </div>
        <Field label="今ある貯蓄・資産" hint="預貯金などの合計">
          <NumInput value={params.initialAsset} onChange={(v) => update('initialAsset', v)} unit="万円" />
        </Field>
        <Field label={`物価上昇率（インフレ）：${params.inflationRate}%`} hint="0%なら「今の価値」で表示">
          <Slider value={params.inflationRate} onChange={(v) => update('inflationRate', v)} min={0} max={5} step={0.1} unit="%" />
        </Field>
        <p className="field-note">
          物価上昇は生活費・家賃・教育費・維持費と年金（今の価値で入力）に反映されます。給与カーブ・退職金・車購入・イベントは入力した金額のまま使います。
        </p>
      </Section>

      {/* 収入・手取り */}
      <Section id="income" icon={<TrendingUp size={18} />} title="収入・手取り" summary={summaries.income} active={activeSection === 'income'} onToggle={toggleSection}>
        <Field label="手取りの計算方法">
          <div className="seg-control">
            <button className={params.taxMode === 'rate' ? 'active' : ''} onClick={() => update('taxMode', 'rate')}>
              かんたん（割合）
            </button>
            <button className={params.taxMode === 'anchor' ? 'active' : ''} onClick={() => update('taxMode', 'anchor')}>
              年収別
            </button>
          </div>
        </Field>

        {params.taxMode === 'rate' ? (
          <Field label={`手取りの割合：${params.taxRate}%`} hint="額面のうち手取りになる割合">
            <Slider value={params.taxRate} onChange={(v) => update('taxRate', v)} min={50} max={95} step={1} unit="%" />
          </Field>
        ) : (
          <div className="mini-table-block">
            <div className="mini-table-title">年収ごとの手取り（万円）</div>
            <table className="mini-table">
              <thead><tr><th>額面</th><th>手取り</th></tr></thead>
              <tbody>
                {params.taxAnchors.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.salary.toLocaleString()}</td>
                    <td>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={a.takeHome}
                        onChange={(e) => {
                          const next = [...params.taxAnchors];
                          next[idx] = { ...next[idx], takeHome: Number(e.target.value) };
                          update('taxAnchors', next);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mini-table-block">
          <div className="mini-table-title-row">
            <span>年収の推移</span>
            <button className="icon-btn" onClick={addIncomeRow} aria-label="年収の行を追加"><Plus size={16} /></button>
          </div>
          <table className="mini-table">
            <thead><tr><th>年齢</th><th>額面年収(万円)</th><th aria-label="操作" /></tr></thead>
            <tbody>
              {params.incomeCurve.map((c, idx) => (
                <tr key={idx}>
                  <td><input type="number" inputMode="numeric" value={c.age} onChange={(e) => updateIncomeCurve(idx, 'age', Number(e.target.value))} /></td>
                  <td><input type="number" inputMode="numeric" value={c.salary} onChange={(e) => updateIncomeCurve(idx, 'salary', Number(e.target.value))} /></td>
                  <td>
                    <button className="row-del" onClick={() => removeIncomeRow(idx)} disabled={params.incomeCurve.length <= 1} aria-label="削除">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="field-note">入力した年齢の間は自動で補間されます。</p>
        </div>

        <div className="field-row">
          <Field label="配偶者の収入 開始年齢" hint="なければ空欄">
            <NumInput
              value={params.spouseIncomeStartAge ?? ''}
              onChange={(v) => update('spouseIncomeStartAge', v || null)}
              unit="歳"
              placeholder="なし"
            />
          </Field>
          <Field label="配偶者の年収">
            <NumInput value={params.spouseIncomeAmount} onChange={(v) => update('spouseIncomeAmount', v)} unit="万円" />
          </Field>
        </div>

        <div className="field-row">
          <Field label="退職金 受取年齢" hint="なければ空欄">
            <NumInput value={params.retirementAge ?? ''} onChange={(v) => update('retirementAge', v || null)} unit="歳" placeholder="なし" />
          </Field>
          <Field label="退職金">
            <NumInput value={params.retirementAmount} onChange={(v) => update('retirementAmount', v)} unit="万円" />
          </Field>
        </div>

        <Field label="定年（給与の最終年齢）" hint="これ以降は給与なし。なければ空欄">
          <NumInput value={params.workEndAge ?? ''} onChange={(v) => update('workEndAge', v || null)} unit="歳" placeholder="止めない" />
        </Field>

        <div className="mini-table-block">
          <div className="mini-table-title-row">
            <span>公的年金（老後の収入）</span>
            <button className="text-link" onClick={estimatePension}>年収から概算</button>
          </div>
          <div className="field-row">
            <Field label="受給開始年齢" hint="なければ空欄">
              <NumInput value={params.pensionStartAge ?? ''} onChange={(v) => update('pensionStartAge', v || null)} unit="歳" placeholder="なし" />
            </Field>
            <Field label="年金 年額" hint="世帯合計の想定">
              <NumInput value={params.pensionAnnual} onChange={(v) => update('pensionAnnual', v)} unit="万円" />
            </Field>
          </div>
        </div>

        <button className="advanced-toggle" onClick={() => setShowIncomeAdvanced((v) => !v)}>
          詳細設定 {showIncomeAdvanced ? '−' : '+'}
        </button>
        {showIncomeAdvanced && (
          <div className="advanced-block">
            <Field label={`年収の上限（頭打ち）：${params.salaryCap}万円`}>
              <Slider value={params.salaryCap} onChange={(v) => update('salaryCap', v)} min={300} max={3000} step={50} unit="万" />
            </Field>
            <label className="check-row">
              <input type="checkbox" checked={params.isFirstYearNoResidentTax} onChange={(e) => update('isFirstYearNoResidentTax', e.target.checked)} />
              <span>初年度は住民税なし（新卒1年目など）</span>
            </label>
          </div>
        )}
      </Section>

      {/* 住まい */}
      <Section id="housing" icon={<Home size={18} />} title="住まい" summary={summaries.housing} active={activeSection === 'housing'} onToggle={toggleSection}>
        <Field label="住まいのプラン">
          <div className="seg-control">
            <button className={params.buyAge === null ? 'active' : ''} onClick={() => update('buyAge', null)}>賃貸のまま</button>
            <button className={params.buyAge !== null ? 'active' : ''} onClick={() => update('buyAge', params.buyAge ?? Math.max(params.startAge, 32))}>購入する</button>
          </div>
        </Field>

        <Field label={params.buyAge !== null ? '購入までの家賃' : '家賃'} hint={monthlyHint(params.rentBeforeBuy)}>
          <NumInput value={params.rentBeforeBuy} onChange={(v) => update('rentBeforeBuy', v)} unit="万円/年" />
        </Field>

        {params.buyAge !== null && (
          <>
            <div className="field-row">
              <Field label="購入する年齢">
                <NumInput value={params.buyAge} onChange={(v) => update('buyAge', v)} unit="歳" />
              </Field>
              <Field label="物件価格">
                <NumInput value={params.propertyPrice} onChange={setPropertyPrice} unit="万円" />
              </Field>
            </div>
            <div className="field-row">
              <Field label="頭金・諸費用">
                <NumInput value={params.downPayment} onChange={setDownPayment} unit="万円" />
              </Field>
              <Field label="借入額" hint="物件価格−頭金（自動）">
                <NumInput value={params.loanAmount} onChange={(v) => update('loanAmount', v)} unit="万円" />
              </Field>
            </div>
            <Field label={`住宅ローン金利：${params.interestRate}%`}>
              <Slider value={params.interestRate} onChange={(v) => update('interestRate', v)} min={0.2} max={5} step={0.1} unit="%" />
            </Field>
            <div className="field-row">
              <Field label="返済年数">
                <NumInput value={params.loanTerm} onChange={(v) => update('loanTerm', v)} unit="年" />
              </Field>
              <Field label="維持費・固定資産税" hint="年額">
                <NumInput value={params.maintenanceCost} onChange={(v) => update('maintenanceCost', v)} unit="万円/年" />
              </Field>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={params.countHomeAsAsset} onChange={(e) => update('countHomeAsAsset', e.target.checked)} />
              <span>住宅を純資産に含める（賃貸との比較が公平に）</span>
            </label>
            {params.countHomeAsAsset && (
              <Field label={`評価額の減価率：${params.homeDepreciationRate}%/年`} hint="築年数による値下がりの想定">
                <Slider value={params.homeDepreciationRate} onChange={(v) => update('homeDepreciationRate', v)} min={0} max={5} step={0.5} unit="%" />
              </Field>
            )}
          </>
        )}
      </Section>

      {/* 家族構成 */}
      <Section id="family" icon={<Users size={18} />} title="家族構成" summary={summaries.family} active={activeSection === 'family'} onToggle={toggleSection}>
        <Field label="結婚する年齢" hint="しない / 済みなら空欄">
          <NumInput value={params.marriageAge ?? ''} onChange={(v) => update('marriageAge', v || null)} unit="歳" placeholder="独身のまま" />
        </Field>
        {params.marriageAge !== null && (
          <Field label="結婚後の生活費の増加" hint={`${monthlyHint(params.spouseLivingCost)} 増`}>
            <NumInput value={params.spouseLivingCost} onChange={(v) => update('spouseLivingCost', v)} unit="万円/年" />
          </Field>
        )}

        <Field label="子どもが生まれる年齢" hint="あなたの年齢。カンマ区切り 例: 32, 35">
          <input
            type="text"
            className="text-input"
            value={params.childrenBirthAges.join(', ')}
            placeholder="子どもがいなければ空欄"
            onChange={(e) =>
              update(
                'childrenBirthAges',
                e.target.value.split(',').map((s) => s.trim()).filter((s) => s !== '' && !isNaN(Number(s))).map(Number)
              )
            }
          />
        </Field>

        {params.childrenBirthAges.length > 0 && (
          <>
            <Field label="子ども1人あたりの生活費" hint={`${monthlyHint(params.childLivingCost)}（食費・衣類など）`}>
              <NumInput value={params.childLivingCost} onChange={(v) => update('childLivingCost', v)} unit="万円/年" />
            </Field>
            <div className="mini-table-block">
              <div className="mini-table-title">教育費の目安（子ども1人・年額）</div>
              <table className="mini-table">
                <thead><tr><th>子の年齢</th><th>年額(万円)</th></tr></thead>
                <tbody>
                  {params.educationCostBand.map((b, idx) => (
                    <tr key={idx}>
                      <td>{b.ageStart}〜{b.ageEnd}歳</td>
                      <td>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={b.cost}
                          onChange={(e) => {
                            const next = [...params.educationCostBand];
                            next[idx] = { ...next[idx], cost: Number(e.target.value) };
                            update('educationCostBand', next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* 生活費 */}
      <Section id="living" icon={<Wallet size={18} />} title="生活費" summary={summaries.living} active={activeSection === 'living'} onToggle={toggleSection}>
        <Field label="基礎生活費（家賃以外）" hint={`${monthlyHint(params.basicLivingCost)}・食費/光熱費/通信など`}>
          <NumInput value={params.basicLivingCost} onChange={(v) => update('basicLivingCost', v)} unit="万円/年" />
        </Field>

        <div className="mini-table-block">
          <div className="mini-table-title-row">
            <span>期間限定の上乗せ</span>
            <button
              className="text-link"
              onClick={() =>
                update('tempExtraLivingCost', params.tempExtraLivingCost ? null : { startAge: params.startAge, endAge: params.startAge + 2, amount: 20 })
              }
            >
              {params.tempExtraLivingCost ? '削除' : '追加'}
            </button>
          </div>
          {params.tempExtraLivingCost && (
            <div className="range-row">
              <NumInput value={params.tempExtraLivingCost.startAge} onChange={(v) => update('tempExtraLivingCost', { ...params.tempExtraLivingCost!, startAge: v })} unit="歳" />
              <span>〜</span>
              <NumInput value={params.tempExtraLivingCost.endAge} onChange={(v) => update('tempExtraLivingCost', { ...params.tempExtraLivingCost!, endAge: v })} unit="歳" />
              <NumInput value={params.tempExtraLivingCost.amount} onChange={(v) => update('tempExtraLivingCost', { ...params.tempExtraLivingCost!, amount: v })} unit="万/年" />
            </div>
          )}
        </div>
      </Section>

      {/* 大きな支出 */}
      <Section id="spending" icon={<Car size={18} />} title="大きな支出" summary={summaries.spending} active={activeSection === 'spending'} onToggle={toggleSection}>
        <div className="mini-table-block">
          <div className="mini-table-title-row">
            <span>車の購入</span>
            <button className="icon-btn" onClick={() => update('carPurchases', [...params.carPurchases, { age: params.startAge + 5, price: 300 }].sort((a, b) => a.age - b.age))} aria-label="車を追加"><Plus size={16} /></button>
          </div>
          <table className="mini-table">
            <thead><tr><th>年齢</th><th>価格(万円)</th><th aria-label="操作" /></tr></thead>
            <tbody>
              {params.carPurchases.map((p, idx) => (
                <tr key={idx}>
                  <td><input type="number" inputMode="numeric" value={p.age} onChange={(e) => { const n = [...params.carPurchases]; n[idx] = { ...n[idx], age: Number(e.target.value) }; n.sort((a, b) => a.age - b.age); update('carPurchases', n); }} /></td>
                  <td><input type="number" inputMode="numeric" value={p.price} onChange={(e) => { const n = [...params.carPurchases]; n[idx] = { ...n[idx], price: Number(e.target.value) }; update('carPurchases', n); }} /></td>
                  <td><button className="row-del" onClick={() => update('carPurchases', params.carPurchases.filter((_, i) => i !== idx))} aria-label="削除"><Trash2 size={15} /></button></td>
                </tr>
              ))}
              {params.carPurchases.length === 0 && <tr><td colSpan={3} className="empty-cell">車の予定はありません</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mini-table-block">
          <div className="mini-table-title-row">
            <span>一時的な支出（結婚式・旅行など）</span>
            <button className="icon-btn" onClick={() => update('tempEvents', [...params.tempEvents, { id: `event-${Date.now()}`, age: params.startAge + 3, name: 'イベント', amount: 50 }].sort((a, b) => a.age - b.age))} aria-label="イベントを追加"><Plus size={16} /></button>
          </div>
          <table className="mini-table">
            <thead><tr><th>年齢</th><th>内容</th><th>金額(万)</th><th aria-label="操作" /></tr></thead>
            <tbody>
              {params.tempEvents.map((ev, idx) => (
                <tr key={ev.id || idx}>
                  <td><input type="number" inputMode="numeric" value={ev.age} onChange={(e) => { const n = [...params.tempEvents]; n[idx] = { ...n[idx], age: Number(e.target.value) }; n.sort((a, b) => a.age - b.age); update('tempEvents', n); }} /></td>
                  <td><input type="text" value={ev.name} onChange={(e) => { const n = [...params.tempEvents]; n[idx] = { ...n[idx], name: e.target.value }; update('tempEvents', n); }} /></td>
                  <td><input type="number" inputMode="numeric" value={ev.amount} onChange={(e) => { const n = [...params.tempEvents]; n[idx] = { ...n[idx], amount: Number(e.target.value) }; update('tempEvents', n); }} /></td>
                  <td><button className="row-del" onClick={() => update('tempEvents', params.tempEvents.filter((_, i) => i !== idx))} aria-label="削除"><Trash2 size={15} /></button></td>
                </tr>
              ))}
              {params.tempEvents.length === 0 && <tr><td colSpan={4} className="empty-cell">予定はありません</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 資産運用 */}
      <Section id="investment" icon={<PiggyBank size={18} />} title="資産運用" summary={summaries.investment} active={activeSection === 'investment'} onToggle={toggleSection}>
        <label className="check-row">
          <input type="checkbox" checked={params.isInvestmentEnabled} onChange={(e) => update('isInvestmentEnabled', e.target.checked)} />
          <span>余ったお金を投資に回してシミュレーションする</span>
        </label>
        {params.isInvestmentEnabled && (
          <>
            <Field label={`投資に回す割合：${params.investmentRate}%`} hint="毎年の黒字のうち">
              <Slider value={params.investmentRate} onChange={(v) => update('investmentRate', v)} min={0} max={100} step={5} unit="%" />
            </Field>
            <Field label={`想定利回り：${params.investmentYield}%`} hint="年率（実質）">
              <Slider value={params.investmentYield} onChange={(v) => update('investmentYield', v)} min={-2} max={10} step={0.5} unit="%" />
            </Field>
          </>
        )}
      </Section>
    </div>
  );
};
