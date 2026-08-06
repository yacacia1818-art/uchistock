type Listener = () => void;

const listeners = new Set<Listener>();

// データ変更をアプリ全体へ通知する軽量イベントバス
export function notifyDataChanged(): void {
  listeners.forEach((l) => l());
}

export function subscribeDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
