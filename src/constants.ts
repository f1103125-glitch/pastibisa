import { CategoryKey } from './types';

export const CATEGORIES: { key: CategoryKey; color: string; bg: string; icon: string }[] = [
  { key: 'Food & Drinks', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: 'Utensils' },
  { key: 'Transportation', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', icon: 'Car' },
  { key: 'Shopping', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.1)', icon: 'ShoppingBag' },
  { key: 'Entertainment', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', icon: 'Sparkles' },
  { key: 'Bills & Utilities', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: 'CreditCard' },
  { key: 'Health', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)', icon: 'HeartPulse' },
  { key: 'Education', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)', icon: 'GraduationCap' },
  { key: 'Others', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: 'Hash' },
];

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer / Debit Card',
  'Credit Card',
  'E-Wallet (LINE Pay, JKOPAY, Apple Pay)',
  'Others'
];

export const INITIAL_BUDGET = {
  total: 30000, // NT$ 30,000 initial overall budget limit
  categories: {
    'Food & Drinks': 10000,
    'Transportation': 3000,
    'Shopping': 6000,
    'Entertainment': 4000,
    'Bills & Utilities': 4500,
    'Health': 1000,
    'Education': 1000,
    'Others': 500,
  }
};

export const INITIAL_EXPENSES = [
  {
    id: 'exp-1',
    description: 'Weekly Groceries at PX-Mart',
    amount: 1250,
    category: 'Food & Drinks' as CategoryKey,
    date: '2026-05-20',
    paymentMethod: 'Bank Transfer / Debit Card',
  },
  {
    id: 'exp-2',
    description: 'EasyCard Top-up at 7-Eleven',
    amount: 500,
    category: 'Transportation' as CategoryKey,
    date: '2026-05-21',
    paymentMethod: 'E-Wallet (LINE Pay, JKOPAY, Apple Pay)',
  },
  {
    id: 'exp-3',
    description: 'UNIQLO Summer T-Shirts',
    amount: 1580,
    category: 'Shopping' as CategoryKey,
    date: '2026-05-22',
    paymentMethod: 'Credit Card',
  },
  {
    id: 'exp-4',
    description: 'Vie Show Cinema Tickets & Popcorn',
    amount: 450,
    category: 'Entertainment' as CategoryKey,
    date: '2026-05-23',
    paymentMethod: 'Cash',
  },
  {
    id: 'exp-5',
    description: 'Chunghwa Telecom Fiber Bill',
    amount: 999,
    category: 'Bills & Utilities' as CategoryKey,
    date: '2026-05-24',
    paymentMethod: 'E-Wallet (LINE Pay, JKOPAY, Apple Pay)',
  }
];
