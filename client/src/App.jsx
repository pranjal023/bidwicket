import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Results from './pages/Results';
import Screen from './pages/Screen';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:code" element={<Room />} />
      <Route path="/room/:code/results" element={<Results />} />
      <Route path="/room/:code/screen" element={<Screen />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
