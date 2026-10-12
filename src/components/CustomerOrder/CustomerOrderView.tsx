import React from 'react';
import { Product, StoreSettings, Transaction } from '../../types';
import { PublicMenuCustomerView } from '../PublicMenu/PublicMenuCustomerView';

interface CustomerOrderViewProps {
  products: Product[];
  settings: StoreSettings;
  initialOrderType?: 'Takeaway' | 'Delivery';
  onBackToApp?: () => void;
  onOrderCreated?: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  products,
  settings,
  initialOrderType = 'Takeaway',
  onBackToApp,
  onOrderCreated,
  showToast,
}) => {
  return (
    <PublicMenuCustomerView
      products={products}
      settings={settings}
      initialOrderType={initialOrderType}
      onOpenPOS={onBackToApp}
      onOrderCreated={onOrderCreated}
      showToast={showToast}
    />
  );
};
