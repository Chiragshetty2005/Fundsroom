import React from 'react';
import type { ChallanStatus, CustomerStatus, CustomerType, Role, StockMovementType } from '../../types';

interface BadgeProps {
  type: 'role' | 'customer-status' | 'customer-type' | 'stock' | 'movement' | 'challan-status';
  value: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value }) => {
  let badgeClass = 'neutral';
  let label = value;

  switch (type) {
    case 'role':
      if (value === 'ADMIN') badgeClass = 'primary';
      else if (value === 'SALES') badgeClass = 'info';
      else if (value === 'WAREHOUSE') badgeClass = 'warning';
      else if (value === 'ACCOUNTS') badgeClass = 'success';
      break;

    case 'customer-status':
      if (value === 'LEAD') badgeClass = 'warning';
      else if (value === 'ACTIVE') badgeClass = 'success';
      else if (value === 'INACTIVE') badgeClass = 'danger';
      break;

    case 'customer-type':
      badgeClass = 'info';
      break;

    case 'stock':
      if (value === 'LOW') {
        badgeClass = 'danger';
        label = 'Low Stock';
      } else {
        badgeClass = 'success';
        label = 'In Stock';
      }
      break;

    case 'movement':
      if (value === 'IN') {
        badgeClass = 'success';
        label = '+ IN';
      } else {
        badgeClass = 'danger';
        label = '- OUT';
      }
      break;

    case 'challan-status':
      if (value === 'DRAFT') badgeClass = 'warning';
      else if (value === 'CONFIRMED') badgeClass = 'success';
      else if (value === 'CANCELLED') badgeClass = 'danger';
      break;
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
};
