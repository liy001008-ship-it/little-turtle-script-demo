import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';

// Both hosting targets use the same story, interface and saved-game rules.
createRoot(document.getElementById('root')!).render(<Home />);
