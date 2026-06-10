import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p className="privacy-badge">
          <ShieldCheck size={16} />
          完全クライアントサイド: 入力された金融データは外部サーバーに送信されず、ブラウザ内でのみ処理されます。
        </p>
        <p className="disclaimer-text">
          免責事項: 本ツールは簡易的なシミュレーション結果を提供するものであり、税・社会保険料の正確な計算、あるいは専門的な金融・ライフプランニングのアドバイスを行うものではありません。実際の計画の際には、ファイナンシャルプランナーや税理士等の専門家にご相談ください。
        </p>
        <p className="copyright-text">
          &copy; {new Date().getFullYear()} ライフプラン・シミュレーター. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};
