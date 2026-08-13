import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  ChevronRight,
  ChefHat,
  Leaf,
  ShoppingCart,
  Coins,
  Recycle,
  Info,
  Settings as SettingsIcon,
  Star,
  StickyNote,
} from 'lucide-react';
import { Header } from '../components/Header';
import { listRecipes } from '../repositories/recipeRepo';
import { listMemos } from '../repositories/memoRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { copyToClipboard } from '../utils/clipboard';
import { buildAiConsultText, type AiConsultTopic } from '../services/aiSummary';
import type { Memo, Recipe } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  主食: '🍚',
  主菜: '🍗',
  副菜: '🥗',
  おやつ: '🍰',
  その他: '🍽️',
};

const AI_BUTTONS: { topic: AiConsultTopic; label: string; icon: typeof ChefHat }[] = [
  { topic: 'menu', label: '献立の相談', icon: ChefHat },
  { topic: 'nutrition', label: '栄養バランス', icon: Leaf },
  { topic: 'shopping', label: '買い物の相談', icon: ShoppingCart },
  { topic: 'saving', label: '節約の相談', icon: Coins },
  { topic: 'useup', label: '食材を使い切る相談', icon: Recycle },
];

export function More() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    listRecipes()
      .then((r) => setRecipes(r.slice(0, 3)))
      .catch((e) => showToast(toUserMessage(e, 'レシピの読み込みに失敗しました')));
    listMemos()
      .then((m) => setMemos(m.slice(0, 3)))
      .catch((e) => showToast(toUserMessage(e, 'メモの読み込みに失敗しました')));
  }, [version, showToast]);

  async function handleCopy(topic: AiConsultTopic) {
    if (copying) return;
    setCopying(true);
    try {
      const text = await buildAiConsultText(topic);
      await copyToClipboard(text);
      showToast('コピーしました。AIに貼り付けて相談できます');
    } catch (e) {
      showToast(toUserMessage(e, 'コピーに失敗しました'));
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <Header icon={<MoreHorizontal size={20} />} title="その他" />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              📝 メモ
            </div>
            <button className="btn-ghost btn btn-sm" onClick={() => navigate('/memos')}>
              すべて見る <ChevronRight size={14} />
            </button>
          </div>
          {memos.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>まだメモがありません</p>
          ) : (
            memos.map((m) => (
              <button
                key={m.id}
                className="list-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                onClick={() => navigate('/memos')}
              >
                <div className="recipe-thumb">
                  <StickyNote size={18} />
                </div>
                <div className="row-main">
                  <div className="row-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.body}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            ))
          )}
        </div>

        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              📖 マイレシピ
            </div>
            <button className="btn-ghost btn btn-sm" onClick={() => navigate('/recipes')}>
              すべて見る <ChevronRight size={14} />
            </button>
          </div>
          {recipes.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>まだレシピがありません</p>
          ) : (
            recipes.map((r) => (
              <button
                key={r.id}
                className="list-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                onClick={() => navigate(`/recipes/${r.id}`)}
              >
                <div className="recipe-thumb">{CATEGORY_EMOJI[r.category ?? 'その他']}</div>
                <div className="row-main">
                  <div className="row-title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r.name}
                    {r.favorite && <Star size={12} fill="var(--color-primary)" color="var(--color-primary)" />}
                  </div>
                  <div className="row-sub">{r.ingredients ?? ''}</div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            ))
          )}
        </div>

        <div className="card mb-16">
          <div className="section-title">🤖 AI相談用コピー</div>
          <p className="text-muted mb-16" style={{ fontSize: 13 }}>
            ChatGPTなどのAIに相談するときに使える情報をコピーします。
          </p>
          <div className="grid-2">
            {AI_BUTTONS.map(({ topic, label, icon: Icon }) => (
              <button
                key={topic}
                className="fab"
                style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)' }}
                onClick={() => handleCopy(topic)}
                disabled={copying}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
          <button className="btn btn-outline mt-8" onClick={() => handleCopy('all')} disabled={copying}>
            すべての情報をコピー
          </button>
        </div>

        <div className="card">
          <button className="link-row" style={{ width: '100%', border: 'none', background: 'none', font: 'inherit', borderBottom: '1px solid var(--color-border)' }} onClick={() => navigate('/settings')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SettingsIcon size={16} /> 設定
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
          <button className="link-row" style={{ width: '100%', border: 'none', background: 'none', font: 'inherit' }} onClick={() => navigate('/about')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} /> このアプリについて
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        </div>
      </div>
    </>
  );
}
