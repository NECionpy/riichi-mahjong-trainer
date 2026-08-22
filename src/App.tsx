import { HashRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/Toast/ToastContext";
import Home from "./features/home/Home";
import PointCalc from "./features/pointCalc/PointCalc";
import Shanten from "./features/shanten/Shanten";
import Chinitsu from "./features/chinitsu/Chinitsu";
import "./App.less";
import LandscapeGuard from "./components/LandscapeGuard/LandscapeGuard";
import Machipai from "./features/machipai/Machipai";
import { useGameScale } from "./hooks/gameScale";
import AssetsLoader from "./components/AssetsLoader/AssetsLoader";

function App() {
  const scale = useGameScale();
  return (
    <LandscapeGuard>
      <AssetsLoader>
      <div
        className="app"
        style={{
          width: scale.originWidth,
          height: scale.originHeight,
          transform: `translate(-50%, -50%) scale(${scale.scale})`,
        }}
      >
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pointCalc" element={<PointCalc />} />
              <Route path="/shanten" element={<Shanten />} />
              <Route path="/chinitsu" element={<Chinitsu />} />
              <Route path="/machipai" element={<Machipai />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </div>
      </AssetsLoader>
    </LandscapeGuard>
  );
}

export default App;
