import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { SummarySection } from './components/SummarySection';
import { ChartSection } from './components/ChartSection';
import { TableSection } from './components/TableSection';
import { Footer } from './components/Footer';
import type { SimulationParams, Scenario } from './domain/types';
import { DEFAULT_PARAMS, PRESET_SCENARIOS } from './domain/presets';
import { simulate } from './domain/simulation';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  // 1. パラメータとシナリオの状態を useLocalStorage で永続化管理します
  const [params, setParams] = useLocalStorage<SimulationParams>('lifeplan-params', DEFAULT_PARAMS);
  const [scenarios, setScenarios] = useLocalStorage<Scenario[]>('lifeplan-scenarios', PRESET_SCENARIOS);

  // 2. 本番の計算エンジン simulate(params) を実行して結果を得ます
  // params が変更されるたびにリアクティブに再計算されます
  console.log('[App] Recalculating current results...');
  const currentResults = simulate(params);

  // 3. 各シナリオについてそれぞれシミュレーションを実行し、グラフ用にマージします
  const scenarioResults = scenarios.map(sc => {
    console.log(`[App] Pre-calculating scenario: "${sc.name}"`);
    return {
      name: sc.name,
      rows: simulate(sc.params),
    };
  });

  const mergedChartData = currentResults.map(row => {
    const dataPoint: any = { age: row.age, '現在のプラン': row.cumulativeAsset };
    
    // 各シナリオから該当年齢の累計資産を取得してマージ
    scenarioResults.forEach(sr => {
      const match = sr.rows.find(r => r.age === row.age);
      if (match) {
        dataPoint[sr.name] = match.cumulativeAsset;
      }
    });

    return dataPoint;
  });

  // パラメータ変更ハンドラ
  const handleChangeParams = (newParams: SimulationParams) => {
    setParams(newParams);
  };

  // シナリオの保存 (最大5つ)
  const handleSaveScenario = (name: string) => {
    if (scenarios.length >= 5) return;
    
    const colors = ['#6366f1', '#f43f5e', '#eab308', '#10b981', '#a855f7'];
    const dashes = ['solid', 'dashed', 'dotted', 'dashed', 'dotted'];
    const nextColor = colors[scenarios.length % colors.length];
    const nextDash = dashes[scenarios.length % dashes.length];

    const newSc: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      params: JSON.parse(JSON.stringify(params)), // ディープコピー
      color: nextColor,
      dashStyle: nextDash,
    };

    console.log('[App] Adding new scenario:', newSc.name);
    setScenarios([...scenarios, newSc]);
  };

  // シナリオの削除
  const handleDeleteScenario = (id: string) => {
    console.log('[App] Deleting scenario:', id);
    setScenarios(scenarios.filter(sc => sc.id !== id));
  };

  // 設定のリセット
  const handleReset = () => {
    if (window.confirm('すべての設定を初期状態（デフォルト値）にリセットしますか？')) {
      console.log('[App] Resetting to defaults.');
      setParams(DEFAULT_PARAMS);
      setScenarios(PRESET_SCENARIOS);
    }
  };

  // 設定ファイル (JSON) のインポート
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = JSON.parse(text) as SimulationParams;
        
        // 簡易的なパラメータバリデーション (開始年齢があるかチェック)
        if (typeof imported.startAge !== 'number' || typeof imported.endAge !== 'number') {
          throw new Error('無効な設定ファイルフォーマットです。');
        }

        console.log('[App] Successfully imported parameters.');
        setParams(imported);
        alert('設定ファイルを読み込みました。');
      } catch (error) {
        console.error('[App] JSON Import Error:', error);
        alert('設定ファイルの読み込みに失敗しました。正しいJSONファイルかご確認ください。');
      }
    };
    reader.readAsText(file);
  };

  // 設定ファイル (JSON) のエクスポート
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(params, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lifeplan_settings_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('[App] Exported parameters to JSON.');
    } catch (error) {
      console.error('[App] JSON Export Error:', error);
      alert('設定ファイルのエクスポートに失敗しました。');
    }
  };

  return (
    <>
      {/* ヘッダーセクション (インポート・エクスポート・リセットと連動) */}
      <Header 
        onExportJSON={handleExportJSON} 
        onImportJSON={handleImportJSON} 
        onReset={handleReset} 
      />
      
      {/* メインダッシュボードコンテナ */}
      <main className="container">
        <div className="dashboard-layout">
          {/* 左側：条件設定パネル */}
          <ParameterPanel 
            params={params} 
            onChangeParams={handleChangeParams} 
          />

          {/* 右側：シミュレーション結果エリア */}
          <div className="main-content-area">
            {/* サマリーカード */}
            <SummarySection 
              scenarios={scenarios} 
              currentResults={currentResults} 
              onSaveScenario={handleSaveScenario}
              onDeleteScenario={handleDeleteScenario}
            />

            {/* グラフ表示セクション */}
            <ChartSection 
              currentResults={currentResults} 
              scenarios={scenarios} 
              mergedChartData={mergedChartData}
            />

            {/* 年表テーブルセクション */}
            <TableSection 
              results={currentResults} 
              isInvestmentEnabled={params.isInvestmentEnabled} 
            />
          </div>
        </div>
      </main>

      {/* フッター */}
      <Footer />
    </>
  );
}

export default App;
