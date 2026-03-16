import React from 'react';
import './KPICard.css';

const KPICard = ({ title, value, subValue, icon, color, progress }) => {
  return (
    <div className={`kpi-card glass-card color-${color}`}>
      <div className="kpi-header">
        <span className="kpi-icon-bg">{icon}</span>
        <span className="kpi-title">{title}</span>
      </div>
      <div className="kpi-body">
        <h3 className="kpi-value">{value}</h3>
        {progress ? (
          <div className="kpi-progress-container">
            <div className="kpi-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        ) : (
          <p className="kpi-subvalue">
            {subValue.includes('%') && <span className="trend-arrow">↗</span>} {subValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default KPICard;
