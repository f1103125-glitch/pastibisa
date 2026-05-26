import React, { useState } from 'react';
import { Expense, CategoryKey } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { Trash2, Plus, Filter, Search, Calendar, ChevronDown, Check, CreditCard, Sparkles, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onClearAllExpenses: () => void;
}

export const ExpenseListPanel: React.FC<ExpenseProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  onClearAllExpenses
}) => {
  // Form states
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<CategoryKey>('Food & Drinks');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);

  // UI state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | CategoryKey>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Confirmation & Error states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError('');
    setDescriptionError('');

    const amount = parseFloat(amountStr.replace(/[^0-9]/g, ''));
    let hasError = false;

    if (isNaN(amount) || amount <= 0) {
      setAmountError("Please enter a valid expense amount.");
      hasError = true;
    }
    if (!description.trim()) {
      setDescriptionError("Please enter a description for the expense.");
      hasError = true;
    }

    if (hasError) return;

    onAddExpense({
      description: description.trim(),
      amount: amount!,
      category,
      date,
      paymentMethod
    });

    // Reset Form
    setDescription('');
    setAmountStr('');
    setAmountError('');
    setDescriptionError('');
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
  };

  // Safe formatting computed preview
  const formatPreview = () => {
    const num = parseFloat(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return '';
    return `Format: NT$ ${num.toLocaleString('zh-TW')}`;
  };

  // Apply filters & sorting
  const filteredExpenses = expenses
    .filter(exp => {
      const matchSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exp.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategoryFilter === 'All' || exp.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      
      {/* ADD EXPENSE FORM */}
      <div id="add-expense-card" className="md:col-span-5 bg-[#18181B] border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
            Add New Expense
          </h3>
          <p className="text-xs text-zinc-400 mt-1">Enter the expense details and save it by category.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nominal Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-semibold text-zinc-500 font-mono">
                NT$
              </span>
              <input
                id="input-expense-amount"
                type="text"
                required
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value.replace(/[^0-9]/g, ''));
                  setAmountError('');
                }}
                placeholder="Example: 450"
                className={`w-full bg-zinc-900 border ${amountError ? 'border-rose-500/80 focus:border-rose-500/80' : 'border-zinc-800 focus:border-emerald-500'} rounded-xl py-2.5 pl-12 pr-4 text-sm text-zinc-100 outline-none transition-all font-mono`}
              />
            </div>
            {amountError && (
              <p className="text-[11px] text-rose-500 font-medium pl-1">{amountError}</p>
            )}
            {amountStr && !amountError && (
              <p className="text-[11px] text-emerald-400 font-mono pl-1">{formatPreview()}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
              Description *
            </label>
            <input
              id="input-expense-description"
              type="text"
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError('');
              }}
              placeholder="Example: Lunch bento box, Uber ride to work"
              className={`w-full bg-zinc-900 border ${descriptionError ? 'border-rose-500/80 focus:border-rose-500/80' : 'border-zinc-800 focus:border-emerald-500'} rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none transition-all`}
            />
            {descriptionError && (
              <p className="text-[11px] text-rose-500 font-medium pl-1">{descriptionError}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
              Shopping Category
            </label>
            <div className="relative">
              <select
                id="select-expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryKey)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none transition-all cursor-pointer appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.key}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Date
              </label>
              <div className="relative">
                <input
                  id="input-expense-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-zinc-300 outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Payment Method
              </label>
              <div className="relative">
                <select
                  id="select-expense-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-[11px] text-zinc-300 outline-none transition-all cursor-pointer appearance-none"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-500">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          <button
            id="btn-submit-expense"
            type="submit"
            className="w-full mt-2 cursor-pointer bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-[#09090B] font-semibold text-xs py-3 rounded-xl transition-all shadow-md shadow-emerald-500/15 font-mono flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            ADD EXPENSE RECORD
          </button>
        </form>
      </div>

      {/* EXPENSE LOGS & FILTERS */}
      <div id="expense-history-card" className="md:col-span-7 bg-[#18181B] border border-zinc-800 rounded-2xl p-6 space-y-5">
        
        {/* Header & Controls summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Expense History Log
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Showing {filteredExpenses.length} of {expenses.length} transaction records.
            </p>
          </div>

          {expenses.length > 0 && (
            <div className="flex items-center gap-2">
              {showClearConfirm ? (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-zinc-200 text-[11px] font-sans">Delete all?</span>
                  <button
                    id="btn-confirm-clear"
                    onClick={() => {
                      onClearAllExpenses();
                      setShowClearConfirm(false);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold font-mono cursor-pointer transition-colors"
                  >
                    Confirm
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    id="btn-cancel-clear"
                    onClick={() => setShowClearConfirm(false)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="btn-clear-all"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/10 hover:border-rose-500/20 transition-all font-mono self-start sm:self-auto cursor-pointer"
                >
                  Delete All Expenses
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters and Searching Toolbar */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-7 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
              </span>
              <input
                id="search-expense-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description or payment method..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-300 outline-none transition-all"
              />
            </div>

            {/* Sorting */}
            <div className="sm:col-span-5 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              </span>
              <select
                id="sort-expense-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-3 text-xs text-zinc-300 outline-none transition-all cursor-pointer appearance-none font-mono"
              >
                <option value="date-desc">Newest (Date)</option>
                <option value="date-asc">Oldest (Date)</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Quick Category Filters Pill Box */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
            <button
              id="filter-cat-all"
              onClick={() => setSelectedCategoryFilter('All')}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategoryFilter === 'All'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategoryFilter === cat.key;
              return (
                <button
                  id={`filter-cat-${cat.key.replace(/\s+/g, '-')}`}
                  key={cat.key}
                  onClick={() => setSelectedCategoryFilter(cat.key)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1 border ${
                    isActive
                      ? 'bg-zinc-800/80 text-zinc-100'
                      : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border-zinc-800/60'
                  }`}
                  style={isActive ? { borderColor: cat.color, color: cat.color } : {}}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.key}
                </button>
              );
            })}
          </div>
        </div>

        {/* LOGS LIST */}
        <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-[150px]">
          <AnimatePresence initial={false}>
            {filteredExpenses.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-6 text-center">
                <SlidersHorizontal className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">No Matching Transactions Found</p>
                <p className="text-[10px] text-zinc-500 max-w-[240px] mt-1">
                  Try changing your search query or clear category filters to see all entries.
                </p>
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const catInfo = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[CATEGORIES.length - 1];
                return (
                  <motion.div
                    id={`expense-item-${exp.id}`}
                    key={exp.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center justify-between p-3.5 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon tag color helper */}
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: catInfo.color }}
                      />
                      
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100 truncate pr-2">
                          {exp.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-zinc-500 mt-1 font-mono">
                          <span 
                            className="font-medium px-1.5 py-0.5 rounded"
                            style={{ color: catInfo.color, backgroundColor: catInfo.bg }}
                          >
                            {exp.category}
                          </span>
                          <span>{exp.date}</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-zinc-400 flex items-center gap-1 font-sans">
                            <CreditCard className="w-3 h-3 text-zinc-500" />
                            {exp.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-100 font-mono">
                          - NT$ {exp.amount.toLocaleString('zh-TW')}
                        </p>
                      </div>

                      <button
                        id={`btn-delete-expense-${exp.id}`}
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};
