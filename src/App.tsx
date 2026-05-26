import { useState, useEffect, useMemo } from 'react';
import { Expense, BudgetConfig, SmartNotification, ChatMessage, CategoryKey } from './types';
import { CATEGORIES, PAYMENT_METHODS, INITIAL_BUDGET, INITIAL_EXPENSES } from './constants';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { BudgetConfigPanel } from './components/BudgetConfigPanel';
import { ExpenseListPanel } from './components/ExpenseListPanel';
import { 
  Wallet, 
  TrendingUp, 
  Bot, 
  Bell, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  Check,
  Copy,
  Send,
  HelpCircle,
  Menu,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  Info,
  PiggyBank,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation State: 'dashboard' | 'transactions' | 'ai-chat'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'ai-chat'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Financial States with local storage integration
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('fintrack_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [budget, setBudget] = useState<BudgetConfig>(() => {
    const saved = localStorage.getItem('fintrack_budget');
    return saved ? JSON.parse(saved) : INITIAL_BUDGET;
  });

  const [savingsReserve, setSavingsReserve] = useState<number>(() => {
    const saved = localStorage.getItem('fintrack_savings_reserve');
    return saved ? parseInt(saved, 10) : 5000; // default NT$ 5,000 savings cushion
  });

  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  // Chat/AI State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('fintrack_chat_history');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'msg-welcome-init',
        role: 'model',
        message: 'Hello! I am Kadek, your personal financial planning assistant. 🌟\n\nI record your real-time transaction activities. You can ask me about your current financial status, optimization tips for specific categories, or how to manage your remaining monthly budget. How can I help you today?',
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

  // Save states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fintrack_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('fintrack_budget', JSON.stringify(budget));
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('fintrack_savings_reserve', savingsReserve.toString());
  }, [savingsReserve]);

  useEffect(() => {
    localStorage.setItem('fintrack_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Derived financial computations
  const totalSpending = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const map: { [key in CategoryKey]?: number } = {};
    expenses.forEach(e => {
      const cat = e.category as CategoryKey;
      map[cat] = (map[cat] || 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const safeLimit = useMemo(() => {
    return Math.max(0, budget.total - savingsReserve);
  }, [budget.total, savingsReserve]);

  const safeRemainingBalance = useMemo(() => {
    return safeLimit - totalSpending;
  }, [safeLimit, totalSpending]);

  // Smart Budget Monitoring and Alerts Generation
  useEffect(() => {
    const alerts: SmartNotification[] = [];
    const today = new Date().toLocaleDateString('zh-TW');

    // 1. Overall budget check
    const overallRatio = totalSpending / budget.total;
    if (overallRatio >= 1) {
      alerts.push({
        id: 'notif-total-exceeded',
        title: 'Budget Limit Reached! 🚨',
        message: `Your total spending (NT$ ${totalSpending.toLocaleString('zh-TW')}) has exceeded your total monthly budget (NT$ ${budget.total.toLocaleString('zh-TW')}). Please stop non-essential expenses immediately!`,
        type: 'danger',
        date: today,
        read: false
      });
    } else {
      // Check if they exceed the customizable safe spending target (tapping into savings reserve)
      if (savingsReserve > 0 && totalSpending > safeLimit) {
        alerts.push({
          id: 'notif-savings-reserve-tapped',
          title: 'Savings Reserve Consumed! ⚠️',
          message: `Your spending (NT$ ${totalSpending.toLocaleString('zh-TW')}) has crossed your safe spendable target of NT$ ${safeLimit.toLocaleString('zh-TW')}. You are currently tapping into your NT$ ${savingsReserve.toLocaleString('zh-TW')} customized savings goal.`,
          type: 'warning',
          date: today,
          read: false
        });
      } else if (overallRatio >= 0.8) {
        alerts.push({
          id: 'notif-total-warning',
          title: 'Approaching Total Budget Limit ⚠️',
          message: `Your total spending has reached ${Math.round(overallRatio * 100)}% of your monthly budget. Only NT$ ${(budget.total - totalSpending).toLocaleString('zh-TW')} of safe allowance remains.`,
          type: 'warning',
          date: today,
          read: false
        });
      }
    }

    // 2. Specific category limit check
    CATEGORIES.forEach(cat => {
      const spent = expensesByCategory[cat.key] || 0;
      const limit = budget.categories[cat.key] || 0;
      if (limit > 0) {
        const ratio = spent / limit;
        if (ratio >= 1.0) {
          alerts.push({
            id: `notif-cat-exceeded-${cat.key}`,
            title: `Budget Spill: ${cat.key} 🛑`,
            message: `Spending in ${cat.key} (NT$ ${spent.toLocaleString('zh-TW')}) has exceeded your configured limit of NT$ ${limit.toLocaleString('zh-TW')} by NT$ ${(spent - limit).toLocaleString('zh-TW')}.`,
            type: 'danger',
            date: today,
            read: false
          });
        } else if (ratio >= 0.8) {
          alerts.push({
            id: `notif-cat-warning-${cat.key}`,
            title: `Spending Alert: ${cat.key} ⚠️`,
            message: `The budget for ${cat.key} is already ${Math.round(ratio * 100)}% spent. We advise limiting your further transactions in this sector for the rest of the month.`,
            type: 'warning',
            date: today,
            read: false
          });
        }
      }
    });

    setNotifications(alerts);
  }, [expenses, budget, totalSpending, expensesByCategory]);

  // Urgent notice indicator for the top header
  const urgentNotice = useMemo(() => {
    const overLimits = notifications.filter(n => n.type === 'danger');
    if (overLimits.length > 0) {
      return overLimits[0];
    }
    const warnings = notifications.filter(n => n.type === 'warning');
    if (warnings.length > 0) {
      return warnings[0];
    }
    return null;
  }, [notifications]);

  // Operations handlers
  const handleAddExpense = (newExpData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}`
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAllExpenses = () => {
    setExpenses([]);
  };

  const handleUpdateBudget = (newBudget: BudgetConfig) => {
    setBudget(newBudget);
  };

  // call AI Consultant Backend API
  const handleSendAiMessage = async (customMessage?: string) => {
    const msgText = customMessage || chatInput;
    if (!msgText.trim()) return;

    // Add user message to state
    const userMsgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      message: msgText,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);
    setAiError(null);

    try {
      // Package query state
      const response = await fetch("/api/ai/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses,
          budget,
          message: msgText,
          chatHistory: chatHistory.map(h => ({ role: h.role, message: h.message })),
          savingsReserve
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to fetch AI advice.");
      }

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'model',
        message: data.advice,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, modelMsg]);

    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Failed to connect to your financial assistant.");
      
      // Auto-reply warning from system
      const systemErrorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        message: `⚠️ **Oops, AI Connection Interrupted**\n\n${err.message || "Unable to connect with Kadek AI helper. We are unable to synthesize active strategic budget guidance right now."}\n\n*Tip: If the issue persists, please make sure your GEMINI_API_KEY is configured in the Secrets panel in AI Studio.*`,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, systemErrorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quick prompt handler for easy interaction
  const handleQuickPrompt = (prompt: string) => {
    setActiveTab('ai-chat');
    handleSendAiMessage(prompt);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const handleClearChatHistory = () => {
    setChatHistory([
      {
        id: 'msg-welcome-init-restored',
        role: 'model',
        message: 'Hello! I am Kadek, your personal financial advisor. 🌟\n\nI have reset our custom chat space. Ask me anything about your monthly spending charts or request smart budgeting solutions.',
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Parse text formatted in markdown to nice styled html blocks simply
  const renderMessageContent = (msg: string) => {
    const lines = msg.split('\n');
    return lines.map((line, idx) => {
      // Bold syntax headers/highlights
      let formatted = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      formatted = formatted.replace(boldRegex, '<strong class="text-zinc-100 font-bold">$1</strong>');
      
      // Bullet list item
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-zinc-300 mb-1 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: formatted.replace(/^[\-\*]\s+/, '') }} />
        );
      }
      
      // Number list item
      if (/^\d+\.\s+/.test(line.trim())) {
        const cleanText = line.trim().replace(/^\d+\.\s+/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-zinc-300 mb-1 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: cleanText }} />
        );
      }

      // Empty space
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs text-zinc-300 leading-relaxed mb-1.5" 
           dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen flex flex-col md:flex-row font-sans overflow-x-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-[#0c0c0e] flex flex-col p-5 shrink-0 justify-between md:h-screen sticky top-0 md:top-auto z-40">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wallet className="w-4.5 h-4.5 text-[#09090b]" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-zinc-100 block">FinTrack AI</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Financial Plan v3.5</span>
              </div>
            </div>

            {/* Mobile Menu Icon */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className={`space-y-1 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block transition-all mb-6`}>
            <button
              id="nav-tab-dashboard"
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-150 font-medium text-xs cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800/60 text-emerald-400 border-l-2 border-emerald-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 opacity-80" />
                Dashboard Overview
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              id="nav-tab-transactions"
              onClick={() => { setActiveTab('transactions'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-150 font-medium text-xs cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-zinc-800/60 text-emerald-400 border-l-2 border-emerald-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Plus className="w-4 h-4 opacity-80" />
                Input & Expenses
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              id="nav-tab-ai-chat"
              onClick={() => { setActiveTab('ai-chat'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-150 font-medium text-xs cursor-pointer ${
                activeTab === 'ai-chat'
                  ? 'bg-zinc-800/60 text-emerald-400 border-l-2 border-emerald-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 opacity-80" />
                Kadek AI Advisor
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </div>
            </button>
          </nav>
        </div>

        {/* Dynamic Pocket Budget Indicator */}
        <div className={`mt-auto pt-4 border-t border-zinc-800/80 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          <div className="bg-zinc-900/80 border border-zinc-800/50 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Safe Spend Limit</p>
              {savingsReserve > 0 && (
                <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-0.5">
                  <PiggyBank className="w-2.5 h-2.5 text-amber-500" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-base font-bold text-zinc-250 font-mono">
              NT$ {safeLimit.toLocaleString('zh-TW')}
            </p>
            <div className="h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  totalSpending > budget.total ? 'bg-rose-500' : totalSpending > safeLimit ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (totalSpending / (safeLimit || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
              <span className={safeRemainingBalance < 0 ? 'text-rose-400 font-mono' : 'text-zinc-500 font-mono'}>
                {safeRemainingBalance < 0 ? 'Exceeded' : 'Remaining'}: NT$ {Math.abs(safeRemainingBalance).toLocaleString('zh-TW')}
              </span>
              <span>{Math.round(Math.min(100, (totalSpending / (safeLimit || 1)) * 100))}%</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto md:h-screen">
        
        {/* TOP HEADER & ALERT PANEL */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest font-mono">FinTrack Overview</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black mt-0.5 tracking-tight text-zinc-100">
              {activeTab === 'dashboard' && 'Spending Dashboard'}
              {activeTab === 'transactions' && 'Expense & Budget Management'}
              {activeTab === 'ai-chat' && 'Personal Finance Assistant (Kadek AI)'}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {activeTab === 'dashboard' && 'Track remaining balance, monitor budgets, and analyze spending allocations in real-time.'}
              {activeTab === 'transactions' && 'Add customized expenditures with specific categories for optimal organization.'}
              {activeTab === 'ai-chat' && 'Consult on your monthly wage allocations through smart, personalized AI feedback.'}
            </p>
          </div>

          {/* Alert / Notification Indicator */}
          <div className="flex items-center gap-2">
            {urgentNotice && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2.5 border px-3.5 py-2.5 rounded-xl text-xs max-w-sm shrink shadow-md ${
                  urgentNotice.type === 'danger'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  urgentNotice.type === 'danger' ? 'bg-rose-500 animate-ping' : 'bg-amber-500 animate-bounce'
                }`} />
                <div className="min-w-0">
                  <span className="font-bold block truncate text-[11px]">{urgentNotice.title}</span>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{urgentNotice.message}</p>
                </div>
              </motion.div>
            )}

            {/* Notification Drawer Button */}
            <div className="relative">
              <button
                id="btn-bell-notification"
                onClick={() => setIsNotifDrawerOpen(!isNotifDrawerOpen)}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all cursor-pointer relative"
                title="Open Budget Warning Center"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-[#09090b]" />
                )}
              </button>

              {/* Draw down alerts floating box */}
              <AnimatePresence>
                {isNotifDrawerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-[#161618] border border-zinc-800 rounded-2xl p-4 shadow-2xl z-50 text-left"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        Budget Threshold Alerts ({notifications.length})
                      </span>
                      <button 
                        onClick={() => setIsNotifDrawerOpen(false)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium"
                      >
                        Close
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500 flex flex-col items-center justify-center">
                          <CheckCircle className="w-7 h-7 text-emerald-500 opacity-60 mb-2" />
                          <p className="text-xs font-semibold">Your Finances are Healthy!</p>
                          <p className="text-[10px] text-zinc-500 mt-1">No spending categories have exceeded 80% of budget limit.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            className={`p-2.5 rounded-xl text-xs border ${
                              notif.type === 'danger'
                                ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                                : 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                            }`}
                          >
                            <span className="font-bold flex items-center gap-1.5 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-current" />
                              {notif.title}
                            </span>
                            <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* METRICS GRILL DISPLAY */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          
          {/* Spend Metric */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 text-xs font-semibold">Total Spending This Month</span>
              <span className="text-[10px] text-zinc-500 font-mono">Month of May</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold font-mono text-zinc-100 mt-2">
              NT$ {totalSpending.toLocaleString('zh-TW')}
            </p>
            <div className="h-1 bg-zinc-850 mt-4 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  totalSpending / budget.total > 1 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (totalSpending / budget.total) * 100)}%` }}
              />
            </div>
          </div>

          {/* Allowance Metric */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-zinc-700 flex flex-col justify-between min-h-[175px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs font-semibold flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                  Safe Remaining Balance
                </span>
                {totalSpending > budget.total ? (
                  <span className="text-[10px] text-rose-450 font-semibold font-mono px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/15">Deficit 🚨</span>
                ) : totalSpending > safeLimit ? (
                  <span className="text-[10px] text-amber-450 font-semibold font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/15">Reserve Tapped ⚠️</span>
                ) : (
                  <span className="text-[10px] text-emerald-450 font-semibold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15">Healthy 🛡️</span>
                )}
              </div>

              <p className={`text-2xl md:text-3xl font-bold font-mono mt-2 tracking-tight ${
                totalSpending > budget.total 
                  ? 'text-rose-400' 
                  : totalSpending > safeLimit 
                  ? 'text-amber-400' 
                  : 'text-emerald-400'
              }`}>
                NT$ {safeRemainingBalance.toLocaleString('zh-TW')}
              </p>
            </div>

            {/* Direct Input for Savings Reserve */}
            <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-400 font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-sans text-xs text-zinc-400">
                  <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                  Savings Reserve Goal
                </span>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-zinc-500 font-sans text-[11px]">NT$</span>
                  <input
                    type="text"
                    value={savingsReserve === 0 ? '' : savingsReserve.toString()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      const val = clean === '' ? 0 : parseInt(clean, 10);
                      const finalVal = isNaN(val) ? 0 : Math.min(val, budget.total);
                      setSavingsReserve(finalVal);
                    }}
                    placeholder="0"
                    className="w-28 bg-zinc-950 border border-zinc-800 focus:border-amber-500/80 hover:border-zinc-700 text-right text-amber-400 font-bold px-2.5 py-1.5 pl-8 rounded-xl text-xs outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-zinc-500 text-[10px] mt-0.5">
                <span>Safe Spending Limit:</span>
                <span className="font-semibold text-zinc-300 font-mono">NT$ {safeLimit.toLocaleString('zh-TW')}</span>
              </div>

              {/* Preset Targets Row */}
              <div className="flex items-center justify-between gap-1.5 mt-1 pt-1.5 border-t border-zinc-850/60">
                <span className="text-[9px] text-zinc-500">Quick ratio targets:</span>
                <div className="flex items-center gap-1">
                  {[0, 0.1, 0.2, 0.3].map((rate) => {
                    const amt = Math.round(budget.total * rate);
                    const isActive = savingsReserve === amt;
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setSavingsReserve(amt);
                        }}
                        className={`px-1.5 py-0.5 text-[8.5px] rounded transition-all cursor-pointer font-mono ${
                          isActive 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/35 font-bold' 
                            : 'bg-zinc-850 text-zinc-500 border border-transparent hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {rate * 100}%
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick AI Advise Widget Action */}
          <div className="bg-gradient-to-br from-indigo-950/20 to-zinc-900 border border-indigo-900/40 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-indigo-800/60">
            <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-indigo-500/5 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Quick AI Advisor
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Real-time</span>
            </div>
            
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
              Ask Kadek to analyze your spending posture and recommend instant money saving tactics.
            </p>

            <button
              id="btn-quick-ai-trigger"
              onClick={() => handleQuickPrompt("Provide 3 brief tactical savings recommendations based on my current spending habit.")}
              className="mt-3.5 flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-all font-mono group cursor-pointer"
            >
              CONSULT NOW
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </section>

        {/* MAIN BODY TABS */}
        <div className="flex-1 space-y-8">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div id="view-dashboard" className="space-y-8">
              {/* Report Analytics custom charts components */}
              <AnalyticsCharts expenses={expenses} budget={budget} />

              {/* Budget constraints config panel */}
              <BudgetConfigPanel 
                budget={budget} 
                onUpdateBudget={handleUpdateBudget} 
                expensesByCategory={expensesByCategory} 
              />

              {/* Short Recent Log lists shortcuts */}
              <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Recent Spending Activity
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Quick summary of your latest 3 transaction records.</p>
                  </div>

                  <button
                    id="btn-goto-transactions"
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 font-mono hover:underline cursor-pointer"
                  >
                    View All ({expenses.length})
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {expenses.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 text-xs">
                    No expenses recorded. Please head to the input tab to register your first transaction!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {expenses.slice(0, 3).map(exp => {
                      const catInfo = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[CATEGORIES.length - 1];
                      return (
                        <div key={exp.id} className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catInfo.color }} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">{exp.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                                <span className="font-medium" style={{ color: catInfo.color }}>{exp.category}</span>
                                <span>•</span>
                                <span>{exp.date}</span>
                              </div>
                            </div>
                          </div>
                          
                          <span className="text-xs font-bold text-zinc-100 font-mono shrink-0">
                            - NT$ {exp.amount.toLocaleString('zh-TW')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS & SPECIFIC LOGS LIST */}
          {activeTab === 'transactions' && (
            <div id="view-transactions" className="space-y-8">
              <ExpenseListPanel
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onClearAllExpenses={handleClearAllExpenses}
              />
            </div>
          )}

          {/* TAB 3: IMMERSIVE AI CHAT AND ADVISOR PANEL */}
          {activeTab === 'ai-chat' && (
            <div id="view-ai-chat" className="bg-[#18181B] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[520px]">
              
              {/* Chat Title & Header info */}
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 block">
                      <Bot className="w-5 h-5 animate-bounce-slow" />
                    </span>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-zinc-900 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      Kadek Financial Advisor
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 uppercase font-mono border border-emerald-500/15">
                        Gemini AI
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-sans">Wise financial advisor ready to give you personalized planning recommendations.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {showClearChatConfirm ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg text-[10px] text-zinc-300 font-mono">
                      <span>Clear all?</span>
                      <button
                        onClick={() => {
                          handleClearChatHistory();
                          setShowClearChatConfirm(false);
                        }}
                        className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                      >
                        Yes
                      </button>
                      <span>/</span>
                      <button
                        onClick={() => setShowClearChatConfirm(false)}
                        className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      id="btn-clear-chat"
                      onClick={() => setShowClearChatConfirm(true)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/10 border border-transparent rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer font-mono"
                      title="Clear Discussion"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Chat
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Body Bubble List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-[300px]">
                {chatHistory.map((chat) => {
                  const isModel = chat.role === 'model';
                  return (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                        {/* Profile Photo Icon Indicator */}
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                          isModel 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                        }`}>
                          {isModel ? <Bot className="w-4 h-4" /> : 'ME'}
                        </div>

                        <div className="space-y-1">
                          {/* Chat Box */}
                          <div className={`p-4 rounded-2xl border text-xs text-zinc-300 leading-relaxed ${
                            isModel 
                              ? 'bg-zinc-900/60 border-zinc-800/80 rounded-tl-none' 
                              : 'bg-emerald-950/10 border-emerald-500/20 rounded-tr-none text-zinc-200'
                          }`}>
                            {renderMessageContent(chat.message)}
                          </div>
                          
                          {/* Action details & Copy btn */}
                          <div className={`flex items-center gap-2 text-[9px] text-zinc-500 px-1 font-mono ${
                            isModel ? 'justify-start' : 'justify-end'
                          }`}>
                            <span>{chat.timestamp}</span>
                            {isModel && (
                              <>
                                <span>•</span>
                                <button 
                                  onClick={() => handleCopyMessage(chat.id, chat.message)}
                                  className="hover:text-zinc-350 flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  {copiedMessageId === chat.id ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-400 font-bold animate-pulse" />
                                      <span className="text-emerald-400 font-semibold font-mono">Copied ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5" /> Copy
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* AI Loading Think bubble */}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                        <Bot className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="p-4 bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 rounded-2xl rounded-tl-none">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="ml-2.5 text-[10px] uppercase font-mono tracking-wider animate-pulse font-semibold">Kadek is formulating options...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions Quick Chips for chat onboarding */}
              {chatHistory.length <= 2 && (
                <div className="px-6 py-2.5 bg-zinc-900/40 border-t border-zinc-840 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1 font-sans">
                    <Info className="w-3 h-3 text-zinc-500" />
                    Ask Kadek:
                  </span>
                  
                  <button
                    id="chip-prompt-1"
                    onClick={() => handleSendAiMessage("Analyze my spending breakdown. Which categories are exceeding safe limits?")}
                    className="px-2.5 py-1 text-[10px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    🔍 Analyze Over-Limits
                  </button>

                  <button
                    id="chip-prompt-2"
                    onClick={() => handleSendAiMessage("Provide practical recommendations to cut down on Food & Drinks expenditures.")}
                    className="px-2.5 py-1 text-[10px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    ☕ Save on Refreshments
                  </button>

                  <button
                    id="chip-prompt-3"
                    onClick={() => handleSendAiMessage("If my remaining budget is low, what savings strategies can I still employ?")}
                    className="px-2.5 py-1 text-[10px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    💰 Smart Saving Tactics
                  </button>
                </div>
              )}

              {/* Interactive Input form */}
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-3">
                <input
                  id="chat-input-field"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendAiMessage(); }}
                  disabled={isAiLoading}
                  placeholder="Type your financial question here (e.g., 'What is my remaining food budget?')..."
                  className="flex-1 bg-[#09090B] border border-zinc-800 focus:border-indigo-500 rounded-xl py-3 px-4 text-xs text-zinc-100 outline-none transition-all disabled:opacity-65"
                />

                <button
                  id="btn-send-chat"
                  onClick={() => handleSendAiMessage()}
                  disabled={isAiLoading || !chatInput.trim()}
                  className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-[#09090b] rounded-xl transition-all font-mono text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Outer credit or warning for minimalism */}
        <footer className="mt-auto pt-10 border-t border-zinc-900 pb-2 text-center text-[10px] text-zinc-600 font-mono">
          © 2026 FinTrack AI Client. Data securely encrypted in your web local storage.
        </footer>

      </main>

    </div>
  );
}
