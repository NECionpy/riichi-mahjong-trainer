import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import { ToastProvider } from "./components/Toast/ToastContext";
import PointCalc from "./features/pointCalc/PointCalc";
import Shanten from "./features/shanten/Shanten";
import Chinitsu from "./features/chinitsu/Chinitsu";
import "./App.css";

function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <div className="app">
          <header className="app-header">
            <div className="header-inner">
              <div className="app-brand">
                <span className="app-logo">🀄</span>
                <h1>立直麻将训练器</h1>
              </div>
              <nav className="app-nav">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                >
                  <span className="nav-icon">🎯</span>
                  <span className="nav-text">报点模拟器</span>
                </NavLink>
                <NavLink
                  to="/shanten"
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                >
                  <span className="nav-icon">🔢</span>
                  <span className="nav-text">向听数模拟器</span>
                </NavLink>
                <NavLink
                  to="/chinitsu"
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                >
                  <span className="nav-icon">🎴</span>
                  <span className="nav-text">清一色听牌模拟器</span>
                </NavLink>
              </nav>
            </div>
          </header>

          <main className="app-main">
            <Routes>
              <Route path="/" element={<PointCalc />} />
              <Route path="/shanten" element={<Shanten />} />
              <Route path="/chinitsu" element={<Chinitsu />} />
            </Routes>
          </main>

          <footer className="app-footer">
            <p>立直麻将训练器 — 练习报点、向听数判断与清一色听牌</p>
          </footer>
        </div>
      </HashRouter>
    </ToastProvider>
  );
}

export default App;
