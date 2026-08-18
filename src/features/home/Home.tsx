import React from "react";
import { NavLink } from "react-router-dom";
import "./Home.less";

interface HomeProps {}

const Home: React.FC<HomeProps> = ({}) => {
  return (
    <>
      <div className="app-home-header">
        <img src="./images/title.png" alt="麻将技能训练器" draggable={false} className="title" />        
      </div>
      <div className="app-home">
        <NavLink to="/pointCalc">
          <img src="./images/pointCalc.png" draggable={false} alt="报点训练" />
        </NavLink>
        <NavLink to="/shanten">
          <img src="./images/shanten.png" draggable={false} alt="向听数训练" />
        </NavLink>
        <NavLink to="/chinitsu">
          <img src="./images/chinitsu.png" draggable={false} alt="清一色听牌训练" />
        </NavLink>
        <NavLink to="/machipai">
          <img src="./images/machipai.png" draggable={false} alt="待摸牌训练" />
        </NavLink>
      </div>
    </>
  );
};

export default Home;
