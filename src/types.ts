export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
}

export type CategoryKey = 'Food & Drinks' | 'Transportation' | 'Shopping' | 'Entertainment' | 'Bills & Utilities' | 'Health' | 'Education' | 'Others';

export interface BudgetConfig {
  total: number;
  categories: {
    [key in CategoryKey]?: number;
  };
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  date: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  message: string;
  timestamp: string;
}
