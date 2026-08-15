import { ShoppingCart } from 'lucide-react';
import { Header } from '../components/Header';
import { ShoppingMemoPanel } from '../components/ShoppingMemoPanel';

export function Shopping() {
  return (
    <>
      <Header icon={<ShoppingCart size={20} />} title="買い物メモ" />
      <div className="page-content">
        <ShoppingMemoPanel />
      </div>
    </>
  );
}
