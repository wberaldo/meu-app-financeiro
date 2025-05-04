// --- START OF FILE App.js ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Use the revised App.css which handles responsive styles
import './App.css';
import {
  auth, signUp, logIn, logOut, onAuthStateChanged,
  createInitialUserProfile, createProfile, saveFinancialData,
  listenToProfiles, listenToFinancialData
} from './firebase';

// ** ADD Recharts import, including Sector and Legend **
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from 'recharts';

// Assets (Original)
import nubankLogo from './assets/cards/nubank.png';
import bbLogo from './assets/cards/bb.png';
import santanderLogo from './assets/cards/santander.png';

// --- Constants (Original) ---
const CARDS = {
  nubank: { name: 'Nubank', logo: nubankLogo },
  bb: { name: 'BB', logo: bbLogo },
  santander: { name: 'Santander', logo: santanderLogo }
};
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DEFAULT_CATEGORIES = [
    'Salário', 'Rendimentos', 'Presente', 'Reembolso', 'Moradia', 'Alimentação', 'Supermercado', 'Transporte', 'Contas Fixas', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Vestuário', 'Viagem', 'Impostos', 'Assinaturas', 'Cuidados Pessoais', 'Presentes/Doações', 'Investimentos (Saída)', 'Taxas Bancárias', 'Sem Categoria', 'Saldo Mês Anterior', 'Cartão de Crédito', 'Empréstimo', 'Financiamento', 'Seguro', 'Streaming', 'Internet', 'Combustível', 'Estacionamento', 'Farmácia'
  ];
const INITIAL_TAB = localStorage.getItem('activeTab') || 'dashboard';
const INITIAL_PROFILE = localStorage.getItem('selectedProfile') || null;

// --- Helper Functions (Original) ---
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const getCurrentMonthYear = () => { const now = new Date(); return { month: now.getMonth(), year: now.getFullYear() }; };
const generateYearOptions = (range = 5) => Array.from({ length: range * 2 + 1 }, (_, i) => new Date().getFullYear() - range + i);
const toInputDateString = (date) => {
    if (!date) return '';
    try {
        const d = (date instanceof Date) ? date : new Date(String(date).split('T')[0] + 'T12:00:00Z');
        if (isNaN(d.getTime())) return '';
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        console.error("Error in toInputDateString for date:", date);
        return '';
    }
};
const formatDateDisplay = (isoDateString) => { if (!isoDateString) return '---'; try { const date = new Date(String(isoDateString).split('T')[0] + 'T12:00:00Z'); if (isNaN(date.getTime())) return 'Inválida'; const day = String(date.getUTCDate()).padStart(2, '0'); const month = String(date.getUTCMonth() + 1).padStart(2, '0'); const year = date.getUTCFullYear(); return `${day}/${month}/${year}`; } catch { return 'Erro Data'; } };
const getEffectiveDateForFiltering = (item) => {
    const parseDateSafeUTC = (dateString) => {
        if (!dateString) return null;
        try {
            const d = new Date(String(dateString).split('T')[0] + 'T12:00:00Z');
            if (!isNaN(d.getTime())) return d;
        } catch {}
        return null;
    };
    let effectiveDate = null;
    if (item?.paymentMethod === 'credit' && item.paymentDate) {
        effectiveDate = parseDateSafeUTC(item.paymentDate);
    }
    if (!effectiveDate && item?.date) {
        effectiveDate = parseDateSafeUTC(item.date);
    }
    return effectiveDate;
};
const categorySorter = Intl.Collator(undefined, { sensitivity: 'base' }).compare;

// --- Child Components ---

