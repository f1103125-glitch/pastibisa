import React, { useState } from 'react';
import { Expense, CategoryKey } from '../types';
import { CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, AlertTriangle, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface AnalyticsProps {
  expenses: Expense[];
  budget: {
    total: number;
    categories: { [key in CategoryKey]?: number };
  };
}

export const AnalyticsCharts: React.FC<AnalyticsProps> = ({ expenses, budget }) => {
  const [activeTab, setActiveTab] = useState<'donut' | 'bars'>('donut');
  const [hoveredCategory, setHoveredCategory] = useState<CategoryKey | null>(null);

  // Compute stats
  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Spending by Category
  const categoryStats = CATEGORIES.map(cat => {
    const amount = expenses
      .filter(e => e.category === cat.key)
      .reduce((sum, e) => sum + e.amount, 0);
    const limit = budget.categories[cat.key] || 0;
    const percentOfBudget = limit > 0 ? (amount / limit) * 100 : 0;
    const percentOfTotal = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;

    return {
      ...cat,
      amount,
      limit,
      percentOfBudget,
      percentOfTotal
    };
  }).filter(stat => stat.amount > 0) // only show categories with spending
    .sort((a, b) => b.amount - a.amount);

  // Custom SVG Donut Chart Calculation
  let accumulatedPercent = 0;
  const donutPieces = categoryStats.map((stat) => {
    const percent = stat.percentOfTotal;
    const startAngle = (accumulatedPercent * 360) / 100;
    accumulatedPercent += percent;
    const endAngle = (accumulatedPercent * 360) / 100;

    // Convert polar to cartesian coordinates for SVG path arc
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    const drawArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
      return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(' ');
    };

    const pathData = percent >= 99.99 
      // edge case for 100% single category circle
      ? 'M 100 20 A 80 80 0 1 1 99.99 20'
      : drawArc(100, 100, 75, startAngle, endAngle);

    return {
      ...stat,
      pathData,
      startAngle,
      endAngle
    };
  });

  // Calculate highest spending category
  const highestCategory = categoryStats[0];

  return (
    <div id="analytics-section" className="bg-[#18181B] border border-zinc-800 rounded-2xl p-6 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Charts & Reports Analysis
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time visualization of your monthly spending allocation.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg self-start">
          <button
            id="btn-tab-donut"
            onClick={() => setActiveTab('donut')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              activeTab === 'donut'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Category Allocation
          </button>
          <button
            id="btn-tab-bars"
            onClick={() => setActiveTab('bars')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              activeTab === 'bars'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Budget Proportion
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="h-[280px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-6 text-center">
          <Coins className="w-12 h-12 text-zinc-600 mb-3 animate-pulse" />
          <p className="text-sm font-medium text-zinc-400">No Spending Data Yet</p>
          <p className="text-xs text-zinc-500 max-w-[260px] mt-1">
            Please add your first expense to generate report charts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Main Visualizer Area */}
          <div className="lg:col-span-5 flex justify-center items-center py-4 bg-zinc-900/40 rounded-xl border border-zinc-800/40 p-4">
            {activeTab === 'donut' ? (
              <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                  <circle cx="100" cy="100" r="75" fill="transparent" stroke="#27272a" strokeWidth="14" />
                  {donutPieces.map((piece, index) => (
                    <motion.path
                      key={piece.key}
                      d={piece.pathData}
                      fill="transparent"
                      stroke={piece.color}
                      strokeWidth={hoveredCategory === piece.key ? 18 : 14}
                      strokeLinecap="round"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredCategory(piece.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
                    />
                  ))}
                </svg>

                {/* Central Info Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Total Spent</span>
                  <span className="text-sm font-bold text-zinc-100 mt-0.5 truncate max-w-[150px]">
                    NT$ {totalSpending.toLocaleString('zh-TW')}
                  </span>
                  {hoveredCategory && (
                    <span 
                      className="text-[10px] font-medium font-mono mt-1 px-1.5 py-0.5 max-w-[130px] truncate rounded bg-zinc-800 text-zinc-300"
                      style={{ color: CATEGORIES.find(c => c.key === hoveredCategory)?.color }}
                    >
                      {hoveredCategory}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              // Simple Budget Gauge Meter
              <div className="flex flex-col items-center w-full max-w-[220px]">
                <div className="relative w-40 h-24 flex items-end justify-center overflow-hidden">
                  <svg width="160" height="100" viewBox="0 0 160 100">
                    {/* Background Arc */}
                    <path
                      d="M 15 90 A 65 65 0 0 1 145 90"
                      fill="transparent"
                      stroke="#27272a"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    {/* Usage Arc */}
                    <motion.path
                      d="M 15 90 A 65 65 0 0 1 145 90"
                      fill="transparent"
                      stroke={totalSpending / budget.total > 1 ? '#EF4444' : totalSpending / budget.total > 0.8 ? '#F59E0B' : '#10B981'}
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray="204.2"
                      initial={{ strokeDashoffset: 204.2 }}
                      animate={{ 
                        strokeDashoffset: 204.2 - (204.2 * Math.min(1, totalSpending / budget.total)) 
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute bottom-1 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Usage</span>
                    <h4 className="text-lg font-bold text-zinc-100">
                      {Math.round((totalSpending / budget.total) * 100)}%
                    </h4>
                  </div>
                </div>
                <div className="text-center w-full mt-4 text-xs text-zinc-400 bg-zinc-800/40 py-1.5 px-3 rounded border border-zinc-800">
                  Total Budget: NT$ {budget.total.toLocaleString('zh-TW')}
                </div>
              </div>
            )}
          </div>

          {/* Details & Budget Comparison List */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-1.5 flex items-center justify-between">
              <span>Category Expenses Breakdown</span>
              <span>Spent / Budget</span>
            </h4>

            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {categoryStats.map((stat) => {
                const isOver = stat.amount > stat.limit;
                const isClose = stat.amount >= stat.limit * 0.8 && stat.amount <= stat.limit;
                const ratio = stat.limit > 0 ? (stat.amount / stat.limit) * 100 : 0;

                return (
                  <div 
                    key={stat.key}
                    onMouseEnter={() => setHoveredCategory(stat.key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`group rounded-lg p-2.5 bg-zinc-900/30 border transition-all ${
                      hoveredCategory === stat.key 
                        ? 'border-zinc-700 bg-zinc-800/20' 
                        : 'border-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-xs font-medium text-zinc-200">{stat.key}</span>
                        <span className="text-[10px] font-mono text-zinc-500">({Math.round(stat.percentOfTotal)}%)</span>
                      </div>
                      
                      <div className="text-right flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-100">
                          NT$ {stat.amount.toLocaleString('zh-TW')}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          / {stat.limit > 0 ? `NT$ ${stat.limit.toLocaleString('zh-TW')}` : '∞'}
                        </span>
                        {isOver && (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" title="Limit Exceeded!" />
                        )}
                        {!isOver && isClose && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Approaching Limit!" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {stat.limit > 0 && (
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full ${
                            isOver ? 'bg-rose-500' : isClose ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse-slow'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ratio)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Insight card */}
            {highestCategory && (
              <div className="flex items-start gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 self-start">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-semibold text-zinc-200">Spending Insight: </span>
                  Your highest spending is in <span className="font-medium text-zinc-100" style={{ color: highestCategory.color }}>{highestCategory.key}</span> at <span className="font-semibold text-zinc-200">NT$ {highestCategory.amount.toLocaleString('zh-TW')}</span>. Ask the AI panel at the sidebar for budget optimization tactics!
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
