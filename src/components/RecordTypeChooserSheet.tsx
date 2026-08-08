import { ChefHat, ShoppingCart, Utensils } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export type RecordChoice = 'meal' | 'cooking' | 'purchase';

interface RecordTypeChooserSheetProps {
  onClose: () => void;
  onChoose: (choice: RecordChoice) => void;
  mealTrackingEnabled?: boolean;
}

const CHOICES: { choice: RecordChoice; label: string; icon: typeof Utensils }[] = [
  { choice: 'meal', label: '食事', icon: Utensils },
  { choice: 'cooking', label: '調理', icon: ChefHat },
  { choice: 'purchase', label: '買い物', icon: ShoppingCart },
];

export function RecordTypeChooserSheet({ onClose, onChoose, mealTrackingEnabled = true }: RecordTypeChooserSheetProps) {
  const choices = mealTrackingEnabled ? CHOICES : CHOICES.filter((c) => c.choice !== 'meal');
  return (
    <BottomSheet title="何を記録しますか？" onClose={onClose} variant="dialog">
      <div className="grid-2" style={{ gridTemplateColumns: choices.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr' }}>
        {choices.map(({ choice, label, icon: Icon }) => (
          <button
            key={choice}
            className="fab"
            style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)' }}
            onClick={() => onChoose(choice)}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