// ** AuthForm Component **
const AuthForm = ({ onAuthSuccess }) => {
    const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isLogin, setIsLogin] = useState(true); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); setLoading(true); try { const userCredential = isLogin ? await logIn(email, password) : await signUp(email, password); if (!isLogin) await createInitialUserProfile(userCredential.user.uid); onAuthSuccess(userCredential.user); } catch (err) { setError(err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' ? 'Email ou senha inválidos.' : err.code === 'auth/email-already-in-use' ? 'Este email já está em uso.' : 'Ocorreu um erro. Tente novamente.'); console.error("Auth error:", err); } finally { setLoading(false); } };
    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-black">
            <h2 className="text-2xl font-bold mb-4 text-white">{isLogin ? 'Login' : 'Cadastro'}</h2>
            {error && <p className="text-red-500 mb-4 text-center text-sm">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-xs">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-base mb-4 focus:ring-cyan-400" />
                <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-base mb-4 focus:ring-cyan-400" />
                <button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md px-6 py-2 transition-colors mb-4 w-full disabled:opacity-50 disabled:cursor-not-allowed text-sm h-10 sm:h-[42px]">
                    {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                </button>
            </form>
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-cyan-400 hover:text-cyan-300 mt-2 text-sm">
                {isLogin ? 'Criar uma conta' : 'Já tenho uma conta'}
            </button>
        </div>
    );
};

// ** Header Component **
const Header = ({ user, profiles, selectedProfile, onSelectProfile, onCreateProfile, onLogout }) => {
    const [newProfileName, setNewProfileName] = useState('');
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [error, setError] = useState('');
    const [loadingCreate, setLoadingCreate] = useState(false);

    const handleCreateProfile = async () => {
        if (!newProfileName.trim() || !user) return;
        setError(''); setLoadingCreate(true);
        try { await onCreateProfile(newProfileName.trim()); setNewProfileName(''); setIsProfileDropdownOpen(false); }
        catch (e) { setError(e.message || 'Erro ao criar perfil.'); console.error("Profile creation error:", e); }
        finally { setLoadingCreate(false); }
     };
    const currentProfileName = useMemo(() => profiles.find(p => p.id === selectedProfile)?.name || 'Selecione', [profiles, selectedProfile]);
    useEffect(() => { const handleClickOutside = (event) => { if (isProfileDropdownOpen && !event.target.closest('.profile-dropdown-container')) setIsProfileDropdownOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isProfileDropdownOpen]);

    return (
        <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-800 relative flex items-center justify-between sm:justify-center h-16">
             <div className="hidden sm:flex sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2">
                 <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient">
                    Controle Financeiro
                </h1>
             </div>
             <div className="sm:hidden">
                 <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient">
                    CFinanceiro
                 </h1>
             </div>
            <div className="flex items-center space-x-2 sm:absolute sm:top-1/2 sm:right-4 sm:transform sm:-translate-y-1/2 sm:space-x-4">
                 <div className="relative profile-dropdown-container">
                    <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium rounded-md px-2.5 py-1.5 text-xs transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50 flex items-center h-10 sm:h-[42px] sm:px-4 sm:py-2 sm:text-base">
                        <span className="truncate">{currentProfileName}</span>
                        <span className="ml-1.5 sm:ml-2 text-xs">▼</span>
                    </button>
                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20 sm:w-64">
                             <div className="p-2.5 sm:p-4">
                                {error && <p className="text-red-500 text-xs sm:text-sm mb-2">{error}</p>}
                                <input type="text" placeholder="Nome do Novo Perfil" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} className="input-base text-xs sm:text-sm mb-2 focus:ring-cyan-400" />
                                <button onClick={handleCreateProfile} disabled={loadingCreate || !newProfileName.trim()} className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white font-medium rounded-md px-3 py-1.5 text-xs transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 h-9 sm:h-10 sm:py-2 sm:text-sm">
                                    {loadingCreate ? 'Criando...' : 'Criar Perfil'}
                                </button>
                            </div>
                            <div className="border-t border-gray-800 max-h-48 overflow-y-auto">
                                {profiles.length > 0 ? profiles.map((profile) => (
                                    <button key={profile.id} onClick={() => { onSelectProfile(profile.id); setIsProfileDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors sm:text-sm ${selectedProfile === profile.id ? 'bg-gray-700 font-semibold' : ''}`}>
                                        {profile.name}
                                    </button>
                                )) : <p className="text-gray-500 px-3 py-2 text-xs italic sm:text-sm">Nenhum perfil.</p>}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={onLogout}
                    title="Logout"
                    className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-medium rounded-md px-2.5 py-1.5 text-xs transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50 flex items-center h-10 sm:h-[42px] sm:px-4 sm:py-2 sm:text-base"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline ml-1">Logout</span>
                </button>
            </div>
        </header>
    );
};

// ** Tabs Component **
const Tabs = ({ activeTab, setActiveTab }) => {
    const tabsConfig = [ { id: 'dashboard', label: 'Dashboard', color: 'cyan-blue' }, { id: 'income', label: 'Receitas', color: 'green-teal' }, { id: 'expenses', label: 'Despesas', color: 'red-pink' }, { id: 'recurring', label: 'Recorrentes', color: 'orange-yellow' }, ];
    const getTabClasses = (tabId, color) => { const isActive = activeTab === tabId; const colors = { 'cyan-blue': { active: 'from-cyan-400 to-blue-500 shadow-cyan-500/50', hover: 'text-cyan-400' }, 'green-teal': { active: 'from-green-400 to-teal-500 shadow-green-500/50', hover: 'text-green-400' }, 'red-pink': { active: 'from-red-400 to-pink-500 shadow-red-500/50', hover: 'text-red-400' }, 'orange-yellow': { active: 'from-orange-400 to-yellow-500 shadow-orange-500/50', hover: 'text-orange-400' }, }; const colorClasses = colors[color] || colors['cyan-blue'];
        return `px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md transition-all duration-300 text-center ${isActive ? `bg-gradient-to-r ${colorClasses.active} text-white shadow-lg font-semibold` : `text-gray-400 hover:${colorClasses.hover} bg-gray-800 sm:bg-transparent`}`;
    };
    const mobileLabels = { dashboard: '📊', income: '💰', expenses: '💸', recurring: '🔁' };
    return (
        <div className="flex justify-center my-4 sm:my-6 px-2">
            <div className="flex flex-wrap space-x-1 bg-gray-900 rounded-lg p-1 sm:space-x-2">
                {tabsConfig.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={getTabClasses(tab.id, tab.color)}>
                        <span className="sm:hidden">{mobileLabels[tab.id] || tab.label.charAt(0)}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// ** MonthYearSelector Component **
const MonthYearSelector = ({ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear }) => {
    const yearOptions = useMemo(() => generateYearOptions(), []);
    return (
        <div className="flex flex-col sm:flex-row justify-center items-center mb-4 sm:mb-6 px-2 space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative w-full sm:w-auto">
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md px-3 pr-8 py-1.5 sm:py-2 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                >
                    {MONTH_NAMES.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                    ))}
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">▼</span>
            </div>
            <div className="relative w-full sm:w-auto">
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md px-3 pr-8 py-1.5 sm:py-2 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                >
                    {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">▼</span>
            </div>
        </div>
    );
};


// ** CardDropdown Component **
const CardDropdown = ({ cards, selectedCard, onSelectCard, baseColor = "gray" }) => {
    const [isOpen, setIsOpen] = useState(false); const colorClasses = { gray: { bg: 'bg-gray-800', border: 'border-gray-700', ring: 'focus:ring-gray-400', hoverBg: 'hover:bg-gray-700', dropdownBg: 'bg-gray-900' }, red: { bg: 'bg-red-800', border: 'border-red-700', ring: 'focus:ring-red-400', hoverBg: 'hover:bg-red-700', dropdownBg: 'bg-red-900' }, orange: { bg: 'bg-orange-800', border: 'border-orange-700', ring: 'focus:ring-orange-400', hoverBg: 'hover:bg-orange-700', dropdownBg: 'bg-orange-900' }, green: { bg: 'bg-green-800', border: 'border-green-700', ring: 'focus:ring-green-400', hoverBg: 'hover:bg-green-700', dropdownBg: 'bg-green-900' }, }; const currentColors = colorClasses[baseColor] || colorClasses.gray;
    useEffect(() => { const handleClickOutside = (event) => { if (isOpen && !event.target.closest('.card-dropdown-container')) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen]);
    return (
        <div className="relative card-dropdown-container">
            <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className={`w-full ${currentColors.bg} ${currentColors.border} rounded-md px-3 sm:px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentColors.ring} flex items-center justify-between h-10 sm:h-[42px]`}>
                {selectedCard && cards[selectedCard] ? (
                    <div className="flex items-center overflow-hidden">
                        <img src={cards[selectedCard].logo} alt={cards[selectedCard].name} className="card-logo mr-2 flex-shrink-0" />
                        <span className="truncate">{cards[selectedCard].name}</span>
                    </div>
                ) : ( <span className="text-gray-500">Selecione</span> )}
                <span className="ml-2 text-xs">▼</span>
            </button>
            {isOpen && (
                <div className={`absolute z-30 w-full ${currentColors.dropdownBg} ${currentColors.border} rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto`}>
                    {Object.entries(cards).map(([key, card]) => (
                        <div key={key} onClick={() => { onSelectCard(key); setIsOpen(false); }} className={`flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-white ${currentColors.hoverBg} cursor-pointer`}>
                            <img src={card.logo} alt={card.name} className="card-logo mr-2 flex-shrink-0" />
                            {card.name}
                        </div>
                    ))}
                    <div onClick={() => { onSelectCard(null); setIsOpen(false); }} className={`flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-400 ${currentColors.hoverBg} cursor-pointer italic`}>
                        Nenhum
                    </div>
                </div>
            )}
        </div>
    );
};

// ** UPDATED DashboardView Component (Legend, External Labels) **
const DashboardView = ({
    totals,
    balance,
    formatCurrency,
    expensesByCategory
}) => {
    const { totalIncome, totalExpenses, totalRecurring, totalInstallments } = totals;
    const totalOverallExpenses = totalExpenses + totalRecurring + totalInstallments;

    const [activeIndex, setActiveIndex] = useState(null);

    const PIE_COLORS = [
        '#2dd4bf', '#f97316', '#ec4899', '#facc15', '#38bdf8', '#a78bfa', '#ef4444', '#84cc16', '#6366f1',
    ];

    const pieChartData = useMemo(() => {
        return (expensesByCategory || [])
               .filter(cat => cat.value > 0)
               .map((entry, index) => ({
                    ...entry,
                    fill: PIE_COLORS[index % PIE_COLORS.length]
               }));
    }, [expensesByCategory]);

    const totalCategorizedExpenses = useMemo(() =>
        pieChartData.reduce((sum, entry) => sum + entry.value, 0),
    [pieChartData]);

    // Custom Tooltip
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const percent = totalCategorizedExpenses > 0 ? ((payload[0].value / totalCategorizedExpenses) * 100).toFixed(1) : 0;
            return (
              <div className="bg-gray-800 text-white p-2 rounded shadow-lg border border-gray-700 text-xs">
                <p className="font-semibold">{`${payload[0].name}`}</p>
                <p>{`${formatCurrency(payload[0].value)} (${percent}%)`}</p>
              </div>
            );
          }
          return null;
    };

    // Active Shape for Hover Effect
    const renderActiveShape = (props) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
      return (
        <g>
          <Sector
            cx={cx} cy={cy} innerRadius={innerRadius}
            outerRadius={outerRadius + 6} // Make active slice bigger
            startAngle={startAngle} endAngle={endAngle}
            fill={fill} stroke="#0f172a" strokeWidth={1}
          />
        </g>
      );
    };

    // External Label Renderer
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, fill }) => {
        const radiusLineStart = outerRadius + 5;
        const xLineStart = cx + radiusLineStart * Math.cos(-midAngle * RADIAN);
        const yLineStart = cy + radiusLineStart * Math.sin(-midAngle * RADIAN);
        const radiusText = outerRadius + 20;
        const xText = cx + radiusText * Math.cos(-midAngle * RADIAN);
        const yText = cy + radiusText * Math.sin(-midAngle * RADIAN);
        const textAnchor = xText > cx ? 'start' : 'end';

        return (
             <g>
                <path d={`M${xLineStart},${yLineStart}L${xText},${yText}`} stroke={fill} fill="none" strokeWidth={1} />
                <text x={xText + (xText > cx ? 3 : -3)} y={yText + 3}
                      fill="#cbd5e1" textAnchor={textAnchor}
                      dominantBaseline="middle" fontSize={11} >
                    {`${name} (${(percent * 100).toFixed(0)}%)`}
                </text>
            </g>
        );
    };

    // Hover event handlers
    const onPieEnter = useCallback((_, index) => { setActiveIndex(index); }, [setActiveIndex]);
    const onPieLeave = useCallback(() => { setActiveIndex(null); }, [setActiveIndex]);

    return (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
                 <div className="bg-gray-900 rounded-xl p-3 sm:p-6 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20"> <h3 className="text-sm sm:text-lg font-medium text-gray-300 mb-1 sm:mb-2">Receitas Totais</h3> <p className="text-xl sm:text-3xl font-bold text-cyan-400">{formatCurrency(totalIncome)}</p> </div>
                 <div className="bg-gray-900 rounded-xl p-3 sm:p-6 border-2 border-red-400 shadow-lg shadow-red-500/20"> <h3 className="text-sm sm:text-lg font-medium text-gray-300 mb-1 sm:mb-2">Despesas Totais</h3> <p className="text-xl sm:text-3xl font-bold text-red-400">{formatCurrency(totalOverallExpenses)}</p> </div>
                 <div className="bg-gray-900 rounded-xl p-3 sm:p-6 border-2 border-blue-400 shadow-lg shadow-blue-500/20"> <h3 className="text-sm sm:text-lg font-medium text-gray-300 mb-1 sm:mb-2">Saldo</h3> <p className={`text-xl sm:text-3xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-pink-400'}`}> {formatCurrency(balance)} </p> </div>
            </div>

            {/* Expense Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6 mb-4 sm:mb-8">
                {/* Pie Chart Card */}
                <div className="bg-gray-900 rounded-xl p-3 sm:p-5 border border-gray-800 shadow-lg chart-container-glow">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-4 text-center">Despesas por Categoria</h3>
                    {pieChartData && pieChartData.length > 0 ? (
                         <ResponsiveContainer width="100%" height={350}>
                             <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                                 <Pie
                                     activeIndex={activeIndex} activeShape={renderActiveShape}
                                     data={pieChartData} cx="50%" cy="50%"
                                     innerRadius={60} outerRadius={100} fill="#8884d8"
                                     paddingAngle={3} dataKey="value" nameKey="name"
                                     labelLine={true} // Keep line enabled
                                     label={renderCustomizedLabel} // Use external label renderer
                                     onMouseEnter={onPieEnter} onMouseLeave={onPieLeave}
                                 >
                                     {pieChartData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.fill} stroke={'#1E293B'} strokeWidth={1} />
                                     ))}
                                 </Pie>
                                 <Tooltip content={<CustomPieTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 }}/>
                             </PieChart>
                         </ResponsiveContainer>
                    ) : ( <div className="h-[350px] flex items-center justify-center text-gray-500 italic text-sm"> Sem dados de despesas para exibir. </div> )}
                </div>

                {/* Legend and Categories List Card (Now acts as Legend) */}
                <div className="bg-gray-900 rounded-xl p-3 sm:p-5 border border-gray-800 shadow-lg flex flex-col">
                     <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-4">Legenda / Categorias</h3>
                     {expensesByCategory && expensesByCategory.length > 0 ? (
                         <div className="flex-grow overflow-y-auto pr-2 text-xs sm:text-sm space-y-2">
                             {/* Iterate over ALL categories for legend */}
                             {expensesByCategory.map((cat, index) => (
                                 <div key={`legend-${index}`} className="flex items-center justify-between">
                                     <span className="flex items-center truncate">
                                         <span className="w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0" style={{ backgroundColor: pieChartData.find(p => p.name === cat.name)?.fill || PIE_COLORS[index % PIE_COLORS.length] }}></span>
                                         <span className="truncate text-gray-300" title={cat.name}>{cat.name}</span>
                                     </span>
                                     <span className="font-medium text-gray-400 flex-shrink-0 ml-2">{formatCurrency(cat.value)}</span>
                                 </div>
                             ))}
                         </div>
                     ) : ( <div className="flex-grow flex items-center justify-center text-gray-500 italic text-sm"> Sem dados de despesas para exibir. </div> )}
                </div>
            </div>
        </>
    );
};

// ** TransactionTable Component **
const TransactionTable = ({
    items, onRemove, onEditStart, onEditSave, onEditCancel, editingId, editForm, setEditForm, formatCurrency, formatDateDisplay, itemTypeColor = 'gray-300', allowEdit = true, showCard = false, cards = {}, showPaymentMethod = false, showDateColumn = false, showCategory = false, showPaymentDateColumn = false, sortConfig, onSortRequest, categories = [],
}) => {
    const getSortIndicator = (columnKey) => { if (!sortConfig || sortConfig.key !== columnKey) return null; return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'; };
    const getHeaderClasses = (columnKey) => { let c = `py-2 px-2 sm:py-3 sm:px-4 text-gray-400 font-medium text-[11px] sm:text-sm uppercase tracking-wider`; c += (columnKey === 'amount' || columnKey === 'actions') ? ' text-right' : ' text-left'; if (onSortRequest && ['date', 'paymentDate', 'description', 'category', 'amount'].includes(columnKey)) c += " cursor-pointer hover:text-white transition-colors"; return c; };
    const calculateColspan = () => { let span = 1; if (showDateColumn) span++; if (showPaymentDateColumn) span++; if (showCategory) span++; return span; }
    const totalColspan = calculateColspan();
    const sortedCategories = useMemo(() => [...categories].sort(categorySorter), [categories]);
    const minWidths = { date: 'min-w-[75px] sm:min-w-[90px]', paymentDate: 'min-w-[75px] sm:min-w-[90px]', description: 'min-w-[150px] sm:min-w-[200px]', category: 'min-w-[100px] sm:min-w-[120px]', amount: 'min-w-[90px] sm:min-w-[100px]', actions: 'min-w-[100px]' };

    return (
        <div className="overflow-x-auto mt-4 sm:mt-8 border border-gray-800 rounded-lg">
            <table className="w-full min-w-[600px] sm:min-w-[700px] table-auto">
                <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-700">
                        {showDateColumn && <th className={`${getHeaderClasses('date')} ${minWidths.date}`} onClick={() => onSortRequest?.('date')}>Data Compra {getSortIndicator('date')}</th>}
                        {showPaymentDateColumn && <th className={`${getHeaderClasses('paymentDate')} ${minWidths.paymentDate}`} onClick={() => onSortRequest?.('paymentDate')}>Data Pag. {getSortIndicator('paymentDate')}</th>}
                        <th className={`${getHeaderClasses('description')} ${minWidths.description}`} onClick={() => onSortRequest?.('description')}>Descrição {getSortIndicator('description')}</th>
                        {showCategory && <th className={`${getHeaderClasses('category')} ${minWidths.category}`} onClick={() => onSortRequest?.('category')}>Categoria {getSortIndicator('category')}</th>}
                        <th className={`${getHeaderClasses('amount')} ${minWidths.amount}`} onClick={() => onSortRequest?.('amount')}>Valor {getSortIndicator('amount')}</th>
                        {allowEdit && <th className={`${getHeaderClasses('actions')} ${minWidths.actions}`}>Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {items.map((item) => {
                        const isEditing = editingId === item.id;
                        return (
                            <tr key={item.id} className="hover:bg-gray-800/50 group text-xs sm:text-sm">
                                {showDateColumn && <td className={`py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap ${minWidths.date}`}>{isEditing ? <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="input-edit-base" style={{ colorScheme: 'dark' }} /> : formatDateDisplay(item.date)}</td>}
                                {showPaymentDateColumn && <td className={`py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap ${minWidths.paymentDate}`}>{isEditing ? ((editForm.paymentMethod === 'credit') ? <input type="date" value={editForm.paymentDate} onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })} className="input-edit-base" style={{ colorScheme: 'dark' }} /> : <span className="text-gray-600">N/A</span>) : (item.paymentMethod === 'credit' ? formatDateDisplay(item.paymentDate) : <span className="text-gray-600">N/A</span>)}</td>}
                                <td className={`py-2 px-2 sm:py-3 sm:px-4 max-w-xs ${minWidths.description}`}>{isEditing ? <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-edit-base w-full" /> : <div className="flex items-center space-x-1.5 sm:space-x-2"> {showPaymentMethod && item.paymentMethod && <span className={`payment-method-badge ${item.paymentMethod}`}>{item.paymentMethod === 'credit' ? 'C' : 'D'}</span>} {showCard && item.card && cards[item.card] && <img src={cards[item.card].logo} alt={cards[item.card].name} className="card-logo" title={cards[item.card].name} />} <span className="truncate group-hover:whitespace-normal group-hover:overflow-visible" title={item.description}>{item.description}</span> </div>}</td>
                                {showCategory && <td className={`py-2 px-2 sm:py-3 sm:px-4 text-gray-400 whitespace-nowrap ${minWidths.category}`}>{isEditing ? (<select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="input-edit-base appearance-none w-full cursor-pointer"><option value="">-- Categoria --</option>{sortedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>) : <span className="truncate">{item.category || '---'}</span>}</td>}
                                <td className={`py-2 px-2 sm:py-3 sm:px-4 text-right font-medium text-${itemTypeColor} whitespace-nowrap ${minWidths.amount}`}>{isEditing ? <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="input-edit-base w-20 sm:w-24 text-right" /> : formatCurrency(item.amount)}</td>
                                {allowEdit && (
                                     <td className={`py-2 px-2 sm:py-3 sm:px-4 text-right whitespace-nowrap ${minWidths.actions}`}>
                                        {isEditing ? (
                                            <div className="flex justify-end space-x-1 sm:space-x-2">
                                                <button onClick={() => onEditSave(item.id)} className="action-button save" title="Salvar">Salvar</button>
                                                <button onClick={onEditCancel} className="action-button cancel" title="Cancelar">Cancelar</button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end space-x-1 sm:space-x-2">
                                                <button onClick={() => onEditStart(item)} className="action-button edit" title="Editar">Editar</button>
                                                <button onClick={() => onRemove(item.id)} className="action-button remove" title="Remover">Remover</button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    {items.length > 0 && (<tr className="bg-gray-800/50 font-semibold text-xs sm:text-sm"><td colSpan={totalColspan + 1} className="py-2 px-2 sm:py-3 sm:px-4">Total</td><td className={`py-2 px-2 sm:py-3 sm:px-4 text-right font-bold text-${itemTypeColor}`}>{formatCurrency(items.reduce((acc, item) => acc + (item.amount || 0), 0))}</td>{allowEdit && <td></td>}</tr>)}
                </tbody>
            </table>
            {items.length === 0 && !editingId && (<p className="text-gray-500 italic text-center py-6 sm:py-4 text-xs sm:text-sm">Nenhum item para exibir.</p>)}
        </div>
    );
};

// ** TransactionSection Component **
const TransactionSection = ({
    title, items, fullList, onAddItem, onRemoveItem, onUpdateItem, itemTypeColor, baseColor, showCardOption = false, cards = {}, categories = [], isRecurring = false, formatCurrency, formatDateDisplay, selectedMonth, selectedYear
}) => {
    const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const [transactionDate, setTransactionDate] = useState(''); const [paymentDate, setPaymentDate] = useState(''); const [category, setCategory] = useState(''); const [selectedCard, setSelectedCard] = useState(''); const [paymentMethod, setPaymentMethod] = useState( (baseColor === 'green') ? 'deposit' : 'credit' );
    useEffect(() => { const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); let targetDate; if (selectedMonth === currentMonth && selectedYear === currentYear) { targetDate = new Date(currentYear, currentMonth, today.getDate(), 12, 0, 0); } else { targetDate = new Date(selectedYear, selectedMonth, 1, 12, 0, 0); } const initialDateValue = toInputDateString(targetDate); setTransactionDate(initialDateValue); setPaymentDate(''); }, [selectedMonth, selectedYear]);
    const [sortConfig, setSortConfig] = useState({ key: 'effectiveDate', direction: 'desc' }); const [editingId, setEditingId] = useState(null); const [editForm, setEditForm] = useState({ amount: '', description: '', date: '', paymentDate: '', category: '', paymentMethod: '' });
    const resetForm = useCallback(() => { setAmount(''); setDescription(''); setCategory(''); setSelectedCard(''); setPaymentMethod((baseColor === 'green') ? 'deposit' : 'credit'); const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); let targetDate; if (selectedMonth === currentMonth && selectedYear === currentYear) { targetDate = new Date(currentYear, currentMonth, today.getDate(), 12, 0, 0); } else { targetDate = new Date(selectedYear, selectedMonth, 1, 12, 0, 0); } const initialDateValue = toInputDateString(targetDate); setTransactionDate(initialDateValue); setPaymentDate(''); }, [baseColor, selectedMonth, selectedYear]);
    const handleSortRequest = (key) => { let direction = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }; const sortKey = (key === 'date' || key === 'paymentDate') ? key : 'effectiveDate'; setSortConfig({ key: sortKey, direction }); };
    const handleAdd = () => { const parsedAmount = parseFloat(amount); let itemDateISO = '', itemPaymentDateISO = null; try { const d = new Date(transactionDate + 'T12:00:00Z'); if (!transactionDate || isNaN(d.getTime())) throw new Error(); itemDateISO = d.toISOString(); } catch { alert('Data da Transação inválida.'); return; } if (paymentMethod === 'credit' && paymentDate) { try { const d = new Date(paymentDate + 'T12:00:00Z'); if (isNaN(d.getTime())) throw new Error(); itemPaymentDateISO = d.toISOString(); } catch { alert('Data de Pagamento inválida.'); return; } } if (description.trim() && !isNaN(parsedAmount) && parsedAmount > 0 && itemDateISO) { onAddItem({ amount: parsedAmount, description: description.trim(), date: itemDateISO, paymentDate: itemPaymentDateISO, category: category || null, paymentMethod: (baseColor === 'green') ? undefined : paymentMethod, card: showCardOption ? (selectedCard || null) : undefined }); resetForm(); } else { alert('Preencha Valor (>0), Descrição e Data da Transação válidos.'); } };
    const handleEditStart = (item) => { setEditingId(item.id); setEditForm({ amount: item.amount ?? '', description: item.description ?? '', date: toInputDateString(item.date), paymentDate: toInputDateString(item.paymentDate), category: item.category || '', paymentMethod: item.paymentMethod || ((baseColor === 'green') ? 'deposit' : 'credit') }); };
    const handleEditSave = (id) => { const parsedAmount = parseFloat(editForm.amount); let updatedDateISO = '', updatedPaymentDateISO = null; try { const d = new Date(editForm.date + 'T12:00:00Z'); if (!editForm.date || isNaN(d.getTime())) throw new Error(); updatedDateISO = d.toISOString(); } catch { alert('Data da Transação inválida.'); return; } if (editForm.paymentMethod === 'credit' && editForm.paymentDate) { try { const d = new Date(editForm.paymentDate + 'T12:00:00Z'); if (isNaN(d.getTime())) throw new Error(); updatedPaymentDateISO = d.toISOString(); } catch { alert('Data de Pagamento inválida.'); return; } } else if (editForm.paymentMethod !== 'credit') { updatedPaymentDateISO = null; } if (editForm.description.trim() && !isNaN(parsedAmount) && parsedAmount >= 0 && updatedDateISO) { const updatedData = { amount: parsedAmount, description: editForm.description.trim(), date: updatedDateISO, paymentDate: updatedPaymentDateISO, category: editForm.category || null, paymentMethod: editForm.paymentMethod }; onUpdateItem(id, updatedData); handleEditCancel(); } else { alert('Verifique os campos ao editar (Valor >= 0, Descrição, Data da Transação).'); } };
    const handleEditCancel = () => { setEditingId(null); setEditForm({ amount: '', description: '', date: '', paymentDate: '', category: '', paymentMethod: '' }); };
    const sortedItems = useMemo(() => { const itemsToSort = items || []; return [...itemsToSort].sort((a, b) => { let valA, valB; if (sortConfig.key === 'effectiveDate') { const effA = getEffectiveDateForFiltering(a); const effB = getEffectiveDateForFiltering(b); valA = effA ? effA.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity); valB = effB ? effB.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity); } else if (sortConfig.key === 'date' || sortConfig.key === 'paymentDate') { const dateA = a[sortConfig.key] ? new Date(String(a[sortConfig.key]).split('T')[0] + 'T12:00:00Z').getTime() : null; const dateB = b[sortConfig.key] ? new Date(String(b[sortConfig.key]).split('T')[0] + 'T12:00:00Z').getTime() : null; valA = dateA && !isNaN(dateA) ? dateA : (sortConfig.direction === 'asc' ? Infinity : -Infinity); valB = dateB && !isNaN(dateB) ? dateB : (sortConfig.direction === 'asc' ? Infinity : -Infinity); } else if (sortConfig.key === 'amount') { valA = a.amount || 0; valB = b.amount || 0; } else { valA = String(a[sortConfig.key] || '').toLowerCase(); valB = String(b[sortConfig.key] || '').toLowerCase(); const comparison = valA.localeCompare(valB); return sortConfig.direction === 'asc' ? comparison : -comparison; } if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); }, [items, sortConfig]);
    const formColorClasses = { gray: { border: 'border-gray-700', ring: 'focus:ring-gray-400' }, green: { border: 'border-green-700', ring: 'focus:ring-green-400' }, red: { border: 'border-red-700', ring: 'focus:ring-red-400' }, orange: { border: 'border-orange-700', ring: 'focus:ring-orange-400' }, }; const currentFormColors = formColorClasses[baseColor] || formColorClasses.gray; const buttonGradientClasses = { green: 'from-green-400 to-teal-500 hover:shadow-green-500/50', red: 'from-red-400 to-pink-500 hover:shadow-red-500/50', orange: 'from-orange-400 to-yellow-500 hover:shadow-orange-500/50', }; const currentButtonGradient = buttonGradientClasses[baseColor] || 'from-gray-400 to-gray-600';
    const getPaymentMethodButtonClasses = (method) => { const isActive = paymentMethod === method; const styles = { red: { active: 'payment-btn-active red', inactive: 'payment-btn-inactive' }, orange: { active: 'payment-btn-active orange', inactive: 'payment-btn-inactive' }, default: { active: 'payment-btn-active gray', inactive: 'payment-btn-inactive' } }; const themeStyles = styles[baseColor] || styles.default; return `payment-btn-base ${isActive ? themeStyles.active : themeStyles.inactive}`; }; const showPaymentDateField = baseColor !== 'green' && paymentMethod === 'credit'; const sortedCategories = useMemo(() => [...categories].sort(categorySorter), [categories]);

    return (
        <div className={`bg-gray-900 rounded-xl p-3 sm:p-6 border-2 border-${baseColor}-400 shadow-lg shadow-${baseColor}-500/20 mb-4 sm:mb-8`}>
            <h2 className={`text-base sm:text-xl font-semibold text-${baseColor}-400 mb-4 sm:mb-6`}>{title}</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-3 sm:gap-y-5 mb-4 sm:mb-6 items-end">
                 <div> <label htmlFor={`${baseColor}-amount`} className="input-label">Valor (*)</label> <input id={`${baseColor}-amount`} type="number" placeholder="0.00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className={`input-base ${currentFormColors.border} ${currentFormColors.ring}`} /> </div>
                 <div> <label htmlFor={`${baseColor}-description`} className="input-label">Descrição (*)</label> <input id={`${baseColor}-description`} type="text" placeholder="Descrição da transação" value={description} onChange={(e) => setDescription(e.target.value)} required className={`input-base ${currentFormColors.border} ${currentFormColors.ring}`} /> </div>
                 <div> <label htmlFor={`${baseColor}-date`} className="input-label">Data Transação (*)</label> <input id={`${baseColor}-date`} type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required className={`input-base appearance-none ${currentFormColors.border} ${currentFormColors.ring}`} style={{ colorScheme: 'dark' }} /> </div>
                 <div className="relative">
                    <label htmlFor={`${baseColor}-category`} className="input-label">Categoria</label>
                    <select id={`${baseColor}-category`} value={category} onChange={(e) => setCategory(e.target.value)} className={`input-base appearance-none cursor-pointer ${currentFormColors.border} ${currentFormColors.ring} pr-8`}>
                         <option value="">-- Selecione --</option>
                         {sortedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                     <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none mt-3">▼</span>
                 </div>
                 {baseColor !== 'green' && ( <div> <label className="input-label">Tipo</label> <div className="flex rounded-md overflow-hidden border border-gray-700"> <button type="button" onClick={() => setPaymentMethod('credit')} className={`${getPaymentMethodButtonClasses('credit')} rounded-l-md flex-1`}>Crédito</button> <button type="button" onClick={() => setPaymentMethod('debit')} className={`${getPaymentMethodButtonClasses('debit')} rounded-r-md flex-1`}>Débito</button> </div> </div> )}
                 {showPaymentDateField && ( <div> <label htmlFor={`${baseColor}-paymentDate`} className="input-label">Data Pagamento</label> <input id={`${baseColor}-paymentDate`} type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={`input-base appearance-none ${currentFormColors.border} ${currentFormColors.ring}`} style={{ colorScheme: 'dark' }} /> </div> )}
                 {showCardOption && ( <div> <label className="input-label">Cartão</label> <CardDropdown cards={cards} selectedCard={selectedCard} onSelectCard={setSelectedCard} baseColor={baseColor} /> </div> )}
                 <div className="lg:col-start-4 flex items-end">
                     <button onClick={handleAdd} className={`add-button w-full ${currentButtonGradient}`}> Adicionar </button>
                 </div>
            </div>
            {baseColor === 'red' && !isRecurring && <InstallmentSection onAddInstallment={onAddItem} baseColor={baseColor} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
            <h3 className="list-title"> {isRecurring ? "Itens Registrados" : `Considerados em ${MONTH_NAMES[selectedMonth]} de ${selectedYear}`} <span className="list-subtitle">{!isRecurring && "(Baseado na Data de Pagamento para Crédito)"}</span> </h3>
            <TransactionTable
                items={sortedItems}
                onRemove={onRemoveItem} onEditStart={handleEditStart} onEditSave={handleEditSave} onEditCancel={handleEditCancel}
                editingId={editingId} editForm={editForm} setEditForm={setEditForm}
                formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay}
                itemTypeColor={itemTypeColor} allowEdit={true}
                showCard={showCardOption} cards={cards}
                showPaymentMethod={baseColor !== 'green'}
                showDateColumn={true}
                showPaymentDateColumn={baseColor !== 'green'}
                showCategory={true}
                sortConfig={sortConfig} onSortRequest={handleSortRequest}
                categories={categories}
            />
            {baseColor === 'red' && !isRecurring && (
                <InstallmentList
                    installments={fullList?.filter(i => i.isInstallment) ?? []}
                    selectedMonth={selectedMonth} selectedYear={selectedYear}
                    formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay}
                    onRemoveInstallment={onRemoveItem}
                    itemTypeColor={itemTypeColor} showPaymentMethod={true}
                    showDateColumn={true} showCategory={true}
                 />
             )}
        </div>
    );
};

// ** InstallmentSection Component **
const InstallmentSection = ({ onAddInstallment, baseColor, selectedMonth, selectedYear }) => {
    const [totalAmount, setTotalAmount] = useState(''); const [description, setDescription] = useState(''); const [months, setMonths] = useState(2);
    const handleAddInstallment = () => { const pa = parseFloat(totalAmount); const nm = parseInt(months); if (description.trim() && !isNaN(pa) && pa > 0 && !isNaN(nm) && nm >= 2) { const ia = Math.round((pa / nm) * 100) / 100; const fDate = new Date(selectedYear, selectedMonth, 1); const gId = `inst-${Date.now()}`; for (let i = 0; i < nm; i++) { const date = new Date(fDate); date.setMonth(fDate.getMonth() + i); onAddInstallment({ amount: ia, description: `${description.trim()} (${i + 1}/${nm})`, date: date.toISOString(), isInstallment: true, paymentMethod: 'credit', category: 'Parcelamento', installmentInfo: { groupId: gId, totalAmount: pa, totalMonths: nm, currentInstallment: i + 1, purchaseDate: fDate.toISOString() } }); } setTotalAmount(''); setDescription(''); setMonths(2); } else { alert('Insira Valor Total (>0), Descrição e Nº Parcelas (>=2).'); } };
    const formColors = { border: 'border-red-700', ring: 'focus:ring-red-400' }; const btnGradient = 'from-red-400 to-pink-500 hover:shadow-red-500/50';
    return (
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700/50 sm:border-gray-700">
            <h3 className={`text-sm sm:text-lg font-semibold text-${baseColor}-400 mb-4 sm:mb-6`}>Adicionar Compra Parcelada</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-3 sm:gap-y-5 mb-4 sm:mb-6 items-end">
                 <div> <label htmlFor="inst-amount" className="input-label">Valor Total (*)</label> <input id="inst-amount" type="number" placeholder="1200.00" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required className={`input-base ${formColors.border} ${formColors.ring}`} /> </div>
                 <div> <label htmlFor="inst-description" className="input-label">Descrição (*)</label> <input id="inst-description" type="text" placeholder="Ex: Celular Novo" value={description} onChange={e => setDescription(e.target.value)} required className={`input-base ${formColors.border} ${formColors.ring}`} /> </div>
                 <div> <label htmlFor="inst-months" className="input-label">Nº Parcelas (*)</label> <input id="inst-months" type="number" min="2" step="1" placeholder="Ex: 12" value={months} onChange={e => setMonths(parseInt(e.target.value) || 2)} required className={`input-base ${formColors.border} ${formColors.ring}`} /> </div>
                 <div className="lg:col-start-4 flex items-end">
                     <button onClick={handleAddInstallment} className={`add-button w-full ${btnGradient}`}> Parcelar </button>
                 </div>
            </div>
        </div>
     );
};

// ** InstallmentList Component **
const InstallmentList = ({
    installments, selectedMonth, selectedYear, formatCurrency, formatDateDisplay, onRemoveInstallment, itemTypeColor, showPaymentMethod = false, showDateColumn = false, showCategory = false,
}) => {
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
    const handleSortRequest = (key) => { let d = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') d = 'desc'; setSortConfig({ key, direction: d }); };
    const displayInstallments = useMemo(() => { const filtered = (installments || []).filter(item => { if (!item.date || !item.isInstallment) return false; try { const d = new Date(String(item.date).split('T')[0] + 'T12:00:00Z'); return !isNaN(d.getTime()) && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear; } catch { return false; } }); return [...filtered].sort((a, b) => { let vA = a[sortConfig.key], vB = b[sortConfig.key]; if (sortConfig.key === 'date') { try { vA = new Date(String(a.date||0).split('T')[0] + 'T12:00:00Z').getTime(); vB = new Date(String(b.date||0).split('T')[0] + 'T12:00:00Z').getTime(); vA=isNaN(vA)?(sortConfig.direction==='asc'?Infinity:-Infinity):vA; vB=isNaN(vB)?(sortConfig.direction==='asc'?Infinity:-Infinity):vB;} catch{vA=Infinity;vB=Infinity;} } else if (sortConfig.key === 'amount'){ vA=a.amount||0; vB=b.amount||0; } else { vA=String(vA||'').toLowerCase(); vB=String(vB||'').toLowerCase(); const comp = vA.localeCompare(vB); return sortConfig.direction === 'asc' ? comp : -comp; } if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1; if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); }, [installments, selectedMonth, selectedYear, sortConfig]);
    if (displayInstallments.length === 0) return null;
    return (
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700/50 sm:border-gray-700">
            <h3 className="list-title"> Parcelas de {MONTH_NAMES[selectedMonth]}/{selectedYear} </h3>
            <TransactionTable
                items={displayInstallments}
                onRemove={onRemoveInstallment}
                allowEdit={false}
                formatCurrency={formatCurrency}
                formatDateDisplay={formatDateDisplay}
                itemTypeColor={itemTypeColor}
                showPaymentMethod={showPaymentMethod}
                showDateColumn={showDateColumn}
                showCategory={false}
                showPaymentDateColumn={false}
                sortConfig={sortConfig}
                onSortRequest={handleSortRequest}
             />
        </div>
     );
};


// --- Main App Component ---
const FinancialApp = () => {
    // State
    const [user, setUser] = useState(null); const [loadingAuth, setLoadingAuth] = useState(true); const [authError, setAuthError] = useState(''); const [profiles, setProfiles] = useState([]); const [selectedProfile, setSelectedProfile] = useState(INITIAL_PROFILE); const [loadingProfiles, setLoadingProfiles] = useState(true); const [profileError, setProfileError] = useState(''); const [financialData, setFinancialData] = useState({ incomeList: [], expenseList: [], recurringList: [] }); const [loadingData, setLoadingData] = useState(true); const [dataError, setDataError] = useState(''); const [isSaving, setIsSaving] = useState(false); const [activeTab, setActiveTab] = useState(INITIAL_TAB); const [currentMonthYear, setCurrentMonthYear] = useState(getCurrentMonthYear()); const { month: selectedMonth, year: selectedYear } = currentMonthYear;
    // Effects
    useEffect(() => { setLoadingAuth(true); const u = onAuthStateChanged(auth, (usr) => { setUser(usr); if (!usr) { setSelectedProfile(null); setProfiles([]); setFinancialData({ incomeList: [], expenseList: [], recurringList: [] }); localStorage.clear(); setLoadingProfiles(false); setLoadingData(false); } setLoadingAuth(false); }, (e) => { setAuthError("Erro auth."); setLoadingAuth(false); }); return u; }, []);
    useEffect(() => { if (!user) { setLoadingProfiles(false); setProfiles([]); setSelectedProfile(null); return; } setLoadingProfiles(true); setProfileError(''); const u = listenToProfiles(user.uid, (p) => { setProfiles(p); const s = localStorage.getItem('selectedProfile'); if (s && p.some(i => i.id === s)) setSelectedProfile(s); else if (p.length > 0) { const firstId = p[0].id; setSelectedProfile(firstId); localStorage.setItem('selectedProfile', firstId); } else { setSelectedProfile(null); localStorage.removeItem('selectedProfile');} setLoadingProfiles(false); }, (e) => { setProfileError("Erro perfis."); setLoadingProfiles(false); }); return u; }, [user]);
    useEffect(() => { if (!user || !selectedProfile) { setFinancialData({ incomeList: [], expenseList: [], recurringList: [] }); setLoadingData(false); return; } setLoadingData(true); setDataError(''); const u = listenToFinancialData(user.uid, selectedProfile, (d) => { setFinancialData({ incomeList: d?.incomeList || [], expenseList: d?.expenseList || [], recurringList: d?.recurringList || [] }); setLoadingData(false); }, (e) => { setDataError("Erro dados."); setLoadingData(false); }); return u; }, [user, selectedProfile]);
    useEffect(() => { if (loadingData || loadingAuth || loadingProfiles || !user || !selectedProfile) return; setIsSaving(true); const t = setTimeout(() => { saveFinancialData(user.uid, selectedProfile, financialData).then(() => setIsSaving(false)).catch((e) => { setDataError("Falha ao salvar."); setIsSaving(false); }); }, 1500); return () => clearTimeout(t); }, [financialData, user, selectedProfile, loadingData, loadingAuth, loadingProfiles]);
    useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]); useEffect(() => { if (selectedProfile) localStorage.setItem('selectedProfile', selectedProfile); else localStorage.removeItem('selectedProfile'); }, [selectedProfile]);
    // Handlers
    const handleAuthSuccess = useCallback((u) => { setAuthError(''); }, []);
    const handleLogout = useCallback(async () => { setAuthError(''); try { await logOut(); } catch { setAuthError('Erro logout.'); } }, []);
    const handleCreateProfile = useCallback(async (name) => { if (!user) return; setProfileError(''); try { await createProfile(user.uid, name); alert('Perfil criado!'); } catch (e) { setProfileError(e.message || 'Erro criar perfil.'); throw e;} }, [user]);
    const handleSelectProfile = useCallback((id) => { if (id !== selectedProfile) { setDataError(''); setProfileError(''); setSelectedProfile(id); } }, [selectedProfile]);
    // Data Ops
    const addItem = useCallback((itemType, newItemData) => { if (!user || !selectedProfile) return; const listName = `${itemType}List`; const newItem = { ...newItemData, id: `id-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), category: newItemData.category || null, paymentDate: newItemData.paymentDate ?? null, card: newItemData.card ?? null }; const sanitizedItem = Object.entries(newItem).reduce((a, [k, v]) => { if (v !== undefined) a[k] = v; return a; }, {}); setFinancialData(prev => ({ ...prev, [listName]: [...(prev[listName] || []), sanitizedItem] })); }, [user, selectedProfile]);
    const removeItem = useCallback((itemType, id) => { if (!user || !selectedProfile) return; setFinancialData(prev => ({ ...prev, [`${itemType}List`]: (prev[`${itemType}List`] || []).filter(i => i.id !== id) })); }, [user, selectedProfile]);
    const updateItem = useCallback((itemType, id, data) => { if (!user || !selectedProfile) return; const listName = `${itemType}List`; const sanitized = Object.entries(data).reduce((a, [k, v]) => { if (v !== undefined) a[k] = v; return a; }, { updatedAt: new Date().toISOString() }); setFinancialData(prev => ({ ...prev, [listName]: (prev[listName] || []).map(i => i.id === id ? { ...i, ...sanitized } : i) })); }, [user, selectedProfile]);
    // Calculations
    const { effectiveMonthlyIncome, effectiveMonthlyExpenses, effectiveMonthlyRecurring } = useMemo(() => { const filter = (item) => { const d = getEffectiveDateForFiltering(item); return d && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear; }; const filteredExpenses = (financialData.expenseList || []).filter(filter); const filteredRecurring = (financialData.recurringList || []).filter(filter); return { effectiveMonthlyIncome: (financialData.incomeList || []).filter(filter), effectiveMonthlyExpenses: filteredExpenses, effectiveMonthlyRecurring: filteredRecurring, }; }, [financialData, selectedMonth, selectedYear]);
    const allIncomeList = useMemo(() => financialData.incomeList || [], [financialData.incomeList]); const allExpenseList = useMemo(() => financialData.expenseList || [], [financialData.expenseList]); const allRecurringExpensesList = useMemo(() => financialData.recurringList || [], [financialData.recurringList]);
    const totals = useMemo(() => { const singleExp = effectiveMonthlyExpenses.filter(i => !i.isInstallment).reduce((s, i) => s + (i.amount || 0), 0); const instExp = effectiveMonthlyExpenses.filter(i => i.isInstallment).reduce((s, i) => s + (i.amount || 0), 0); const recurExp = effectiveMonthlyRecurring.reduce((s, i) => s + (i.amount || 0), 0); return { totalIncome: effectiveMonthlyIncome.reduce((s, i) => s + (i.amount || 0), 0), totalExpenses: singleExp, totalInstallments: instExp, totalRecurring: recurExp, }; }, [effectiveMonthlyIncome, effectiveMonthlyExpenses, effectiveMonthlyRecurring]);
    const balance = useMemo(() => totals.totalIncome - (totals.totalExpenses + totals.totalInstallments + totals.totalRecurring), [totals]);
    const expensesByCategory = useMemo(() => { const combinedExpenses = [ ...effectiveMonthlyExpenses.filter(i => !i.isInstallment), ...effectiveMonthlyRecurring ]; const grouped = combinedExpenses.reduce((acc, item) => { const category = item.category || 'Sem Categoria'; const currentTotal = acc[category] || 0; acc[category] = currentTotal + (item.amount || 0); return acc; }, {}); return Object.entries(grouped).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value); }, [effectiveMonthlyExpenses, effectiveMonthlyRecurring]);
    // Render Logic
    const isLoading = loadingAuth || loadingProfiles || loadingData;
    if (loadingAuth && !user) return <div className="loading-screen">Carregando...</div>;

    return (
        <div className="min-h-screen bg-black text-gray-100 font-poppins flex flex-col">
            {!user ? ( <AuthForm onAuthSuccess={handleAuthSuccess} /> ) : (
                <>
                    <Header user={user} profiles={profiles} selectedProfile={selectedProfile} onSelectProfile={handleSelectProfile} onCreateProfile={handleCreateProfile} onLogout={handleLogout} />
                     <div className="status-bar">
                        {isSaving && <span className="saving-text">Salvando...</span>}
                        {dataError && <span className="error-text">{dataError}</span>}
                        {profileError && <span className="error-text">{profileError}</span>}
                        {authError && <span className="error-text">{authError}</span>}
                        {!isSaving && !dataError && !profileError && !authError && <span> </span>}
                    </div>
                     {!selectedProfile && !loadingProfiles && !isLoading && ( <div className="profile-prompt"> Selecione ou crie um perfil para começar. </div> )}
                    {selectedProfile ? (
                        <main className="flex-grow container mx-auto px-2 sm:px-4 pb-4 sm:pb-8">
                             <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                            <MonthYearSelector selectedMonth={selectedMonth} selectedYear={selectedYear} setSelectedMonth={(m) => setCurrentMonthYear(p => ({ ...p, month: m }))} setSelectedYear={(y) => setCurrentMonthYear(p => ({ ...p, year: y }))} />
                            {isLoading && <div className="loading-data">Carregando dados...</div>}
                            {!isLoading && (
                                <div>
                                    {activeTab === 'dashboard' &&
                                        <DashboardView
                                            totals={totals}
                                            balance={balance}
                                            formatCurrency={formatCurrency}
                                            expensesByCategory={expensesByCategory}
                                        />}
                                    {activeTab === 'income' && <TransactionSection title="Gerenciar Receitas" items={effectiveMonthlyIncome} fullList={allIncomeList} onAddItem={(d)=>addItem('income',d)} onRemoveItem={(id)=>removeItem('income',id)} onUpdateItem={(id,d)=>updateItem('income',id,d)} itemTypeColor="green-400" baseColor="green" categories={DEFAULT_CATEGORIES} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
                                    {activeTab === 'expenses' && <TransactionSection title="Gerenciar Despesas" items={effectiveMonthlyExpenses.filter(i => !i.isInstallment)} fullList={allExpenseList} onAddItem={(d)=>addItem('expense',d)} onRemoveItem={(id)=>removeItem('expense',id)} onUpdateItem={(id,d)=>updateItem('expense',id,d)} itemTypeColor="red-400" baseColor="red" categories={DEFAULT_CATEGORIES} showCardOption={true} cards={CARDS} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
                                    {activeTab === 'recurring' && <TransactionSection title="Gerenciar Despesas Recorrentes" items={allRecurringExpensesList} fullList={allRecurringExpensesList} onAddItem={(d)=>addItem('recurring',d)} onRemoveItem={(id)=>removeItem('recurring',id)} onUpdateItem={(id,d)=>updateItem('recurring',id,d)} itemTypeColor="orange-400" baseColor="orange" categories={DEFAULT_CATEGORIES} showCardOption={true} cards={CARDS} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} selectedMonth={selectedMonth} selectedYear={selectedYear} isRecurring={true} />}
                                </div>
                            )}
                        </main>
                    ) : ( !isLoading && !loadingProfiles && <div className="no-profile-selected">Selecione ou crie um perfil.</div> )}
                    <footer className="app-footer">
                         <p> Desenvolvido por{' '}
                             <span className="developer-name animate-pulse"> Wellington Beraldo </span>
                         </p>
                    </footer>
                </>
            )}
        </div>
    );
};

export default FinancialApp;

// --- END OF FULL COMPLETE CORRECTED FILE App.js ---