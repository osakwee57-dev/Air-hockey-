
import React from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <GameCanvas />
    </div>
  );
};

export default App;
