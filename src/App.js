// --- START OF FILE App.js ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css'; // Tailwind directives
import {
  auth, signUp, logIn, logOut, onAuthStateChanged,
  createInitialUserProfile, createProfile, saveFinancialData,
  listenToProfiles, listenToFinancialData
} from './firebase'; // Ensure firebase.js handles optional 'paymentDate'

// Assets
import nubankLogo from './assets/cards/nubank.png';
import bbLogo from './assets/cards/bb.png';
import santanderLogo from './assets/cards/santander.png';

// --- Constants ---
const CARDS = {
  nubank: { name: 'Nubank', logo: nubankLogo },
  bb: { name: 'BB', logo: bbLogo },
  santander: { name: 'Santander', logo: santanderLogo }
};
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DEFAULT_CATEGORIES = [
    'Salário', 'Freelance', 'Rendimentos', 'Presente', 'Reembolso', 'Outras Receitas', 'Moradia', 'Alimentação', 'Supermercado', 'Transporte', 'Contas Fixas', 'Saúde', 'Educação', 'Lazer', 'Restaurantes/Bares', 'Compras', 'Vestuário', 'Viagem', 'Impostos', 'Assinaturas', 'Cuidados Pessoais', 'Presentes/Doações', 'Investimentos (Saída)', 'Taxas Bancárias', 'Outras Despesas', 'Sem Categoria', 'Saldo Mês Anterior', 'Cartão de Crédito', 'Empréstimo', 'Financiamento', 'Seguro', 'Streaming', 'Internet', 'Combustível', 'Estacionamento'
  ];
const INITIAL_TAB = localStorage.getItem('activeTab') || 'dashboard';
const INITIAL_PROFILE = localStorage.getItem('selectedProfile') || null;

// --- Helper Functions ---
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const getCurrentMonthYear = () => { const now = new Date(); return { month: now.getMonth(), year: now.getFullYear() }; };
const generateYearOptions = (range = 5) => Array.from({ length: range * 2 + 1 }, (_, i) => new Date().getFullYear() - range + i);

