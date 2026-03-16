import React from 'react';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <div className="nav-item active">
        <span className="nav-icon">🏠</span>
      </div>
      <div className="nav-item">
        <span className="nav-icon">📊</span>
      </div>
      <div className="nav-add-btn">
        <span className="add-icon">+</span>
      </div>
      <div className="nav-item">
        <span className="nav-icon">👛</span>
      </div>
      <div className="nav-item">
        <span className="nav-icon">👤</span>
      </div>
    </nav>
  );
};

export default BottomNav;
