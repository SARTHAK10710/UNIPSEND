import React from 'react';
import './TransactionItem.css';

const TransactionItem = ({ name, date, amount, icon, positive }) => {
  return (
    <div className="transaction-card glass-card">
      <div className="tx-left">
        <div className="tx-icon-bg">
          <span className="tx-icon">{icon}</span>
        </div>
        <div className="tx-details">
          <h4 className="tx-name">{name}</h4>
          <p className="tx-date">{date}</p>
        </div>
      </div>
      <div className={`tx-amount ${positive ? 'positive' : ''}`}>
        {amount}
      </div>
    </div>
  );
};

export default TransactionItem;
