import React, { useState } from 'react';
import { BudgetConfig, CategoryKey } from '../types';
import { CATEGORIES } from '../constants';
import { Settings, Save, RefreshCw, HelpCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfigProps {
  budget: BudgetConfig;
  onUpdateBudget: (newBudget: BudgetConfig) => void;
  expensesByCategory: { [key in CategoryKey]?: number };
}

export const BudgetConfigPanel: React.FC<ConfigProps> = ({ budget, onUpdateBudget, expensesByCategory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState(budget.total.toString());
  const [categoryLimits, setCategoryLimits] = useState<{ [key in CategoryKey]?: string }>(() => {
    const initial: { [key in CategoryKey]?: string } = {};
    CATEGORIES.forEach(cat => {
      initial[cat.key] = (budget.categories[cat.key] || 0).toString();
    });
    return initial;
  });

  const [notifSaved, setNotifSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleCategoryLimitChange = (catKey: CategoryKey, val: string) => {
    const cleanNumbers = val.replace(/[^0-9]/g, '');
    setCategoryLimits(prev => ({ ...prev, [catKey]: cleanNumbers }));
  };

  const handleTotalChange = (val: string) => {
    const cleanNumbers = val.replace(/[^0-9]/g, '');
    setTotalBudgetInput(cleanNumbers);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCategories: { [key in CategoryKey]?: number } = {};
    
    CATEGORIES.forEach(cat => {
      const val = parseInt(categoryLimits[cat.key] || '0', 10);
      updatedCategories[cat.key] = isNaN(val) ? 0 : val;
    });

    const parsedTotal = parseInt(totalBudgetInput, 10);
    const updatedTotal = isNaN(parsedTotal) ? 0 : parsedTotal;

    onUpdateBudget({
      total: updatedTotal,
      categories: updatedCategories
    });

    setNotifSaved(true);
    setTimeout(() => {
      setNotifSaved(false);
    }, 3000);
  };

  const handleResetToDefault = () => {
    setTotalBudgetInput("30000");
    const defaults: { [key in CategoryKey]?: string } = {
      'Food & Drinks': '10000',
      'Transportation': '3000',
      'Shopping': '6000',
      'Entertainment': '4000',
      'Bills & Utilities': '4500',
      'Health': '1000',
      'Education': '1000',
      'Others': '500',
    };
    setCategoryLimits(defaults);
    onUpdateBudget({
      total: 30000,
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
    });
  };

  return (
    <div id="budget-config-panel" className="bg-[#18181B] border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300">
      <button
        id="btn-toggle-budget-config"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900/80 transition-all duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-zinc-800 text-amber-400">
            <Settings className="w-4 h-4" />
          </span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-zinc-100">Set Budget Limits</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Customize financial thresholds to receive trigger alerts.</p>
          </div>
        </div>
        <span className="text-xs font-medium text-emerald-400 font-mono">
          {isOpen ? 'Collapse' : 'Configure'}
        </span>
      </button>

      {isOpen && (
        <form onSubmit={handleSave} className="p-6 border-t border-zinc-800 space-y-6">
          {/* Total Budget Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
            <div className="md:col-span-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Total Monthly Budget
              </label>
              <p className="text-[11px] text-zinc-500">Maximum safe spending target for the month.</p>
            </div>
            
            <div className="md:col-span-8 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-xs font-medium text-zinc-500">NT$</span>
              </div>
              <input
                id="input-total-budget"
                type="text"
                value={totalBudgetInput}
                onChange={(e) => handleTotalChange(e.target.value)}
                placeholder="Example: 30000"
                className="w-full bg-[#09090B] border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Categories Limits Lists */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Specific Spending Sectors</span>
              <span className="text-[11px] text-zinc-500">Adjust monthly allowance per category</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map(cat => {
                const amountSpent = expensesByCategory[cat.key] || 0;
                const limitAmount = parseInt(categoryLimits[cat.key] || '0', 10);
                const isLimitExceeded = amountSpent > limitAmount && limitAmount > 0;

                return (
                  <div key={cat.key} className="p-3 bg-zinc-900/30 border border-zinc-800/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-medium text-zinc-300">{cat.key}</span>
                      </div>
                      {isLimitExceeded && (
                        <span className="text-[10px] text-rose-500 font-medium px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          Over Budget
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-[10px] text-zinc-500 font-semibold font-mono">NT$</span>
                      </div>
                      <input
                        id={`input-budget-cat-${cat.key.replace(/\s+/g, '-')}`}
                        type="text"
                        value={categoryLimits[cat.key] || ''}
                        onChange={(e) => handleCategoryLimitChange(cat.key, e.target.value)}
                        placeholder="Budget Limit"
                        className="w-full bg-[#09090B] border border-zinc-800 focus:border-amber-500 rounded-lg py-1.5 pl-9 pr-3 text-xs text-zinc-200 outline-none transition-all font-mono"
                      />
                    </div>
                    {amountSpent > 0 && (
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>Already spent:</span>
                        <span>NT$ {amountSpent.toLocaleString('zh-TW')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
            {showResetConfirm ? (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-zinc-300 font-sans text-xs">Reset presets?</span>
                <button
                  type="button"
                  onClick={() => {
                    handleResetToDefault();
                    setShowResetConfirm(false);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-all cursor-pointer"
                >
                  Yes, Reset
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="btn-reset-budget"
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border border-zinc-800 hover:bg-zinc-800/40 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Controls
              </button>
            )}

            <div className="flex items-center gap-3">
              {notifSaved && (
                <motion.span 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Budget settings saved!
                </motion.span>
              )}
              
              <button
                id="btn-save-budget-config"
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-[#09090B] rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-500/10 transition-all font-mono"
              >
                <Save className="w-3.5 h-3.5" />
                Save New Budget
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
