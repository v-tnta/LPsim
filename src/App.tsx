import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { SummarySection } from './components/SummarySection';
import { ChartSection } from './components/ChartSection';
import { TableSection } from './components/TableSection';
import { Footer } from './components/Footer';
import { MobileResultBar } from './components/MobileResultBar';
import type { SimulationParams, Scenario } from './domain/types';
import { DEFAULT_PARAMS, SAMPLE_PARAMS, PRESET_SCENARIOS } from './domain/presets';
import { simulate, analyzeResults } from './domain/simulation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SlidersHorizontal, BarChart3 } from 'lucide-react';

type MobileView = 'input' | 'result';

function App() {
  // パラメータとシナリオを localStorage で永続化
  const [params, setParams] = useLocalStorage<SimulationParams>('lifeplan-params', DEFAULT_PARAMS);
  const [scenarios, setScenarios] = useLocalStorage<Scenario[]>('lifeplan-scenarios', PRESET_SCENARIOS);

  // スマホ用: 「入力」と「結果」の表示切り替え
  const [mobileView, setMobileView] = useState<MobileView>('input');

  // 計算は params / scenarios が変わったときだけ実行 (useMemo でメモ化)
  const currentResults = useMemo(() => simulate(params), [params]);
  const analysis = useMemo(() => analyzeResults(currentResults), [currentResults]);

  const scenarioStats = useMemo(
    () =>
      scenarios.map((sc) => {
        const rows = simulate(sc.params);
        return { scenario: sc, rows, analysis: analyzeResults(rows) };
      }),
    [scenarios]
  );

  // グラフ用に各シナリオの累計資産を年齢でマージ
  const mergedChartData = useMemo(
    () =>
      currentResults.map((row) => {
        const dataPoint: Record<string, number> = { age: row.age, 現在のプラン: row.cumulativeAsset };
        scenarioStats.forEach(({ scenario, rows }) => {
          const match = rows.find((r) => r.age === row.age);
          if (match) dataPoint[scenario.name] = match.cumulativeAsset;
        });
        return dataPoint;
      }),
    [currentResults, scenarioStats]
  );

  const handleChangeParams = (newParams: SimulationParams) => setParams(newParams);

  // シナリオの保存 (最大5つ)
  const handleSaveScenario = (name: string) => {
    if (scenarios.length >= 5) return;
    const colors = ['#6366f1', '#f43f5e', '#eab308', '#10b981', '#a855f7'];
    const dashes = ['solid', 'dashed', 'dotted', 'dashed', 'dotted'];
    const newSc: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      params: JSON.parse(JSON.stringify(params)),
      color: colors[scenarios.length % colors.length],
      dashStyle: dashes[scenarios.length % dashes.length],
    };
    setScenarios([...scenarios, newSc]);
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios(scenarios.filter((sc) => sc.id !== id));
  };

  // 入力を空(初期状態)に戻す
  const handleClear = () => {
    if (window.confirm('入力した条件をすべて消去して、空の状態に戻しますか？')) {
      setParams(DEFAULT_PARAMS);
      setScenarios(PRESET_SCENARIOS);
    }
  };

  // 記入例(サンプル)を読み込む
  const handleLoadSample = () => {
    if (window.confirm('記入例を読み込みます。現在の入力は上書きされます。よろしいですか？')) {
      setParams(JSON.parse(JSON.stringify(SAMPLE_PARAMS)));
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as SimulationParams;
        if (typeof imported.startAge !== 'number' || typeof imported.endAge !== 'number') {
          throw new Error('無効な設定ファイルフォーマットです。');
        }
        setParams(imported);
        alert('設定ファイルを読み込みました。');
      } catch {
        alert('設定ファイルの読み込みに失敗しました。正しいJSONファイルかご確認ください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(params, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifeplan_settings_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onClear={handleClear}
        onLoadSample={handleLoadSample}
      />

      {/* スマホ用: 入力 / 結果 切り替えタブ */}
      <nav className="mobile-tabs" role="tablist" aria-label="表示切り替え">
        <button
          role="tab"
          aria-selected={mobileView === 'input'}
          className={`mobile-tab ${mobileView === 'input' ? 'active' : ''}`}
          onClick={() => setMobileView('input')}
        >
          <SlidersHorizontal size={18} /> 条件を入力
        </button>
        <button
          role="tab"
          aria-selected={mobileView === 'result'}
          className={`mobile-tab ${mobileView === 'result' ? 'active' : ''}`}
          onClick={() => setMobileView('result')}
        >
          <BarChart3 size={18} /> 結果を見る
        </button>
      </nav>

      <main className="container">
        <div className="dashboard-layout">
          {/* 左: 条件入力 */}
          <div className={`pane pane-input ${mobileView === 'input' ? 'mobile-active' : ''}`}>
            <ParameterPanel
              params={params}
              onChangeParams={handleChangeParams}
              onLoadSample={handleLoadSample}
            />
            {/* スマホでは入力中も結果のサマリーを下部に常時表示 */}
            <MobileResultBar analysis={analysis} onSeeResult={() => setMobileView('result')} />
          </div>

          {/* 右: 結果 */}
          <div className={`pane pane-result ${mobileView === 'result' ? 'mobile-active' : ''}`}>
            <SummarySection
              analysis={analysis}
              scenarios={scenarios}
              scenarioStats={scenarioStats}
              onSaveScenario={handleSaveScenario}
              onDeleteScenario={handleDeleteScenario}
            />
            <ChartSection currentResults={currentResults} scenarios={scenarios} mergedChartData={mergedChartData} />
            <TableSection results={currentResults} isInvestmentEnabled={params.isInvestmentEnabled} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default App;
