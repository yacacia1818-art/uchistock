import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '../components/Header';

export function About() {
  const navigate = useNavigate();
  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} style={{ padding: 0 }} aria-label="戻る">
            <ChevronLeft size={22} />
          </button>
        }
        title="このアプリについて"
      />
      <div className="page-content">
        <div className="card mb-16">
          <div className="section-title">🍙 メシログとは</div>
          <p style={{ fontSize: 14, lineHeight: 1.8 }}>
            食費・食材・食事を、できるだけ少ない入力で管理する個人用アプリです。
            細かい家計簿ではなく、「今月あといくら使えるか」「家に何があるか」「最近何を食べたか」
            「次に何を買う必要があるか」を簡単に把握できることを目指しています。
          </p>
        </div>
        <div className="card mb-16">
          <div className="section-title">使い方のコツ</div>
          <ul style={{ fontSize: 14, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
            <li>買い物は合計金額を入れるだけで記録できます</li>
            <li>食事は在庫から食べたものを選ぶだけでOKです</li>
            <li>数量が分からない食材は「ざっくり残量」で管理できます</li>
            <li>その他タブからAI相談用のテキストをコピーできます</li>
          </ul>
        </div>
        <div className="card">
          <div className="section-title">データについて</div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            すべてのデータはこの端末のブラウザ内（IndexedDB）に保存されます。外部サーバーへは送信されません。
          </p>
        </div>
      </div>
    </>
  );
}
