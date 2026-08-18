import React from "react";
import "./Header.less";
import { NavLink } from "react-router-dom";

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
  backable?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  actions = null,
  backable = false,
}) => {
  return (
    <header className="app-header">
      <div className="app-title">
        {backable ? (
          <NavLink
            to="/"
            end          
          >
            <img src="./images/back.png"  />
          </NavLink>
        ) : null}
        <span>{title}</span>
      </div>
      <div className="actions">{actions}</div>
    </header>
  );
};

export default Header;
