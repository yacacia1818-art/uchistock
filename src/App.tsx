import { HashRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ToastProvider } from './components/ToastProvider';
import { Home } from './pages/Home';
import { Ingredients } from './pages/Ingredients';
import { Shopping } from './pages/Shopping';
import { Records } from './pages/Records';
import { CalendarPage } from './pages/CalendarPage';
import { More } from './pages/More';
import { Settings } from './pages/Settings';
import { Recipes } from './pages/Recipes';
import { RecipeDetail } from './pages/RecipeDetail';
import { Memos } from './pages/Memos';
import { About } from './pages/About';

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/records" element={<Records />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/more" element={<More />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/memos" element={<Memos />} />
            <Route path="/about" element={<About />} />
          </Routes>
          <BottomNav />
        </div>
      </HashRouter>
    </ToastProvider>
  );
}