// ** Revised toInputDateString for reliability **
const toInputDateString = (date) => {
    if (!date) return '';
    try {
        const d = (date instanceof Date) ? date : new Date(String(date).split('T')[0] + 'T12:00:00Z'); // Parse as UTC noon to reduce ambiguity
        if (isNaN(d.getTime())) return '';

        // Use UTC methods to get components from the consistent UTC date
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth is 0-indexed
        const day = String(d.getUTCDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch {
        console.error("Error in toInputDateString for date:", date);
        return '';
    }
};
const formatDateDisplay = (isoDateString) => { if (!isoDateString) return '---'; try { const date = new Date(String(isoDateString).split('T')[0] + 'T12:00:00Z'); if (isNaN(date.getTime())) return 'Inválida'; const day = String(date.getUTCDate()).padStart(2, '0'); const month = String(date.getUTCMonth() + 1).padStart(2, '0'); const year = date.getUTCFullYear(); return `${day}/${month}/${year}`; } catch { return 'Erro Data'; } };

// ** Revised getEffectiveDateForFiltering for reliability **
const getEffectiveDateForFiltering = (item) => {
    const parseDateSafeUTC = (dateString) => {
        if (!dateString) return null;
        try {
            // Consistently parse YYYY-MM-DD or ISO string to UTC Date object (using noon)
            const d = new Date(String(dateString).split('T')[0] + 'T12:00:00Z');
            if (!isNaN(d.getTime())) return d;
        } catch {}
        return null;
    };

    let effectiveDate = null;
    if (item?.paymentMethod === 'credit' && item.paymentDate) {
        effectiveDate = parseDateSafeUTC(item.paymentDate);
    }
    if (!effectiveDate && item?.date) { // Fallback to transaction date if payment date invalid or not applicable
        effectiveDate = parseDateSafeUTC(item.date);
    }
    return effectiveDate; // Returns a Date object (in UTC) or null
};
const categorySorter = Intl.Collator(undefined, { sensitivity: 'base' }).compare;

// --- Child Components ---

// ** AuthForm Component ** (No changes)
const AuthForm = ({ onAuthSuccess }) => {
    const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isLogin, setIsLogin] = useState(true); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); setLoading(true); try { const userCredential = isLogin ? await logIn(email, password) : await signUp(email, password); if (!isLogin) await createInitialUserProfile(userCredential.user.uid); onAuthSuccess(userCredential.user); } catch (err) { setError(err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' ? 'Email ou senha inválidos.' : err.code === 'auth/email-already-in-use' ? 'Este email já está em uso.' : 'Ocorreu um erro. Tente novamente.'); console.error("Auth error:", err); } finally { setLoading(false); } };
    return ( <div className="flex flex-col items-center justify-center min-h-screen px-4"> <h2 className="text-2xl font-bold mb-4">{isLogin ? 'Login' : 'Cadastro'}</h2> {error && <p className="text-red-500 mb-4 text-center text-sm">{error}</p>} <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-xs"> <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" /> <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" /> <button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md px-6 py-2 transition-colors mb-4 w-full disabled:opacity-50 disabled:cursor-not-allowed text-sm"> {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')} </button> </form> <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-cyan-400 hover:text-cyan-300 mt-2 text-sm"> {isLogin ? 'Criar uma conta' : 'Já tenho uma conta'} </button> </div> );
};

// ** Header Component (Layout and Effects Updated) **
const Header = ({ user, profiles, selectedProfile, onSelectProfile, onCreateProfile, onLogout }) => {
    const [newProfileName, setNewProfileName] = useState('');
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [error, setError] = useState('');
    const [loadingCreate, setLoadingCreate] = useState(false);

    const handleCreateProfile = async () => { /* ... (no changes) ... */ };
    const currentProfileName = useMemo(() => profiles.find(p => p.id === selectedProfile)?.name || 'Selecione', [profiles, selectedProfile]);
    useEffect(() => { const handleClickOutside = (event) => { if (isProfileDropdownOpen && !event.target.closest('.profile-dropdown-container')) setIsProfileDropdownOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isProfileDropdownOpen]);

    return (
        // Added `relative` for positioning context
        // Added `flex items-center` to help center the title with mx-auto
        // Added a height (e.g., h-16 or h-20) for consistent vertical alignment
        <header className="px-4 sm:px-6 py-4 border-b border-gray-800 relative flex items-center h-16"> {/* Adjust height h-16 if needed */}

            {/* Centered Title Container (Uses mx-auto within the flex header) */}
            <div className="mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient">
                    Controle Financeiro
                </h1>
            </div>

            {/* Right-Aligned Group (Absolutely Positioned relative to HEADER) */}
            {/* This div is now a DIRECT child of <header> */}
            {/* Uses top-1/2 and translate-y-1/2 for vertical centering */}
            {/* Uses right-4/sm:right-6 to align with header padding */}
            <div className="absolute top-1/2 right-4 sm:right-6 transform -translate-y-1/2 flex items-center space-x-2 sm:space-x-4">
                 {/* Profile Dropdown */}
                 <div className="relative profile-dropdown-container">
                    <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium rounded-md px-3 sm:px-4 py-2 text-sm sm:text-base transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50 flex items-center">
                         Perfil: {currentProfileName} <span className="ml-2 text-xs">▼</span>
                    </button>
                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20">
                            {/* ... (Dropdown content remains the same) ... */}
                            <div className="p-3 sm:p-4"> {error && <p className="text-red-500 text-xs sm:text-sm mb-2">{error}</p>} <input type="text" placeholder="Nome do Novo Perfil" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2" /> <button onClick={handleCreateProfile} disabled={loadingCreate || !newProfileName.trim()} className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white font-medium rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-sm transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50"> {loadingCreate ? 'Criando...' : 'Criar Perfil'} </button> </div> <div className="border-t border-gray-800 max-h-48 overflow-y-auto"> {profiles.length > 0 ? profiles.map((profile) => ( <button key={profile.id} onClick={() => { onSelectProfile(profile.id); setIsProfileDropdownOpen(false); }} className={`w-full text-left px-3 sm:px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors ${selectedProfile === profile.id ? 'bg-gray-700 font-semibold' : ''}`}> {profile.name} </button> )) : <p className="text-gray-500 px-3 sm:px-4 py-2 text-sm italic">Nenhum perfil.</p>} </div>
                        </div>
                    )}
                </div>
                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-medium rounded-md px-3 sm:px-4 py-2 text-sm sm:text-base transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

// ** Tabs Component ** (No changes)
const Tabs = ({ activeTab, setActiveTab }) => {
    const tabsConfig = [ { id: 'dashboard', label: 'Dashboard', color: 'cyan-blue' }, { id: 'income', label: 'Receitas', color: 'green-teal' }, { id: 'expenses', label: 'Despesas', color: 'red-pink' }, { id: 'recurring', label: 'Recorrentes', color: 'orange-yellow' }, ]; const getTabClasses = (tabId, color) => { const isActive = activeTab === tabId; const colors = { 'cyan-blue': { active: 'from-cyan-400 to-blue-500 shadow-cyan-500/50', hover: 'text-cyan-400' }, 'green-teal': { active: 'from-green-400 to-teal-500 shadow-green-500/50', hover: 'text-green-400' }, 'red-pink': { active: 'from-red-400 to-pink-500 shadow-red-500/50', hover: 'text-red-400' }, 'orange-yellow': { active: 'from-orange-400 to-yellow-500 shadow-orange-500/50', hover: 'text-orange-400' }, }; const colorClasses = colors[color] || colors['cyan-blue']; return `px-3 sm:px-4 py-2 text-sm rounded-md transition-all duration-300 ${isActive ? `bg-gradient-to-r ${colorClasses.active} text-white shadow-lg` : `text-gray-400 hover:${colorClasses.hover}`}`; };
    return ( <div className="flex justify-center my-6 px-2"> <div className="flex flex-wrap space-x-1 sm:space-x-2 bg-gray-900 rounded-lg p-1"> {tabsConfig.map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={getTabClasses(tab.id, tab.color)}> {tab.label} </button> ))} </div> </div> );
};

// ** MonthYearSelector Component (Updated for Custom Arrow) **
const MonthYearSelector = ({ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear }) => {
    const yearOptions = useMemo(() => generateYearOptions(), []);
    return (
        <div className="flex justify-center mb-6 px-2">
            <div className="flex space-x-2 sm:space-x-4">
                {/* Month Selector Wrapper */}
                <div className="relative">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        // Added pr-8 for padding to not overlap arrow
                        className="bg-gray-800 border border-gray-700 rounded-md px-3 pr-8 py-2 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                    >
                        {MONTH_NAMES.map((month, index) => (
                            <option key={index} value={index}>{month}</option>
                        ))}
                    </select>
                    {/* Custom Arrow */}
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        ▼
                    </span>
                </div>

                {/* Year Selector Wrapper */}
                <div className="relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        // Added pr-8 for padding to not overlap arrow
                        className="bg-gray-800 border border-gray-700 rounded-md px-3 pr-8 py-2 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                    >
                        {yearOptions.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    {/* Custom Arrow */}
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        ▼
                    </span>
                </div>
            </div>
        </div>
    );
};

// ** CardDropdown Component ** (No changes)
const CardDropdown = ({ cards, selectedCard, onSelectCard, baseColor = "gray" }) => {
    const [isOpen, setIsOpen] = useState(false); const colorClasses = { gray: { bg: 'bg-gray-800', border: 'border-gray-700', ring: 'focus:ring-gray-400', hoverBg: 'hover:bg-gray-700', dropdownBg: 'bg-gray-900' }, red: { bg: 'bg-red-800', border: 'border-red-700', ring: 'focus:ring-red-400', hoverBg: 'hover:bg-red-700', dropdownBg: 'bg-red-900' }, orange: { bg: 'bg-orange-800', border: 'border-orange-700', ring: 'focus:ring-orange-400', hoverBg: 'hover:bg-orange-700', dropdownBg: 'bg-orange-900' }, green: { bg: 'bg-green-800', border: 'border-green-700', ring: 'focus:ring-green-400', hoverBg: 'hover:bg-green-700', dropdownBg: 'bg-green-900' }, }; const currentColors = colorClasses[baseColor] || colorClasses.gray;
    useEffect(() => { const handleClickOutside = (event) => { if (isOpen && !event.target.closest('.card-dropdown-container')) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen]);
    return ( <div className="relative card-dropdown-container"> <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className={`w-full ${currentColors.bg} ${currentColors.border} rounded-md px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 ${currentColors.ring} flex items-center justify-between h-[42px]`}> {selectedCard && cards[selectedCard] ? ( <div className="flex items-center"> <img src={cards[selectedCard].logo} alt={cards[selectedCard].name} className="w-6 h-6 object-contain mr-2" /> {cards[selectedCard].name} </div> ) : ( 'Selecione' )} <span className="ml-2 text-xs">▼</span> </button> {isOpen && ( <div className={`absolute z-30 w-full ${currentColors.dropdownBg} ${currentColors.border} rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto`}> {Object.entries(cards).map(([key, card]) => ( <div key={key} onClick={() => { onSelectCard(key); setIsOpen(false); }} className={`flex items-center px-4 py-2 text-sm text-white ${currentColors.hoverBg} cursor-pointer`}> <img src={card.logo} alt={card.name} className="w-6 h-6 object-contain mr-2" /> {card.name} </div> ))} <div onClick={() => { onSelectCard(null); setIsOpen(false); }} className={`flex items-center px-4 py-2 text-sm text-gray-400 ${currentColors.hoverBg} cursor-pointer italic`}> Nenhum </div> </div> )} </div> );
};

// ** DashboardView Component ** (No changes)
const DashboardView = ({ totals, balance, formatCurrency }) => {
    const { totalIncome, totalExpenses, totalRecurring, totalInstallments } = totals; const totalOverallExpenses = totalExpenses + totalRecurring + totalInstallments; const chartData = useMemo(() => [ { categoria: 'Receitas', valor: totalIncome, cor: '#00ff99' }, { categoria: 'Desp. Avulsas', valor: totalExpenses, cor: '#ff3366' }, { categoria: 'Recorrentes', valor: totalRecurring, cor: '#ff9900' }, { categoria: 'Parcelas', valor: totalInstallments, cor: '#ffcc00' } ].filter(item => item.valor > 0), [totalIncome, totalExpenses, totalRecurring, totalInstallments]); const maxChartValue = useMemo(() => Math.max(...chartData.map(d => d.valor), 1), [chartData]);
    return ( <> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"> <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20"> <h3 className="text-base sm:text-lg font-medium text-gray-300 mb-2">Receitas Totais</h3> <p className="text-2xl sm:text-3xl font-bold text-cyan-400">{formatCurrency(totalIncome)}</p> </div> <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-red-400 shadow-lg shadow-red-500/20"> <h3 className="text-base sm:text-lg font-medium text-gray-300 mb-2">Despesas Totais</h3> <p className="text-2xl sm:text-3xl font-bold text-red-400">{formatCurrency(totalOverallExpenses)}</p> </div> <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-blue-400 shadow-lg shadow-blue-500/20"> <h3 className="text-base sm:text-lg font-medium text-gray-300 mb-2">Saldo</h3> <p className={`text-2xl sm:text-3xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-pink-400'}`}> {formatCurrency(balance)} </p> </div> </div> <div className="bg-gray-900 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-purple-400 shadow-lg shadow-purple-500/20"> <h3 className="text-lg sm:text-xl font-semibold text-gray-200 mb-4">Distribuição Mensal (Geral)</h3> {chartData.length > 0 && maxChartValue > 1 ? ( <div className="flex items-end justify-center h-48 sm:h-64 space-x-2 sm:space-x-4 md:space-x-8"> {chartData.map((item, index) => ( <div key={index} className="flex flex-col items-center text-center" style={{ height: '100%' }}> <div className="flex-grow w-10 sm:w-16 md:w-24 relative"> <div className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700 ease-in-out" style={{ backgroundColor: item.cor, height: `${(item.valor / maxChartValue) * 100}%`, boxShadow: `0 0 15px ${item.cor}` }} title={`${item.categoria}: ${formatCurrency(item.valor)}`}></div> </div> <p className="mt-2 text-xs sm:text-sm font-medium" style={{ color: item.cor }}>{item.categoria}</p> <p className="text-xs text-gray-400 hidden sm:block">{formatCurrency(item.valor)}</p> </div> ))} </div> ) : ( <p className="text-gray-500 italic text-center h-48 sm:h-64 flex items-center justify-center text-sm">Sem dados suficientes para exibir o gráfico geral.</p> )} </div> </> );
};

// ** TransactionTable Component ** (No changes)
const TransactionTable = ({
    items,
    onRemove, onEditStart, onEditSave, onEditCancel,
    editingId, editForm, setEditForm,
    formatCurrency, formatDateDisplay,
    itemTypeColor = 'gray-300', allowEdit = true,
    showCard = false, cards = {}, showPaymentMethod = false,
    showDateColumn = false, showCategory = false,
    showPaymentDateColumn = false,
    sortConfig, onSortRequest,
    categories = [],
}) => {
    const getSortIndicator = (columnKey) => { if (!sortConfig || sortConfig.key !== columnKey) return null; return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'; };
    const getHeaderClasses = (columnKey) => { let c = `py-3 px-4 text-gray-400 font-medium text-xs sm:text-sm`; c += (columnKey === 'amount' || columnKey === 'actions') ? ' text-right' : ' text-left'; if (onSortRequest && ['date', 'paymentDate', 'description', 'category', 'amount'].includes(columnKey)) c += " cursor-pointer hover:text-white transition-colors"; return c; };
    const calculateColspan = () => { let span = 1; if (showDateColumn) span++; if (showPaymentDateColumn) span++; if (showCategory) span++; return span; }
    const totalColspan = calculateColspan();
    const sortedCategories = useMemo(() => [...categories].sort(categorySorter), [categories]);

    return (
        <div className="overflow-x-auto mt-6 sm:mt-8">
            <table className="w-full min-w-[700px]">
                <thead>
                    <tr className="border-b border-gray-800">
                        {showDateColumn && <th className={getHeaderClasses('date')} onClick={() => onSortRequest?.('date')}>Data Compra {getSortIndicator('date')}</th>}
                        {showPaymentDateColumn && <th className={getHeaderClasses('paymentDate')} onClick={() => onSortRequest?.('paymentDate')}>Data Pag. {getSortIndicator('paymentDate')}</th>}
                        <th className={getHeaderClasses('description')} onClick={() => onSortRequest?.('description')}>Descrição {getSortIndicator('description')}</th>
                        {showCategory && <th className={getHeaderClasses('category')} onClick={() => onSortRequest?.('category')}>Categoria {getSortIndicator('category')}</th>}
                        <th className={getHeaderClasses('amount')} onClick={() => onSortRequest?.('amount')}>Valor {getSortIndicator('amount')}</th>
                        {allowEdit && <th className={getHeaderClasses('actions')}>Ações</th>}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => {
                        const isEditing = editingId === item.id;
                        return (
                            <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 group text-sm">
                                {/* Date Cell */}
                                {showDateColumn && <td className="py-3 px-4 whitespace-nowrap">{isEditing ? <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="input-edit-base" style={{ colorScheme: 'dark' }} /> : formatDateDisplay(item.date)}</td>}
                                {/* Payment Date Cell */}
                                {showPaymentDateColumn && <td className="py-3 px-4 whitespace-nowrap">{isEditing ? ((editForm.paymentMethod === 'credit') ? <input type="date" value={editForm.paymentDate} onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })} className="input-edit-base" style={{ colorScheme: 'dark' }} /> : <span className="text-gray-600">N/A</span>) : (item.paymentMethod === 'credit' ? formatDateDisplay(item.paymentDate) : <span className="text-gray-600">N/A</span>)}</td>}
                                {/* Description Cell */}
                                <td className="py-3 px-4 max-w-xs">{isEditing ? <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-edit-base w-full" /> : <div className="flex items-center space-x-2"> {showPaymentMethod && item.paymentMethod && <span className={`payment-method-badge ${item.paymentMethod}`}>{item.paymentMethod === 'credit' ? 'C' : 'D'}</span>} {showCard && item.card && cards[item.card] && <img src={cards[item.card].logo} alt={cards[item.card].name} className="card-logo" title={cards[item.card].name} />} <span className="truncate group-hover:whitespace-normal" title={item.description}>{item.description}</span> </div>}</td>
                                {/* Category Cell (Editable) */}
                                {showCategory && <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{isEditing ? (<select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="input-edit-base appearance-none w-full cursor-pointer"><option value="">-- Categoria --</option>{sortedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>) : (item.category || '---')}</td>}
                                {/* Value Cell */}
                                <td className={`py-3 px-4 text-right font-medium text-${itemTypeColor} whitespace-nowrap`}>{isEditing ? <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="input-edit-base w-24 text-right" /> : formatCurrency(item.amount)}</td>
                                {/* Actions Cell */}
                                {allowEdit && <td className="py-3 px-4 text-right whitespace-nowrap">{isEditing ? (<><button onClick={() => onEditSave(item.id)} className="action-button save" title="Salvar">Salvar</button><button onClick={onEditCancel} className="action-button cancel" title="Cancelar">Cancelar</button></>) : (<><button onClick={() => onEditStart(item)} className="action-button edit" title="Editar">Editar</button><button onClick={() => onRemove(item.id)} className="action-button remove" title="Remover">Remover</button></>)}</td>}
                            </tr>
                        );
                    })}
                    {/* Total Row */}
                    {items.length > 0 && (<tr className="bg-gray-800/50 font-semibold text-sm"><td colSpan={totalColspan + 1} className="py-3 px-4">Total</td><td className={`py-3 px-4 text-right font-bold text-${itemTypeColor}`}>{formatCurrency(items.reduce((acc, item) => acc + (item.amount || 0), 0))}</td>{allowEdit && <td></td>}</tr>)}
                </tbody>
            </table>
            {/* Empty Table Message */}
            {items.length === 0 && !editingId && (<p className="text-gray-500 italic text-center py-4 text-sm">Nenhum item para exibir.</p>)}
        </div>
    );
};

// ** TransactionSection Component ** (No internal logic changes)
const TransactionSection = ({
    title, items, fullList,
    onAddItem, onRemoveItem, onUpdateItem,
    itemTypeColor, baseColor,
    showCardOption = false, cards = {}, categories = [],
    isRecurring = false,
    formatCurrency, formatDateDisplay,
    selectedMonth, selectedYear,
}) => {
    const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const [transactionDate, setTransactionDate] = useState(''); const [paymentDate, setPaymentDate] = useState(''); const [category, setCategory] = useState(''); const [selectedCard, setSelectedCard] = useState(''); const [paymentMethod, setPaymentMethod] = useState( (baseColor === 'green') ? 'deposit' : 'credit' );
    useEffect(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        let targetDate;
    
            // Logic now applies to ALL tabs (Receitas, Despesas, Recorrentes)
        if (selectedMonth === currentMonth && selectedYear === currentYear) {
            // If viewing the current month, default to today's date
            targetDate = new Date(currentYear, currentMonth, today.getDate(), 12, 0, 0);
        } else {
            // If viewing a different month, default to the 1st of that month
            targetDate = new Date(selectedYear, selectedMonth, 1, 12, 0, 0);
        }
    
        const initialDateValue = toInputDateString(targetDate);
        setTransactionDate(initialDateValue);
        setPaymentDate(''); // Reset payment date as well
    
        // Dependencies now include isRecurring
    }, [selectedMonth, selectedYear]);
    const [sortConfig, setSortConfig] = useState({ key: 'effectiveDate', direction: 'desc' }); const [editingId, setEditingId] = useState(null); const [editForm, setEditForm] = useState({ amount: '', description: '', date: '', paymentDate: '', category: '', paymentMethod: '' });
    const resetForm = useCallback(() => {
        setAmount('');
        setDescription('');
        setCategory('');
        setSelectedCard('');
        setPaymentMethod((baseColor === 'green') ? 'deposit' : 'credit');
    
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        let targetDate;
    
            // Logic now applies to ALL tabs (Receitas, Despesas, Recorrentes)
        if (selectedMonth === currentMonth && selectedYear === currentYear) {
            // If viewing the current month, reset to today's date
            targetDate = new Date(currentYear, currentMonth, today.getDate(), 12, 0, 0);
        } else {
            // If viewing a different month, reset to the 1st of that month
            targetDate = new Date(selectedYear, selectedMonth, 1, 12, 0, 0);
        }
    
        const initialDateValue = toInputDateString(targetDate);
        setTransactionDate(initialDateValue);
        setPaymentDate('');
    
        // Update dependencies for useCallback
    }, [baseColor, selectedMonth, selectedYear]);
    const handleSortRequest = (key) => { let direction = 'asc'; if (sortConfig.key === key) direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'; setSortConfig({ key, direction }); };
    const handleAdd = () => { const parsedAmount = parseFloat(amount); let itemDateISO = '', itemPaymentDateISO = null; try { const d = new Date(transactionDate + 'T12:00:00Z'); if (!transactionDate || isNaN(d.getTime())) throw new Error(); itemDateISO = d.toISOString(); } catch { alert('Data da Transação inválida.'); return; } if (paymentMethod === 'credit' && paymentDate) { try { const d = new Date(paymentDate + 'T12:00:00Z'); if (isNaN(d.getTime())) throw new Error(); itemPaymentDateISO = d.toISOString(); } catch { alert('Data de Pagamento inválida.'); return; } } if (description.trim() && !isNaN(parsedAmount) && parsedAmount > 0) { onAddItem({ amount: parsedAmount, description: description.trim(), date: itemDateISO, paymentDate: itemPaymentDateISO, category: category || null, paymentMethod: (baseColor === 'green') ? undefined : paymentMethod, card: showCardOption ? (selectedCard || null) : undefined }); resetForm(); } else { alert('Preencha Valor (>0), Descrição e Data da Transação.'); } };
    const handleEditStart = (item) => { setEditingId(item.id); setEditForm({ amount: item.amount ?? '', description: item.description ?? '', date: toInputDateString(item.date), paymentDate: toInputDateString(item.paymentDate), category: item.category || '', paymentMethod: item.paymentMethod || '' }); }; const handleEditSave = (id) => { const parsedAmount = parseFloat(editForm.amount); let updatedDateISO = '', updatedPaymentDateISO = null; try { const d = new Date(editForm.date + 'T12:00:00Z'); if (!editForm.date || isNaN(d.getTime())) throw new Error(); updatedDateISO = d.toISOString(); } catch { alert('Data da Transação inválida.'); return; } if (editForm.paymentMethod === 'credit' && editForm.paymentDate) { try { const d = new Date(editForm.paymentDate + 'T12:00:00Z'); if (isNaN(d.getTime())) throw new Error(); updatedPaymentDateISO = d.toISOString(); } catch { alert('Data de Pagamento inválida.'); return; } } else if (editForm.paymentMethod !== 'credit') { updatedPaymentDateISO = null; } if (editForm.description.trim() && !isNaN(parsedAmount) && parsedAmount >= 0) { onUpdateItem(id, { amount: parsedAmount, description: editForm.description.trim(), date: updatedDateISO, paymentDate: updatedPaymentDateISO, category: editForm.category || null }); handleEditCancel(); } else { alert('Verifique os campos ao editar.'); } };
    const handleEditCancel = () => { setEditingId(null); setEditForm({ amount: '', description: '', date: '', paymentDate: '', category: '', paymentMethod: '' }); };
    const sortedItems = useMemo(() => { const itemsToSort = items || []; return [...itemsToSort].sort((a, b) => { let dateA, dateB; if (sortConfig.key === 'paymentDate') { dateA = a.paymentDate ? new Date(String(a.paymentDate).split('T')[0] + 'T12:00:00Z').getTime() : 0; dateB = b.paymentDate ? new Date(String(b.paymentDate).split('T')[0] + 'T12:00:00Z').getTime() : 0; } else if (sortConfig.key === 'date') { dateA = a.date ? new Date(String(a.date).split('T')[0] + 'T12:00:00Z').getTime() : 0; dateB = b.date ? new Date(String(b.date).split('T')[0] + 'T12:00:00Z').getTime() : 0; } else { const effA = getEffectiveDateForFiltering(a); const effB = getEffectiveDateForFiltering(b); dateA = effA ? effA.getTime() : 0; dateB = effB ? effB.getTime() : 0; } let valA = a[sortConfig.key], valB = b[sortConfig.key]; if (['date', 'paymentDate', 'effectiveDate'].includes(sortConfig.key)) { valA = isNaN(dateA) ? (sortConfig.direction === 'asc' ? Infinity : -Infinity) : dateA; valB = isNaN(dateB) ? (sortConfig.direction === 'asc' ? Infinity : -Infinity) : dateB; } else if (sortConfig.key === 'amount') { valA = a.amount || 0; valB = b.amount || 0; } else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); } if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); }, [items, sortConfig]);
    const formColorClasses = { gray: { border: 'border-gray-700', ring: 'focus:ring-gray-400' }, green: { border: 'border-green-700', ring: 'focus:ring-green-400' }, red: { border: 'border-red-700', ring: 'focus:ring-red-400' }, orange: { border: 'border-orange-700', ring: 'focus:ring-orange-400' }, }; const currentFormColors = formColorClasses[baseColor] || formColorClasses.gray; const buttonGradientClasses = { green: 'from-green-400 to-teal-500 hover:shadow-green-500/50', red: 'from-red-400 to-pink-500 hover:shadow-red-500/50', orange: 'from-orange-400 to-yellow-500 hover:shadow-orange-500/50', }; const currentButtonGradient = buttonGradientClasses[baseColor] || 'from-gray-400 to-gray-600'; const getPaymentMethodButtonClasses = (method) => { const isActive = paymentMethod === method; const styles = { red: { active: 'payment-btn-active red', inactive: 'payment-btn-inactive' }, orange: { active: 'payment-btn-active orange', inactive: 'payment-btn-inactive' }, default: { active: 'payment-btn-active gray', inactive: 'payment-btn-inactive' } }; const themeStyles = styles[baseColor] || styles.default; return `payment-btn-base ${isActive ? themeStyles.active : themeStyles.inactive}`; }; const showPaymentDateField = baseColor !== 'green' && paymentMethod === 'credit'; const sortedCategories = useMemo(() => [...categories].sort(categorySorter), [categories]);

    return (
        <div className={`bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-${baseColor}-400 shadow-lg shadow-${baseColor}-500/20 mb-6 sm:mb-8`}>
            <h2 className={`text-lg sm:text-xl font-semibold text-${baseColor}-400 mb-6`}>{title}</h2>

            {/* --- Layout Refined: Add Form Grid --- */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 mb-6 items-end"> {/* Adjusted gaps */}
                 {/* Amount */}
                 <div> <label htmlFor={`${baseColor}-amount`} className="input-label">Valor (*)</label> <input id={`${baseColor}-amount`} type="number" placeholder="0.00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className={`input-base ${currentFormColors.border} ${currentFormColors.ring}`} /> </div>
                 {/* Description */}
                 <div> <label htmlFor={`${baseColor}-description`} className="input-label">Descrição (*)</label> <input id={`${baseColor}-description`} type="text" placeholder="Descrição da transação" value={description} onChange={(e) => setDescription(e.target.value)} required className={`input-base ${currentFormColors.border} ${currentFormColors.ring}`} /> </div>
                 {/* Transaction Date */}
                 <div> <label htmlFor={`${baseColor}-date`} className="input-label">Data Transação (*)</label> <input id={`${baseColor}-date`} type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required className={`input-base appearance-none ${currentFormColors.border} ${currentFormColors.ring}`} style={{ colorScheme: 'dark' }} /> </div>
                 {/* Category */}
                 <div> <label htmlFor={`${baseColor}-category`} className="input-label">Categoria</label> <select id={`${baseColor}-category`} value={category} onChange={(e) => setCategory(e.target.value)} className={`input-base appearance-none cursor-pointer ${currentFormColors.border} ${currentFormColors.ring}`}> <option value="">-- Selecione --</option> {sortedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)} </select> </div>
                 {/* Payment Method (Conditional) */}
                 {baseColor !== 'green' && ( <div> <label className="input-label">Tipo</label> <div className="flex rounded-md overflow-hidden border border-gray-700"> <button type="button" onClick={() => setPaymentMethod('credit')} className={`${getPaymentMethodButtonClasses('credit')} rounded-l-md flex-1`}>Crédito</button> <button type="button" onClick={() => setPaymentMethod('debit')} className={`${getPaymentMethodButtonClasses('debit')} rounded-r-md flex-1`}>Débito</button> </div> </div> )}
                 {/* Payment Date (Conditional) */}
                 {showPaymentDateField && ( <div> <label htmlFor={`${baseColor}-paymentDate`} className="input-label">Data Pagamento</label> <input id={`${baseColor}-paymentDate`} type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={`input-base appearance-none ${currentFormColors.border} ${currentFormColors.ring}`} style={{ colorScheme: 'dark' }} /> </div> )}
                 {/* Card (Conditional) */}
                 {showCardOption && ( <div> <label className="input-label">Cartão</label> <CardDropdown cards={cards} selectedCard={selectedCard} onSelectCard={setSelectedCard} baseColor={baseColor} /> </div> )}
                 {/* Add Button - Spans remaining cols or pushes to end */}
                 <div className="lg:col-start-4 flex items-end"> {/* Aligns button to the last column area */}
                     <button onClick={handleAdd} className={`add-button w-full ${currentButtonGradient}`}> Adicionar </button>
                 </div>
            </div>
            {/* --- End Layout Refined --- */}


            {/* Installment Section */}
            {baseColor === 'red' && !isRecurring && <InstallmentSection onAddInstallment={onAddItem} baseColor={baseColor} selectedMonth={selectedMonth} selectedYear={selectedYear} />}

            {/* Items List */}
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

            {/* Installment List */}
            {baseColor === 'red' && !isRecurring && ( <InstallmentList installments={fullList?.filter(i => i.isInstallment) ?? []} selectedMonth={selectedMonth} selectedYear={selectedYear} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} onRemoveInstallment={onRemoveItem} itemTypeColor={itemTypeColor} showPaymentMethod={true} showDateColumn={true} showCategory={true} /> )}
        </div>
    );
};


// ** InstallmentSection Component ** (Layout Refined)
const InstallmentSection = ({ onAddInstallment, baseColor, selectedMonth, selectedYear }) => {
    const [totalAmount, setTotalAmount] = useState(''); const [description, setDescription] = useState(''); const [months, setMonths] = useState(2);
    const handleAddInstallment = () => { const pa = parseFloat(totalAmount); const nm = parseInt(months); if (description.trim() && !isNaN(pa) && pa > 0 && nm >= 2) { const ia = Math.round((pa / nm) * 100) / 100; const fDate = new Date(selectedYear, selectedMonth, 1); const gId = `inst-${Date.now()}`; for (let i = 0; i < nm; i++) { const date = new Date(fDate); date.setMonth(fDate.getMonth() + i); onAddInstallment({ amount: ia, description: `${description.trim()} (${i + 1}/${nm})`, date: date.toISOString(), isInstallment: true, paymentMethod: 'credit', installmentInfo: { groupId: gId, totalAmount: pa, totalMonths: nm, currentInstallment: i + 1, purchaseDate: fDate.toISOString() } }); } setTotalAmount(''); setDescription(''); setMonths(2); } else { alert('Insira Valor Total (>0), Descrição e Nº Parcelas (>=2).'); } };
    const formColors = { border: 'border-red-700', ring: 'focus:ring-red-400' }; const btnGradient = 'from-red-400 to-pink-500 hover:shadow-red-500/50';

    return (
        <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className={`text-base sm:text-lg font-semibold text-${baseColor}-400 mb-6`}>Adicionar Compra Parcelada</h3>
            {/* --- Layout Refined: Installment Form Grid --- */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 mb-6 items-end"> {/* Consistent gap */}
                 <div> <label htmlFor="inst-amount" className="input-label">Valor Total (*)</label> <input id="inst-amount" type="number" placeholder="1200.00" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required className={`input-base ${formColors.border} ${formColors.ring}`} /> </div>
                 <div> <label htmlFor="inst-description" className="input-label">Descrição (*)</label> <input id="inst-description" type="text" placeholder="Ex: Celular Novo" value={description} onChange={e => setDescription(e.target.value)} required className={`input-base ${formColors.border} ${formColors.ring}`} /> </div>
                 <div> <label htmlFor="inst-months" className="input-label">Nº Parcelas (*)</label> <input id="inst-months" type="number" min="2" step="1" placeholder="Ex: 12" value={months} onChange={e => setMonths(parseInt(e.target.value) || 2)} required className={`input-base ${formColors.border} ${formColors.ring}`} /> </div>
                 <div className="flex items-end"> {/* Align button */}
                     <button onClick={handleAddInstallment} className={`add-button w-full ${btnGradient}`}> Parcelar </button>
                 </div>
            </div>
            {/* --- End Layout Refined --- */}
        </div>
     );
};


// ** InstallmentList Component ** (No changes)
const InstallmentList = ({
    installments, selectedMonth, selectedYear,
    formatCurrency, formatDateDisplay, onRemoveInstallment,
    itemTypeColor, showPaymentMethod = false, showDateColumn = false,
    showCategory = false,
}) => {
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
    const handleSortRequest = (key) => { let d = 'asc'; if (sortConfig.key === key) d = sortConfig.direction === 'asc' ? 'desc' : 'asc'; setSortConfig({ key, direction: d }); };
    const displayInstallments = useMemo(() => { const filtered = (installments || []).filter(item => { if (!item.date) return false; try { const d = new Date(String(item.date).split('T')[0] + 'T12:00:00Z'); return !isNaN(d.getTime()) && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear; } catch { return false; } }); return [...filtered].sort((a, b) => { let vA = a[sortConfig.key], vB = b[sortConfig.key]; if (sortConfig.key === 'date') { try { vA = new Date(String(a.date||0).split('T')[0] + 'T12:00:00Z').getTime(); vB = new Date(String(b.date||0).split('T')[0] + 'T12:00:00Z').getTime(); vA=isNaN(vA)?Infinity:vA; vB=isNaN(vB)?Infinity:vB;} catch{vA=Infinity;vB=Infinity;} } else if (sortConfig.key === 'amount'){ vA=a.amount||0; vB=b.amount||0; } else { vA=String(vA||'').toLowerCase(); vB=String(vB||'').toLowerCase(); } if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1; if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); }, [installments, selectedMonth, selectedYear, sortConfig]);
    if (displayInstallments.length === 0) return null;
    return ( <div className="mt-8 pt-6 border-t border-gray-700"> <h3 className="list-title"> Parcelas de {MONTH_NAMES[selectedMonth]}/{selectedYear} </h3> <TransactionTable items={displayInstallments} onRemove={onRemoveInstallment} allowEdit={false} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} itemTypeColor={itemTypeColor} showPaymentMethod={showPaymentMethod} showDateColumn={showDateColumn} showCategory={showCategory} showPaymentDateColumn={false} sortConfig={sortConfig} onSortRequest={handleSortRequest} /> </div> );
};


// --- Main App Component ---
const FinancialApp = () => {
    // State declarations...
    const [user, setUser] = useState(null); const [loadingAuth, setLoadingAuth] = useState(true); const [authError, setAuthError] = useState(''); const [profiles, setProfiles] = useState([]); const [selectedProfile, setSelectedProfile] = useState(INITIAL_PROFILE); const [loadingProfiles, setLoadingProfiles] = useState(true); const [profileError, setProfileError] = useState(''); const [financialData, setFinancialData] = useState({ incomeList: [], expenseList: [], recurringList: [] }); const [loadingData, setLoadingData] = useState(true); const [dataError, setDataError] = useState(''); const [isSaving, setIsSaving] = useState(false); const [activeTab, setActiveTab] = useState(INITIAL_TAB); const [currentMonthYear, setCurrentMonthYear] = useState(getCurrentMonthYear()); const { month: selectedMonth, year: selectedYear } = currentMonthYear;
    // Auth Listener Effect
    useEffect(() => { setLoadingAuth(true); const u = onAuthStateChanged(auth, (usr) => { setUser(usr); if (!usr) { setSelectedProfile(null); setProfiles([]); setFinancialData({ incomeList: [], expenseList: [], recurringList: [] }); localStorage.clear(); setLoadingProfiles(false); setLoadingData(false); } setLoadingAuth(false); }, (e) => { setAuthError("Erro auth."); setLoadingAuth(false); }); return u; }, []);
    // Profile Listener Effect
    useEffect(() => { if (!user) { setLoadingProfiles(false); return; } setLoadingProfiles(true); setProfileError(''); const u = listenToProfiles(user.uid, (p) => { setProfiles(p); const s = localStorage.getItem('selectedProfile'); if (s && p.some(i => i.id === s)) setSelectedProfile(s); else if (p.length > 0) { setSelectedProfile(p[0].id); localStorage.setItem('selectedProfile', p[0].id); } else setSelectedProfile(null); setLoadingProfiles(false); }, (e) => { setProfileError("Erro perfis."); setLoadingProfiles(false); }); return u; }, [user]);
    // Data Listener Effect
    useEffect(() => { if (!user || !selectedProfile) { setFinancialData({ incomeList: [], expenseList: [], recurringList: [] }); setLoadingData(false); return; } setLoadingData(true); setDataError(''); const u = listenToFinancialData(user.uid, selectedProfile, (d) => { setFinancialData({ incomeList: d?.incomeList || [], expenseList: d?.expenseList || [], recurringList: d?.recurringList || [] }); setLoadingData(false); }, (e) => { setDataError("Erro dados."); setLoadingData(false); }); return u; }, [user, selectedProfile]);
    // Debounced Save Effect
    useEffect(() => { if (loadingData || loadingAuth || loadingProfiles || !user || !selectedProfile) return; setIsSaving(true); const t = setTimeout(() => { saveFinancialData(user.uid, selectedProfile, financialData).then(() => setIsSaving(false)).catch((e) => { setDataError("Falha ao salvar."); setIsSaving(false); }); }, 1500); return () => clearTimeout(t); }, [financialData, user, selectedProfile, loadingData, loadingAuth, loadingProfiles]);
    // UI State Saving Effects
    useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]); useEffect(() => { if (selectedProfile) localStorage.setItem('selectedProfile', selectedProfile); else localStorage.removeItem('selectedProfile'); }, [selectedProfile]);
    // Handlers...
    const handleAuthSuccess = useCallback((u) => { setUser(u); setAuthError(''); }, []); const handleLogout = useCallback(async () => { try { await logOut(); } catch { setAuthError('Erro logout.'); } }, []); const handleCreateProfile = useCallback(async (name) => { if (!user) return; setProfileError(''); try { await createProfile(user.uid, name); alert('Perfil criado!'); } catch (e) { setProfileError(e.message || 'Erro criar perfil.'); } }, [user]); const handleSelectProfile = useCallback((id) => { if (id !== selectedProfile) { setDataError(''); setProfileError(''); setSelectedProfile(id); } }, [selectedProfile]);
    // Core Data Operations
    const addItem = useCallback((itemType, newItemData) => { if (!user || !selectedProfile) return; const listName = `${itemType}List`; const newItem = { ...newItemData, id: `id-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), category: newItemData.category || null, paymentDate: newItemData.paymentDate ?? null }; const sanitizedItem = Object.entries(newItem).reduce((a, [k, v]) => { if (v !== undefined) a[k] = v; return a; }, {}); setFinancialData(prev => ({ ...prev, [listName]: [...(prev[listName] || []), sanitizedItem] })); }, [user, selectedProfile]); const removeItem = useCallback((itemType, id) => { setFinancialData(prev => ({ ...prev, [`${itemType}List`]: (prev[`${itemType}List`] || []).filter(i => i.id !== id) })); }, []); const updateItem = useCallback((itemType, id, data) => { const listName = `${itemType}List`; const sanitized = Object.entries(data).reduce((a, [k, v]) => { if (v !== undefined) a[k] = v; return a; }, { updatedAt: new Date().toISOString() }); setFinancialData(prev => ({ ...prev, [listName]: (prev[listName] || []).map(i => i.id === id ? { ...i, ...sanitized } : i) })); }, []);
    // Calculations (Using Effective Date)
    const { effectiveMonthlyIncome, effectiveMonthlyExpenses, effectiveMonthlyRecurring } = useMemo(() => { const filter = (item) => { const d = getEffectiveDateForFiltering(item); return d && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear; }; return { effectiveMonthlyIncome: financialData.incomeList.filter(filter), effectiveMonthlyExpenses: financialData.expenseList.filter(filter), effectiveMonthlyRecurring: financialData.recurringList.filter(filter), }; }, [financialData, selectedMonth, selectedYear]); // ** Using UTC Month/Year for comparison **
    const allIncomeList = useMemo(() => financialData.incomeList || [], [financialData.incomeList]); const allExpenseList = useMemo(() => financialData.expenseList || [], [financialData.expenseList]); const allRecurringExpensesList = useMemo(() => financialData.recurringList || [], [financialData.recurringList]); const totals = useMemo(() => { const singleExp = effectiveMonthlyExpenses.filter(i => !i.isInstallment).reduce((s, i) => s + (i.amount || 0), 0); const instExp = effectiveMonthlyExpenses.filter(i => i.isInstallment).reduce((s, i) => s + (i.amount || 0), 0); return { totalIncome: effectiveMonthlyIncome.reduce((s, i) => s + (i.amount || 0), 0), totalExpenses: singleExp, totalInstallments: instExp, totalRecurring: effectiveMonthlyRecurring.reduce((s, i) => s + (i.amount || 0), 0), }; }, [effectiveMonthlyIncome, effectiveMonthlyExpenses, effectiveMonthlyRecurring]); const balance = useMemo(() => totals.totalIncome - (totals.totalExpenses + totals.totalInstallments + totals.totalRecurring), [totals]);
    // Render Logic
    const isLoading = loadingAuth || loadingProfiles || loadingData;
    if (loadingAuth && !user) return <div className="loading-screen">Carregando...</div>;

    return (
        <div className="min-h-screen bg-black text-gray-100 font-poppins flex flex-col">
            {!user ? ( <AuthForm onAuthSuccess={handleAuthSuccess} /> ) : (
                <>
                    <Header user={user} profiles={profiles} selectedProfile={selectedProfile} onSelectProfile={handleSelectProfile} onCreateProfile={handleCreateProfile} onLogout={handleLogout} />
                    {/* ... (Status Bar, Profile Prompt, Main Content remain the same) ... */}
                     {selectedProfile ? (
                        <main className="flex-grow">
                             {/* ... (Tabs, Month Selector, Loading, Content remain the same) ... */}
                             <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                            <MonthYearSelector selectedMonth={selectedMonth} selectedYear={selectedYear} setSelectedMonth={(m) => setCurrentMonthYear(p => ({ ...p, month: m }))} setSelectedYear={(y) => setCurrentMonthYear(p => ({ ...p, year: y }))} />
                            {isLoading && <div className="loading-data">Carregando dados...</div>}
                            {!isLoading && ( <div className="container mx-auto px-2 sm:px-4 pb-8"> {activeTab === 'dashboard' && <DashboardView totals={totals} balance={balance} formatCurrency={formatCurrency} />} {activeTab === 'income' && <TransactionSection title="Gerenciar Receitas" items={effectiveMonthlyIncome} fullList={allIncomeList} onAddItem={(d)=>addItem('income',d)} onRemoveItem={(id)=>removeItem('income',id)} onUpdateItem={(id,d)=>updateItem('income',id,d)} itemTypeColor="green-400" baseColor="green" categories={DEFAULT_CATEGORIES} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} selectedMonth={selectedMonth} selectedYear={selectedYear} />} {activeTab === 'expenses' && <TransactionSection title="Gerenciar Despesas" items={effectiveMonthlyExpenses} fullList={allExpenseList} onAddItem={(d)=>addItem('expense',d)} onRemoveItem={(id)=>removeItem('expense',id)} onUpdateItem={(id,d)=>updateItem('expense',id,d)} itemTypeColor="red-400" baseColor="red" categories={DEFAULT_CATEGORIES} showCardOption={true} cards={CARDS} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} selectedMonth={selectedMonth} selectedYear={selectedYear} />} {activeTab === 'recurring' && <TransactionSection title="Gerenciar Despesas Recorrentes" items={allRecurringExpensesList} fullList={allRecurringExpensesList} onAddItem={(d)=>addItem('recurring',d)} onRemoveItem={(id)=>removeItem('recurring',id)} onUpdateItem={(id,d)=>updateItem('recurring',id,d)} itemTypeColor="orange-400" baseColor="orange" categories={DEFAULT_CATEGORIES} showCardOption={true} cards={CARDS} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay} selectedMonth={selectedMonth} selectedYear={selectedYear} isRecurring={true} />} </div> )}
                        </main>
                    ) : ( !isLoading && <div className="no-profile-selected">Selecione ou crie um perfil.</div> )}

                    {/* Footer (Gradient Adjusted on Name) */}
                    <footer className="app-footer">
                         {/* Added {' '} for explicit space and removed leading space from name */}
                         <p> Desenvolvido por{' '}
                             <span className="developer-name animate-pulse from-cyan-400 via-purple-500 to-pink-500 bg-gradient-to-r bg-clip-text text-transparent">
                                Wellington Beraldo
                             </span>
                         </p>
                    </footer>
                </>
            )}
        </div>
    );
};

export default FinancialApp;

// --- END OF FILE App.js ---