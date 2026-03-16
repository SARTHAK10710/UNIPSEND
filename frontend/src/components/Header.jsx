import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="main-header">
      <div className="profile-wrapper">
        <img 
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
          alt="Profile" 
          className="profile-img"
        />
      </div>
      <h2 className="brand-name">Unispend</h2>
      <div className="notification-btn">
        <div className="notification-icon">🔔</div>
        <span className="dot"></span>
      </div>
    </header>
  );
};

export default Header;
