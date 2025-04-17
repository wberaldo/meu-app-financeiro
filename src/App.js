// --- START OF FILE App.js ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import {
  auth, // Keep auth for onAuthStateChanged
  signUp,
  logIn,
  logOut,
  onAuthStateChanged,
  createInitialUserProfile,
  createProfile,
  saveFinancialData,
  listenToProfiles,
  listenToFinancialData
} from './firebase'; // Import specific functions

// Import Assets (assuming they are in src/assets/cards)
import nubankLogo from './assets/cards/nubank.png';
import bbLogo from './assets/cards/bb.png';
import santanderLogo from './assets/cards/santander.png';

// --- Constants ---
const CARDS = {
  nubank: { name: 'Nubank', logo: nubankLogo },
  bb: { name: 'BB', logo: bbLogo },
  santander: { name: 'Santander', logo: santanderLogo }
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const INITIAL_TAB = localStorage.getItem('activeTab') || 'dashboard';
const INITIAL_PROFILE = localStorage.getItem('selectedProfile') || null;

// --- Helper Functions ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0); // Handle undefined/null value
};

const getCurrentMonthYear = () => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
};

const generateYearOptions = (range = 5) => {
  const currentYear = new Date().getFullYear();
  const options = [];
  for (let i = currentYear - range; i <= currentYear + range; i++) {
    options.push(i);
  }
  return options;
};

// *** NOVA FUNÇÃO AUXILIAR ***
const formatDateDisplay = (isoDateString) => {
    if (!isoDateString) return '---'; // Retorna algo se não houver data
    try {
        // Adiciona 'T00:00:00' para evitar problemas de fuso horário que podem mudar o dia
        const date = new Date(isoDateString.split('T')[0] + 'T00:00:00');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses são 0-indexados
        const year = date.getFullYear();
        // Verificar se a data é válida após a criação
        if (isNaN(date.getTime())) {
            return 'Inválida';
        }
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Error formatting date:", isoDateString, e);
        return 'Erro Data'; // Retorna erro se a string for inválida
    }
};

// --- Child Components ---

// ** AuthForm Component **
const AuthForm = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await logIn(email, password);
        console.log("Login successful");
      } else {
        userCredential = await signUp(email, password);
        // Create default profile for new user
        await createInitialUserProfile(userCredential.user.uid);
        console.log("Signup successful, default profile created");
      }
      onAuthSuccess(userCredential.user); // Notify parent
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">{isLogin ? 'Login' : 'Cadastro'}</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 mb-4 w-64 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 mb-4 w-64 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md px-6 py-2 transition-colors mb-4 w-64 disabled:opacity-50"
        >
          {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
        </button>
      </form>
      <button
        onClick={() => { setIsLogin(!isLogin); setError(''); }}
        className="text-cyan-400 hover:text-cyan-300"
      >
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
        if (newProfileName.trim() === '') return;
        setError('');
        setLoadingCreate(true);
        try {
            await onCreateProfile(newProfileName.trim());
            setNewProfileName('');
            setIsProfileDropdownOpen(false); // Close dropdown after creation
        } catch (err) {
            console.error("Profile creation error:", err);
            setError(err.message || 'Erro ao criar perfil.');
        } finally {
          setLoadingCreate(false);
        }
    };

    const currentProfileName = useMemo(() => {
        return profiles.find(p => p.id === selectedProfile)?.name || 'Selecione';
    }, [profiles, selectedProfile]);

    return (
        <header className="px-6 py-4 border-b border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                    Controle Financeiro
                </h1>
                <div className="flex items-center space-x-4">
                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium rounded-md px-4 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50 flex items-center"
                        >
                            Perfil: {currentProfileName} <span className="ml-2 text-xs">▼</span>
                        </button>
                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20">
                                <div className="p-4">
                                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                                    <input
                                        type="text"
                                        placeholder="Nome do Novo Perfil"
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2"
                                    />
                                    <button
                                        onClick={handleCreateProfile}
                                        disabled={loadingCreate || !newProfileName.trim()}
                                        className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white font-medium rounded-md px-4 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50"
                                    >
                                        {loadingCreate ? 'Criando...' : 'Criar Perfil'}
                                    </button>
                                </div>
                                <div className="border-t border-gray-800 max-h-48 overflow-y-auto">
                                    {profiles.length > 0 ? profiles.map((profile) => (
                                        <button
                                            key={profile.id}
                                            onClick={() => {
                                                onSelectProfile(profile.id);
                                                setIsProfileDropdownOpen(false); // Close on selection
                                            }}
                                            className={`w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 transition-colors ${selectedProfile === profile.id ? 'bg-gray-700 font-semibold' : ''}`}
                                        >
                                            {profile.name}
                                        </button>
                                    )) : <p className="text-gray-500 px-4 py-2 italic">Nenhum perfil encontrado.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Logout Button */}
                    <button
                        onClick={onLogout}
                        className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-medium rounded-md px-4 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
};

// ** Tabs Component **
const Tabs = ({ activeTab, setActiveTab }) => {
    const tabsConfig = [
        { id: 'dashboard', label: 'Dashboard', color: 'cyan-blue' },
        { id: 'income', label: 'Receitas', color: 'green-teal' },
        { id: 'expenses', label: 'Despesas', color: 'red-pink' },
        { id: 'recurring', label: 'Recorrentes', color: 'orange-yellow' },
        // Add installment tab if needed later
    ];

    const getTabClasses = (tabId, color) => {
        const isActive = activeTab === tabId;
        const colors = {
            'cyan-blue': { active: 'from-cyan-400 to-blue-500 shadow-cyan-500/50', hover: 'text-cyan-400' },
            'green-teal': { active: 'from-green-400 to-teal-500 shadow-green-500/50', hover: 'text-green-400' },
            'red-pink': { active: 'from-red-400 to-pink-500 shadow-red-500/50', hover: 'text-red-400' },
            'orange-yellow': { active: 'from-orange-400 to-yellow-500 shadow-orange-500/50', hover: 'text-orange-400' },
        };
        const colorClasses = colors[color] || colors['cyan-blue']; // Default color

        return `px-4 py-2 rounded-md transition-all duration-300 ${
          isActive
            ? `bg-gradient-to-r ${colorClasses.active} text-white shadow-lg`
            : `text-gray-400 hover:${colorClasses.hover}`
        }`;
    };

    return (
        <div className="flex justify-center my-6">
            <div className="flex flex-wrap space-x-1 sm:space-x-2 bg-gray-900 rounded-lg p-1">
                {tabsConfig.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={getTabClasses(tab.id, tab.color)}
                    >
                        {tab.label}
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
        <div className="flex justify-center mb-6">
            <div className="flex space-x-4">
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                    {MONTH_NAMES.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                    ))}
                </select>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                    {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// ** CardDropdown Component ** (Moved outside FinancialApp)
const CardDropdown = ({ cards, selectedCard, onSelectCard, baseColor = "gray" }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Define color mapping for Tailwind
  const colorClasses = {
      gray: { bg: 'bg-gray-800', border: 'border-gray-700', ring: 'focus:ring-gray-400', hoverBg: 'hover:bg-gray-700', dropdownBg: 'bg-gray-900' },
      red: { bg: 'bg-red-800', border: 'border-red-700', ring: 'focus:ring-red-400', hoverBg: 'hover:bg-red-700', dropdownBg: 'bg-red-900' },
      orange: { bg: 'bg-orange-800', border: 'border-orange-700', ring: 'focus:ring-orange-400', hoverBg: 'hover:bg-orange-700', dropdownBg: 'bg-orange-900' },
      // Add more colors as needed
  };
  const currentColors = colorClasses[baseColor] || colorClasses.gray;

  // Function to handle clicks outside the dropdown to close it
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (isOpen && !event.target.closest('.card-dropdown-container')) {
              setIsOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);


  return (
      <div className="relative card-dropdown-container"> {/* Added class for outside click */}
          <button
              type="button" // Important for forms
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
              className={`w-full ${currentColors.bg} ${currentColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentColors.ring} flex items-center justify-between`}
          >
              {selectedCard && cards[selectedCard] ? (
                  <div className="flex items-center">
                      <img
                          src={cards[selectedCard].logo}
                          alt={cards[selectedCard].name}
                          className="w-6 h-6 object-contain mr-2"
                      />
                      {cards[selectedCard].name}
                  </div>
              ) : (
                  'Selecione cartão'
              )}
              <span className="ml-2 text-xs">▼</span>
          </button>
          {isOpen && (
              <div className={`absolute z-30 w-full ${currentColors.dropdownBg} ${currentColors.border} rounded-md mt-1 shadow-lg`}>
                  {Object.entries(cards).map(([key, card]) => (
                      <div
                          key={key}
                          onClick={() => {
                              onSelectCard(key);
                              setIsOpen(false);
                          }}
                          className={`flex items-center px-4 py-2 text-white ${currentColors.hoverBg} cursor-pointer`}
                      >
                          <img
                              src={card.logo}
                              alt={card.name}
                              className="w-6 h-6 object-contain mr-2"
                          />
                          {card.name}
                      </div>
                  ))}
                  {/* Option to clear selection */}
                   <div
                       onClick={() => {
                           onSelectCard(null); // Or '' depending on preference
                           setIsOpen(false);
                       }}
                       className={`flex items-center px-4 py-2 text-gray-400 ${currentColors.hoverBg} cursor-pointer italic`}
                   >
                       Nenhum
                   </div>
              </div>
          )}
      </div>
  );
};

// ** DashboardView Component **
const DashboardView = ({ totals, balance, formatCurrency }) => {
  const { totalIncome, totalExpenses, totalRecurring, totalInstallments } = totals;
  const totalOverallExpenses = totalExpenses + totalRecurring + totalInstallments;

  const chartData = useMemo(() => [
      { categoria: 'Receitas', valor: totalIncome, cor: '#00ff99' }, // cyan-ish green
      { categoria: 'Despesas', valor: totalExpenses, cor: '#ff3366' }, // red-pink
      { categoria: 'Recorrentes', valor: totalRecurring, cor: '#ff9900' }, // orange
      { categoria: 'Parceladas', valor: totalInstallments, cor: '#ffcc00' } // yellow-orange
  ], [totalIncome, totalExpenses, totalRecurring, totalInstallments]);

  const maxChartValue = useMemo(() => Math.max(...chartData.map(d => d.valor), 1), [chartData]); // Avoid division by zero

  return (
    <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20">
                <h3 className="text-lg font-medium text-gray-300 mb-2">Receitas Totais</h3>
                <p className="text-3xl font-bold text-cyan-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-red-400 shadow-lg shadow-red-500/20">
                <h3 className="text-lg font-medium text-gray-300 mb-2">Despesas Totais</h3>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(totalOverallExpenses)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-blue-400 shadow-lg shadow-blue-500/20">
                <h3 className="text-lg font-medium text-gray-300 mb-2">Saldo</h3>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-pink-400'}`}>
                    {formatCurrency(balance)}
                </p>
            </div>
        </div>

        {/* Chart */}
         <div className="bg-gray-900 rounded-xl p-6 mb-8 border-2 border-purple-400 shadow-lg shadow-purple-500/20">
                <h3 className="text-xl font-semibold text-gray-200 mb-4">Distribuição Mensal</h3>
                {maxChartValue > 1 ? (
                     <div className="flex items-end justify-center h-64 space-x-4 sm:space-x-8">
                        {chartData.map((item, index) => (
                            <div key={index} className="flex flex-col items-center text-center" style={{ height: '100%' }}>
                                <div className="flex-grow w-16 md:w-24 relative">
                                    <div
                                        className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700 ease-in-out"
                                        style={{
                                            backgroundColor: item.cor,
                                            height: `${(item.valor / maxChartValue) * 100}%`,
                                            boxShadow: `0 0 15px ${item.cor}`
                                        }}
                                        title={`${item.categoria}: ${formatCurrency(item.valor)}`} // Tooltip for value
                                    ></div>
                                </div>
                                <p className="mt-2 text-sm font-medium" style={{ color: item.cor }}>{item.categoria}</p>
                                <p className="text-xs text-gray-400">{formatCurrency(item.valor)}</p>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-gray-500 italic text-center h-64 flex items-center justify-center">Sem dados suficientes para exibir o gráfico.</p>
                 )}
            </div>
    </>
  );
};


// ** TransactionTable Component ** (Helper for TransactionSection)
// --- Dentro do componente TransactionTable ---

const TransactionTable = ({
    items,
    onRemove,
    onEditStart,
    onEditSave,
    onEditCancel,
    editingId,
    editForm,
    setEditForm,
    formatCurrency,
    itemTypeColor = 'gray-300',
    allowEdit = true, // Certifique-se que está sendo passado como true de TransactionSection
    showCard = false,
    cards = {},
    showPaymentMethod = false,
    // *** RECEBER NOVAS PROPS ***
    sortConfig,       // Objeto { key: string, direction: 'asc' | 'desc' }
    onSortRequest,    // Função para chamar quando o cabeçalho é clicado (key: string) => void
    baseColor,
    // *** NOVOS PROPS ***
    showDateColumn = false, // Controla se a coluna de data é exibida
    formatDateDisplay // Função para formatar a data para exibição
}) => {

    // Função helper para obter classes e indicador de ordenação para um cabeçalho
    const getSortIndicator = (columnKey) => {
        if (!sortConfig || sortConfig.key !== columnKey) {
            return null; // Sem indicador se não está ordenando por esta coluna
        }
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'; // Indicador de direção
    };

    const getHeaderClasses = (columnKey) => {
        let classes = "text-left py-3 px-4 text-gray-400 font-medium";
        if (onSortRequest) { // Adiciona estilos de clique se a função for fornecida
            classes += " cursor-pointer hover:text-white transition-colors";
        }
        return classes;
    };

    return (
        <div className="overflow-x-auto mt-8">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-800">
                        {/* *** ADICIONAR Header de Data *** */}
                        {showDateColumn && (
                        <th className={getHeaderClasses('date')}
                        onClick={() => onSortRequest ? onSortRequest('date') : null} // Chama o handler se existir
                        >Data
                        {getSortIndicator('date')} {/* Mostra o indicador ▲ ou ▼ */}
                        </th>
                        )}
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Descrição</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Valor</th>
                        {/* A coluna Ações só aparece se allowEdit for true */}
                        {allowEdit && <th className="text-right py-3 px-4 text-gray-400 font-medium">Ações</th>}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => {
                         return ( // Certifique-se que este return existe!
                            <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">

                                {/* *** ADICIONAR Célula de Data *** */}
                                {showDateColumn && (
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {editingId === item.id ? (
                                            // Input de data no modo de edição
                                            <input
                                                type="date"
                                                value={editForm.date} // Deve estar no formato YYYY-MM-DD
                                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white w-full appearance-none"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        ) : (
                                            // Exibir data formatada
                                            formatDateDisplay(item.date) // Usa a função passada por prop
                                        )}
                                    </td>
                                )}

                                {/* CÉLULA 1: Descrição, Indicador C/D, Cartão */}
                                <td className="py-3 px-4">
                                    {editingId === item.id ? (
                                        // Modo Edição Descrição
                                        <input
                                            type="text"
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white w-full"
                                        />
                                    ) : (
                                        // Modo Visualização Descrição
                                        <div className="flex items-center space-x-2">
                                            {/* Indicador Crédito/Débito */}
                                            {showPaymentMethod && item.paymentMethod && (
                                                <span
                                                  className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${ // Adicionado flex-shrink-0
                                                    item.paymentMethod === 'credit' ? 'bg-blue-600 text-blue-100' : 'bg-yellow-600 text-yellow-100'
                                                  }`}
                                                  title={item.paymentMethod === 'credit' ? 'Crédito' : 'Débito'}
                                                >
                                                  {item.paymentMethod === 'credit' ? 'C' : 'D'}
                                                </span>
                                            )}
                                            {/* Logo do Cartão */}
                                            {showCard && item.card && cards[item.card] && (
                                                <img
                                                    src={cards[item.card].logo}
                                                    alt={cards[item.card].name}
                                                    className="w-5 h-5 object-contain flex-shrink-0"
                                                    title={cards[item.card].name}
                                                />
                                            )}
                                            {/* Descrição Textual */}
                                            <span className="truncate">{item.description}</span>
                                        </div> // Fechamento do div flex
                                    )}
                                </td> {/* Fechamento da Célula 1 */}

                                {/* CÉLULA 2: Valor */}
                                <td className={`py-3 px-4 text-right font-medium text-${itemTypeColor}`}>
                                    {editingId === item.id ? (
                                        // Modo Edição Valor
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editForm.amount}
                                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                            className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white w-24 text-right"
                                        />
                                    ) : (
                                        // Modo Visualização Valor - Certifique-se que item.amount existe
                                        formatCurrency(item.amount)
                                    )}
                                </td> {/* Fechamento da Célula 2 */}

                                {/* CÉLULA 3: Ações (Condicional) */}
                                {allowEdit && ( // Renderiza esta célula SOMENTE se allowEdit for true
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                        {editingId === item.id ? (
                                            // Modo Edição Ações
                                            <>
                                                <button
                                                    onClick={() => onEditSave(item.id)}
                                                    className="text-green-400 hover:text-green-300 mr-2 text-sm"
                                                    title="Salvar"
                                                >
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={onEditCancel}
                                                    className="text-gray-400 hover:text-gray-300 text-sm"
                                                    title="Cancelar"
                                                >
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            // Modo Visualização Ações
                                            <>
                                                <button
                                                    onClick={() => onEditStart(item)}
                                                    className="text-blue-400 hover:text-blue-300 mr-2 text-sm"
                                                    title="Editar"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => onRemove(item.id)}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                    title="Remover"
                                                >
                                                    Remover
                                                </button>
                                            </>
                                        )}
                                    </td> // Fechamento da Célula 3
                                )} {/* Fechamento da condição allowEdit */}

                            </tr> // Fechamento da linha <tr>
                         ); // Fechamento do return dentro do map
                    })} {/* Fechamento do map */}

                    {/* Linha Total */}
                    {items.length > 0 && ( // Só mostra total se houver itens
                        <tr className="bg-gray-800/50">
                            {/* Adicionar célula vazia para coluna Data no total */}
                            {showDateColumn && <td></td>}
                            <td className="py-3 px-4 font-semibold">Total</td>
                            <td className={`py-3 px-4 text-right font-bold text-${itemTypeColor}`}>
                                {formatCurrency(items.reduce((acc, item) => acc + (item.amount || 0), 0))} {/* Garante que amount existe */}
                            </td>
                            {/* Célula vazia para alinhar com coluna Ações */}
                            {allowEdit && <td></td>}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};


// ** TransactionSection Component ** (Generic for Income, Expenses, Recurring)
const TransactionSection = ({
    title,
    items,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    itemTypeColor,
    baseColor,
    showCardOption = false,
    cards = {},
    isRecurring = false,
    formatCurrency,
    selectedMonth,
    selectedYear,
}) => {
    // State for the 'Add' form
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCard, setSelectedCard] = useState('');
    // *** NOVO ESTADO para método de pagamento (default: crédito) ***
    const [paymentMethod, setPaymentMethod] = useState('credit');
    // *** NOVO ESTADO para ordenação ***
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' }); // Inicia ordenando por data descendente

    // Inicializa com o primeiro dia do mês/ano selecionado ou data atual se for recorrente
    const initialDate = useMemo(() => {
        const today = new Date();
        const date = isRecurring ? today : new Date(selectedYear, selectedMonth, today.getDate()); // Dia 1 do mês selecionado
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }, [selectedMonth, selectedYear, isRecurring]); // Recalcula se o mês/ano mudar
    const [transactionDate, setTransactionDate] = useState(initialDate);

    // *** NOVA FUNÇÃO para lidar com a solicitação de ordenação ***
    const handleSortRequest = (key) => {
        let direction = 'asc';
        // Se clicar na mesma coluna que já está ordenada ascendentemente, inverte para descendente
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        // Senão, ordena ascendentemente pela nova coluna (ou pela mesma se estava descendente)
        setSortConfig({ key, direction });
    };

    // Atualizar data inicial se mês/ano mudar E NÃO for recorrente
    useEffect(() => {
        if (!isRecurring) {
            const newInitialDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
            // Só atualiza se a data atual NÃO estiver no mês/ano selecionado (evita reset desnecessário)
            try {
                const currentDateObj = new Date(transactionDate + 'T00:00:00');
                 if(currentDateObj.getMonth() !== selectedMonth || currentDateObj.getFullYear() !== selectedYear) {
                    setTransactionDate(newInitialDate);
                 }
            } catch {
                setTransactionDate(newInitialDate); // Define se a data atual for inválida
            }
        }
        // Se for recorrente, a data não deve mudar com o seletor de mês/ano
    }, [selectedMonth, selectedYear, isRecurring, transactionDate]);

    // State for editing
    const [editingId, setEditingId] = useState(null);
    // *** Adicionar date ao editForm ***
    const [editForm, setEditForm] = useState({ amount: '', description: '', date: '' });

    const handleAdd = () => {
        const parsedAmount = parseFloat(amount);
        // *** VALIDAÇÃO: Checar se transactionDate é válida ***
        let itemDateISO = '';
        try {
            // Adiciona T00:00:00 para consistência de timezone ao salvar
             itemDateISO = new Date(transactionDate + 'T00:00:00').toISOString();
             if (isNaN(new Date(itemDateISO).getTime())) throw new Error("Invalid Date"); // Checa se a conversão foi válida
        } catch (e) {
             alert('Por favor, insira uma data válida.');
             return; // Impede a adição
        }

        if (description.trim() && !isNaN(parsedAmount) && parsedAmount > 0) {
            const newItemData = {
                amount: parsedAmount,
                description: description.trim(),
                card: showCardOption ? (selectedCard || null) : undefined,
                paymentMethod: (baseColor === 'red' || baseColor === 'orange') ? paymentMethod : undefined,
                 // *** USAR a data do input ***
                date: itemDateISO,
            };
            onAddItem(newItemData);
            // Reset form
            setAmount('');
            setDescription('');
            setSelectedCard('');
            setPaymentMethod('credit');
             // Reset date para o início do mês/ano atual ou hoje (recorrente)
            setTransactionDate(initialDate);
        } else {
            alert('Por favor, insira uma descrição, valor e data válidos.');
        }
    };

    const handleEditStart = (item) => {
        setEditingId(item.id);
        // *** Popular date no editForm (converter ISO para YYYY-MM-DD) ***
        let dateForInput = '';
        if (item.date) {
            try {
                 // Tenta converter a data ISO para o formato YYYY-MM-DD
                 // Adiciona T00:00:00 para garantir que o timezone não mude o dia na conversão
                 dateForInput = new Date(item.date.split('T')[0] + 'T00:00:00').toISOString().split('T')[0];
            } catch {
                dateForInput = ''; // Deixa vazio se a data armazenada for inválida
            }
        }
        setEditForm({
            amount: item.amount,
            description: item.description,
            date: dateForInput // Formato YYYY-MM-DD
            // Não editamos card ou payment method aqui por simplicidade
        });
    };

    const handleEditSave = (id) => {
        const parsedAmount = parseFloat(editForm.amount);
         // *** VALIDAÇÃO da data no editForm ***
        let updatedDateISO = '';
        try {
            updatedDateISO = new Date(editForm.date + 'T00:00:00').toISOString();
            if (isNaN(new Date(updatedDateISO).getTime())) throw new Error("Invalid Date");
        } catch (e) {
             alert('Por favor, insira uma data válida para editar.');
             return;
        }

        if (editForm.description.trim() && !isNaN(parsedAmount) && parsedAmount >= 0) {
             onUpdateItem(id, {
                amount: parsedAmount,
                description: editForm.description.trim(),
                 // *** Incluir a data atualizada ***
                date: updatedDateISO,
             });
             handleEditCancel();
        } else {
             alert('Por favor, insira uma descrição, valor e data válidos para editar.');
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditForm({ amount: '', description: '', date: '' });
    };

    // Filter items based on selected month/year unless it's recurring
    const filteredItems = useMemo(() => {
        // Garante que items seja um array para evitar erros se vier como undefined/null
        let itemsToFilter = items || [];
        let initiallyFiltered;
        if (isRecurring) {
            // Para recorrentes, filtramos apenas itens que têm uma data válida
             initiallyFiltered = itemsToFilter.filter(item => {
                if (!item.date) return false;
                try {
                    // Checa se a data pode ser convertida para um número válido
                    return !isNaN(new Date(item.date).getTime());
                } catch {
                    return false; // Exclui se houver erro na conversão
                }
            });
        } else {
            // Para não recorrentes, filtramos por mês/ano E data válida
            initiallyFiltered = itemsToFilter.filter(item => {
                if (!item.date) return false; // Skip items without a date
                try {
                    const itemDate = new Date(item.date);
                    // Check for invalid date explicitly
                    if (isNaN(itemDate.getTime())) return false;
                    return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
                } catch (e) {
                    console.error("Error parsing item date during filter:", item.date, e);
                    return false; // Exclude items with invalid dates
                }
            });
        }

        // *** INÍCIO DA MODIFICAÇÃO: ORDENAÇÃO ***
        // Cria uma cópia antes de ordenar para não modificar o array original (boa prática)
        const sortedItems = [...initiallyFiltered].sort((a, b) => {
            // Por enquanto, só ordenamos por 'date'. Adicionar mais chaves exigiria mais lógica aqui.
            if (sortConfig.key === 'date') {
                try {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0; // Não ordena se alguma data for inválida

                    if (sortConfig.direction === 'asc') {
                        return dateA.getTime() - dateB.getTime(); // Ascendente
                    } else {
                        return dateB.getTime() - dateA.getTime(); // Descendente
                    }
                } catch (e) {
                    console.error("Error comparing dates during sort:", a.date, b.date, e);
                    return 0;
                }
        }
        // Se tivéssemos outras colunas, adicionaríamos 'else if (sortConfig.key === 'description')', etc.
        return 0; // Retorna 0 se a chave não for 'date' (ou outra implementada)
    });
    // *** FIM DA ATUALIZAÇÃO DA ORDENAÇÃO ***

    return sortedItems;

    }, [items, selectedMonth, selectedYear, isRecurring, sortConfig]); // *** ADICIONAR sortConfig às dependências ***

     // Define color mapping for Tailwind form inputs
    const formColorClasses = {
        gray: { border: 'border-gray-700', ring: 'focus:ring-gray-400' },
        green: { border: 'border-green-700', ring: 'focus:ring-green-400' },
        red: { border: 'border-red-700', ring: 'focus:ring-red-400' },
        orange: { border: 'border-orange-700', ring: 'focus:ring-orange-400' },
    };
    const currentFormColors = formColorClasses[baseColor] || formColorClasses.gray;

    // Gradient for button
    const buttonGradientClasses = {
        green: 'from-green-400 to-teal-500 hover:shadow-green-500/50',
        red: 'from-red-400 to-pink-500 hover:shadow-red-500/50',
        orange: 'from-orange-400 to-yellow-500 hover:shadow-orange-500/50',
    };
    const currentButtonGradient = buttonGradientClasses[baseColor] || 'from-gray-400 to-gray-600'; // Default gradient

    // *** NOVAS CLASSES para botões de seleção Crédito/Débito ***
    const getPaymentMethodButtonClasses = (method) => {
        const isActive = paymentMethod === method;

        // Definir estilos para cada tema (ativo e inativo)
        const styles = {
            // Estilos para Despesas (red)
            red: {
                active: 'bg-gradient-to-r from-red-400 to-pink-500 shadow-red-500/50 text-white shadow-md',
                inactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700' // Fundo vermelho escuro/transparente, texto vermelho claro
            },
            // Estilos para Recorrentes (orange)
            orange: {
                active: 'bg-gradient-to-r from-orange-400 to-yellow-500 shadow-orange-500/50 text-white shadow-md',
                inactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700' // Fundo laranja escuro/transparente, texto laranja claro
            },
            // Estilos padrão (caso baseColor não seja esperado)
            default: {
                active: 'bg-gray-700 text-white shadow-md',
                inactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }
        };

        // Seleciona o conjunto de estilos correto com base no baseColor
        const themeStyles = styles[baseColor] || styles.default;

        // Seleciona o estilo ativo ou inativo dentro do tema
        const specificStyle = isActive ? themeStyles.active : themeStyles.inactive;

        // Retorna as classes base + o estilo específico do estado/tema
        return `px-4 py-2 text-sm font-medium transition-all duration-300 focus:outline-none ${specificStyle}`;
    };
    // *** FIM DA SUBSTITUIÇÃO DA FUNÇÃO ***
    

    return (
        <div className={`bg-gray-900 rounded-xl p-6 border-2 border-${baseColor}-400 shadow-lg shadow-${baseColor}-500/20 mb-8`}>
            <h2 className={`text-xl font-semibold text-${baseColor}-400 mb-4`}>{title}</h2>

            {/* Add Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-end"> {/* Layout em grid */}
                {/* Valor */}
                <div className="flex-grow">
                    <label htmlFor={`${baseColor}-amount`} className="text-xs text-gray-400 mb-1 block">Valor</label>
                    <input
                        id={`${baseColor}-amount`}
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full bg-gray-800 ${currentFormColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentFormColors.ring}`}
                    />
                </div>

                {/* Descrição */}
                <div className="flex-grow md:col-span-1"> {/* Manter descrição mais estreita */}
                     <label htmlFor={`${baseColor}-description`} className="text-xs text-gray-400 mb-1 block">Descrição</label>
                    <input
                        id={`${baseColor}-description`}
                        type="text"
                        placeholder="Descrição"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`w-full bg-gray-800 ${currentFormColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentFormColors.ring}`}
                    />
                </div>

                {/* *** NOVO CAMPO DE DATA *** */}
                <div className="flex-grow">
                    <label htmlFor={`${baseColor}-date`} className="text-xs text-gray-400 mb-1 block">Data</label>
                    <input
                        id={`${baseColor}-date`}
                        type="date"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className={`w-full bg-gray-800 ${currentFormColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentFormColors.ring} appearance-none`} // appearance-none pode ajudar com estilo
                        // Estilo para o indicador de data (pode variar entre navegadores)
                        style={{ colorScheme: 'dark' }} // Ajuda com o date picker em modo escuro
                    />
                </div>

                {/* Seleção Crédito/Débito (Apenas para Despesas e Recorrentes) */}
                {(baseColor === 'red' || baseColor === 'orange') && (
                    <div className="flex-grow">
                         <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                         <div className="flex rounded-md overflow-hidden border border-gray-700">
                             <button
                                type="button"
                                onClick={() => setPaymentMethod('credit')}
                                className={`${getPaymentMethodButtonClasses('credit')} rounded-l-md flex-1 text-center`}
                             >
                                 Crédito
                             </button>
                             <button
                                type="button"
                                onClick={() => setPaymentMethod('debit')}
                                className={`${getPaymentMethodButtonClasses('debit')} rounded-r-md flex-1 text-center`}
                             >
                                 Débito
                             </button>
                         </div>
                    </div>
                )}

                {/* Dropdown de Cartão (Opcional e apenas se showCardOption for true) */}
                {showCardOption && (
                    <div className="flex-grow">
                        <label htmlFor={`${baseColor}-card`} className="text-xs text-gray-400 mb-1 block">Cartão (Opcional)</label>
                        <CardDropdown
                            cards={cards}
                            selectedCard={selectedCard}
                            onSelectCard={setSelectedCard}
                            baseColor={baseColor}
                        />
                    </div>
                )}

                 {/* Botão Adicionar (agora ocupa uma coluna no grid em telas maiores) */}
                <button
                    onClick={handleAdd}
                    className={`lg:col-start-5 bg-gradient-to-r ${currentButtonGradient} text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg self-end h-[42px]`} // Altura fixa para alinhar
                >
                    Adicionar
                </button>
            </div>

             {/* Seção de Parcelamento (Apenas em Despesas) */}
             {baseColor === 'red' && (
                <InstallmentSection
                    onAddInstallment={onAddItem}
                    baseColor={baseColor}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    // Passar o paymentMethod? Geralmente é crédito, mas podemos adicionar a opção
                />
             )}

            {/* Items List */}
             <h3 className="text-lg font-medium text-gray-300 mt-8 mb-4">
                {isRecurring ? "Itens Registrados" : `Registros de ${MONTH_NAMES[selectedMonth]}/${selectedYear}`}
            </h3>
            {filteredItems.length > 0 ? (
                 <TransactionTable
                    items={filteredItems}
                    onRemove={onRemoveItem}
                    onEditStart={handleEditStart} // Editar não mexe em paymentMethod por ora
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    formatCurrency={formatCurrency}
                    itemTypeColor={itemTypeColor}
                    allowEdit={true}
                    showCard={showCardOption}
                    cards={cards}
                    // *** PASSAR showPaymentMethod (novo prop) ***
                    showPaymentMethod={baseColor === 'red' || baseColor === 'orange'} // Mostra tipo só para despesas/recorrentes
                    baseColor={baseColor}
                    // *** PASSAR showDateColumn ***
                    showDateColumn={true} // Sempre mostrar data nas tabelas principais
                    formatDateDisplay={formatDateDisplay} // Passar a função de formatação
                    // *** PASSAR NOVAS PROPS DE ORDENAÇÃO ***
                    sortConfig={sortConfig}
                    onSortRequest={handleSortRequest}
                />
            ) : (
                 <p className="text-gray-500 italic">Nenhum item registrado {isRecurring ? '' : `para ${MONTH_NAMES[selectedMonth]}/${selectedYear}`}.</p>
            )}

            {/* Lista de Parcelas (Apenas em Despesas) */}
            {baseColor === 'red' && !isRecurring && (
                 <InstallmentList
                    installments={items.filter(item => item.isInstallment)} // Já filtrado por mês/ano dentro do comp.
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    formatCurrency={formatCurrency}
                    onRemoveInstallment={onRemoveItem}
                    itemTypeColor={itemTypeColor}
                    // *** PASSAR showPaymentMethod para lista de parcelas também ***
                    showPaymentMethod={true} // Parcelas também mostram (geralmente crédito)
                    // *** PASSAR showDateColumn e formatDateDisplay ***
                    showDateColumn={true}
                    formatDateDisplay={formatDateDisplay}
                 />
            )}
        </div>
    );
};

// ** InstallmentSection Component (Specific form for adding installments) **
const InstallmentSection = ({ onAddInstallment, baseColor, selectedMonth, selectedYear }) => {
    const [totalAmount, setTotalAmount] = useState('');
    const [description, setDescription] = useState('');
    const [months, setMonths] = useState(2);


    const handleAddInstallment = () => {
        const parsedTotalAmount = parseFloat(totalAmount);
        const numMonths = parseInt(months);

        if (description.trim() && !isNaN(parsedTotalAmount) && parsedTotalAmount > 0 && numMonths > 1) {
            const installmentAmount = parsedTotalAmount / numMonths;
            const baseDate = new Date(selectedYear, selectedMonth, new Date().getDate()); // Usar data atual como referência dia

            for (let i = 0; i < numMonths; i++) {
                // *** DEFINIR 'date' AQUI ***
                const date = new Date(baseDate); // Cria uma cópia da data base
                date.setMonth(baseDate.getMonth() + i); // Adiciona o offset de meses
                // *** FIM DA DEFINIÇÃO DE 'date' ***

                const installmentData = {
                    amount: installmentAmount,
                    description: `${description.trim()} (${i + 1}/${numMonths})`,
                    date: date.toISOString(),
                    isInstallment: true,
                    paymentMethod: 'credit', // Sempre será crédito
                    totalMonths: numMonths,
                    currentMonthIndex: i,
                    originalPurchaseDate: baseDate.toISOString(), // Usar a data base original
                    groupId: Date.now() + Math.random() * 1000 // Melhorar ID se possível
                };
                 onAddInstallment(installmentData);
            }

            // Reset form
            setTotalAmount('');
            setDescription('');
            setMonths(2);
        } else {
            alert('Insira Valor Total, Descrição e número de parcelas (mínimo 2).');
        }
    };

    const formColorClasses = {
        red: { border: 'border-red-700', ring: 'focus:ring-red-400' },
    };
    const currentFormColors = formColorClasses[baseColor] || formColorClasses.red; // Default para red aqui
    const buttonGradientClasses = {
        red: 'from-red-400 to-pink-500 hover:shadow-red-500/50',
    };
    const currentButtonGradient = buttonGradientClasses[baseColor] || buttonGradientClasses.red;

    return (
        <div className="mt-8 pt-6 border-t border-gray-700">
            <h2 className={`text-lg font-semibold text-${baseColor}-400 mb-4`}>Adicionar Compra Parcelada</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
                {/* Valor Total */}
                <div className="flex-grow">
                     <label htmlFor={`inst-amount`} className="text-xs text-gray-400 mb-1 block">Valor Total</label>
                     <input
                        id={`inst-amount`}
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className={`w-full bg-gray-800 ${currentFormColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentFormColors.ring}`}
                    />
                </div>
                {/* Descrição */}
                <div className="flex-grow md:col-span-2 lg:col-span-1">
                    <label htmlFor={`inst-description`} className="text-xs text-gray-400 mb-1 block">Descrição</label>
                    <input
                        id={`inst-description`}
                        type="text"
                        placeholder="Descrição da Compra"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`w-full bg-gray-800 ${currentFormColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentFormColors.ring}`}
                    />
                </div>
                 {/* Nº Parcelas */}
                <div className="flex-grow">
                    <label htmlFor={`inst-months`} className="text-xs text-gray-400 mb-1 block">Nº Parcelas</label>
                    <input
                        id={`inst-months`}
                        type="number"
                        min="2"
                        step="1"
                        placeholder="Ex: 12"
                        value={months}
                        onChange={(e) => setMonths(parseInt(e.target.value) || 2)}
                         className={`w-full bg-gray-800 ${currentFormColors.border} rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${currentFormColors.ring}`}
                    />
                </div>

                {/* Botão Parcelar */}
                <button
                    onClick={handleAddInstallment}
                    className={`lg:col-start-4 bg-gradient-to-r ${currentButtonGradient} text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg self-end h-[42px]`}
                >
                    Parcelar
                </button>
             </div>
        </div>
    );
};

// ** InstallmentList Component (Displays only installments for the current month) **
const InstallmentList = ({
    installments,
    selectedMonth,
    selectedYear,
    formatCurrency,
    onRemoveInstallment,
    itemTypeColor,
    showPaymentMethod = false,
    // *** RECEBER NOVOS PROPS ***
    showDateColumn = false,
    formatDateDisplay
}) => {

    // *** NOVO ESTADO para ordenação ***
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

    // *** NOVA FUNÇÃO para lidar com a solicitação de ordenação ***
    const handleSortRequest = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredInstallments = useMemo(() => {
        // Garante que installments seja um array
        const installmentsToFilter = installments || [];

        const filtered = installmentsToFilter.filter(item => {
             if (!item.date || !item.isInstallment) return false;
            try {
                const itemDate = new Date(item.date);
                 // Check for invalid date explicitly
                 if (isNaN(itemDate.getTime())) return false;
                return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
            } catch (e) {
                console.error("Error parsing installment date:", item.date, e);
                return false;
            }
        });

        // *** LÓGICA DE ORDENAÇÃO ATUALIZADA ***
        const sorted = [...filtered].sort((a, b) => {
            if (sortConfig.key === 'date') {
                try {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;

                    if (sortConfig.direction === 'asc') {
                        return dateA.getTime() - dateB.getTime();
                    } else {
                        return dateB.getTime() - dateA.getTime();
                    }
                } catch (e) {
                    console.error("Error comparing installment dates during sort:", a.date, b.date, e);
                    return 0;
                }
            }
            return 0;
        });
        // *** FIM DA ATUALIZAÇÃO DA ORDENAÇÃO ***

        return sorted;

    }, [installments, selectedMonth, selectedYear, sortConfig]); // *** ADICIONAR sortConfig às dependências ***

    if (filteredInstallments.length === 0) {
        return null; // Don't render anything if no installments for this month
    }

    return (
        <div className="mt-8 pt-6 border-t border-gray-700">
             <h3 className="text-lg font-medium text-gray-300 mb-4">
                Parcelas de {MONTH_NAMES[selectedMonth]}/{selectedYear}
             </h3>
             <div className="overflow-x-auto">
                {/* *** ATUALIZAR CHAMADA DA TransactionTable *** */}
                <TransactionTable
                     items={filteredInstallments}
                     onRemove={onRemoveInstallment}
                     // Edição de parcelas individuais pode ser complexo, desabilitar por ora?
                     allowEdit={false} // <-- Desabilitar edição direta de parcelas na lista
                     // onEditStart={(item) => console.log("Edit installment?", item)} // Placeholder se habilitar
                     // onEditSave={() => {}}
                     // onEditCancel={() => {}}
                     // editingId={null}
                     // editForm={{}}
                     // setEditForm={() => {}}
                     formatCurrency={formatCurrency}
                     itemTypeColor={itemTypeColor}
                     showPaymentMethod={showPaymentMethod} // Passar prop existente
                     baseColor="red" // Parcelas são sempre "despesa" (red)
                     // Passar novos props
                     showDateColumn={showDateColumn}
                     formatDateDisplay={formatDateDisplay}
                     // *** PASSAR NOVAS PROPS DE ORDENAÇÃO ***
                     sortConfig={sortConfig}
                     onSortRequest={handleSortRequest}
                 />
                 {/* Tabela antiga removida, usamos TransactionTable agora */}
             </div>
        </div>
    );
};

// --- Main App Component ---

const FinancialApp = () => {
  // --- State ---
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // For initial auth check
  const [authError, setAuthError] = useState('');

  // Profile State
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(INITIAL_PROFILE);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Financial Data State (grouped)
  const [financialData, setFinancialData] = useState({
    incomeList: [],
    expenseList: [], // Will include both single and installment expenses
    recurringList: [],
    // installmentList is now merged into expenseList with a flag/type
  });
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [isSaving, setIsSaving] = useState(false); // Flag for visual feedback on save

  // UI State
  const [activeTab, setActiveTab] = useState(INITIAL_TAB);
  const [currentMonthYear, setCurrentMonthYear] = useState(getCurrentMonthYear());
  const { month: selectedMonth, year: selectedYear } = currentMonthYear;

  // --- Effects ---

  // Effect for Auth State Change
  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Clear user-specific data on logout
        setSelectedProfile(null);
        setProfiles([]);
        setFinancialData({ incomeList: [], expenseList: [], recurringList: [] });
        localStorage.removeItem('selectedProfile');
        localStorage.removeItem('activeTab'); // Reset tab too? Optional.
        setLoadingAuth(false);
      }
      // Profile loading is handled in the user effect
    }, (error) => {
        console.error("Auth state error:", error);
        setAuthError("Erro ao verificar autenticação.");
        setLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup listener
  }, []);

  // Effect for Loading Profiles when User changes
  useEffect(() => {
    if (!user) {
        setLoadingAuth(false); // Ensure loading stops if user becomes null
        return; // No user, nothing to load
    }

    setLoadingProfiles(true);
    setProfileError('');
    const unsubscribeProfiles = listenToProfiles(user.uid, (loadedProfiles) => {
      setProfiles(loadedProfiles);
      // Auto-select profile logic
      const currentSelected = localStorage.getItem('selectedProfile');
      if (currentSelected && loadedProfiles.some(p => p.id === currentSelected)) {
          setSelectedProfile(currentSelected);
      } else if (loadedProfiles.length > 0) {
          // Select first profile if current selection is invalid or non-existent
          setSelectedProfile(loadedProfiles[0].id);
          localStorage.setItem('selectedProfile', loadedProfiles[0].id);
      } else {
          // No profiles exist (maybe after deleting the last one)
          setSelectedProfile(null);
          localStorage.removeItem('selectedProfile');
      }
      setLoadingProfiles(false);
      setLoadingAuth(false); // Auth process complete when profiles are loaded/checked
    });

    return () => unsubscribeProfiles(); // Cleanup listener

  }, [user]); // Re-run when user object changes

  // Effect for Loading Financial Data when User or Profile changes
  useEffect(() => {
    if (!user || !selectedProfile) {
        // Clear data if no user or profile selected
         setFinancialData({ incomeList: [], expenseList: [], recurringList: [] });
        return;
    }

    setLoadingData(true);
    setDataError('');
    console.log(`Listening to data for user: ${user.uid}, profile: ${selectedProfile}`);
    const unsubscribeData = listenToFinancialData(user.uid, selectedProfile, (data) => {
        setFinancialData(data); // Update state with data from Firebase
        setLoadingData(false);
    });

    return () => {
        console.log(`Stopping data listener for profile: ${selectedProfile}`);
        unsubscribeData(); // Cleanup listener
    }

  }, [user, selectedProfile]); // Re-run when user or selected profile changes


  // Effect for Saving Data to Firebase (debounced or throttled recommended for high frequency changes)
   useEffect(() => {
       // Prevent saving initially until data is loaded, or if no user/profile
       if (loadingData || !user || !selectedProfile || loadingAuth) {
           return;
       }

       setIsSaving(true); // Indicate saving process
       // Debounce would be ideal here
       const saveTimer = setTimeout(() => {
           saveFinancialData(user.uid, selectedProfile, financialData)
               .then(() => {
                   console.log("📤 Dados salvos no Firebase");
                   setIsSaving(false);
               })
               .catch((error) => {
                   console.error("❌ Erro ao salvar os dados:", error);
                   setDataError("Falha ao salvar dados. Tente novamente.");
                   setIsSaving(false);
               });
       }, 1500); // Debounce: wait 1.5 seconds after last change to save

       return () => clearTimeout(saveTimer); // Clear timer if component unmounts or deps change

   }, [financialData, user, selectedProfile, loadingData, loadingAuth]); // Rerun when data changes


  // Effect for saving UI state to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem('selectedProfile', selectedProfile);
    } else {
        localStorage.removeItem('selectedProfile');
    }
  }, [selectedProfile]);

  // --- Handlers ---

  const handleAuthSuccess = (loggedInUser) => {
      setUser(loggedInUser); // Set user state, triggers profile loading effect
      setAuthError('');
      // Profile selection logic is handled within the profile loading effect
  };

  const handleLogout = async () => {
    try {
      await logOut();
      // State clearing is handled by onAuthStateChanged effect
      console.log("Logout successful");
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError('Erro ao fazer logout.');
    }
  };

  const handleCreateProfile = async (profileName) => {
    if (!user) return;
    setProfileError('');
    try {
        // // Optionally auto-select the new profile
        // const newProfileId = await createProfile(user.uid, profileName);        
        await createProfile(user.uid, profileName); // Apenas chama a função

        alert('Perfil criado com sucesso!'); // Keep simple alert for user feedback here
    } catch (error) {
        console.error('Create profile error:', error);
        setProfileError(error.message || 'Erro ao criar perfil.');
        // Re-throw or handle UI feedback
        throw error; // Re-throw to be caught in Header component if needed
    }
  };

  const handleSelectProfile = useCallback((profileId) => {
    if(profileId !== selectedProfile){
        console.log("Selecting profile:", profileId);
        setSelectedProfile(profileId);
        // Data loading effect will trigger
    }
  }, [selectedProfile]);


  // Generic function to add any item type
  const addItem = (itemType, newItemData) => {
    const listName = `${itemType}List`;
    const newItem = {
        ...newItemData, // Spread payload (amount, description, date, maybe card, maybe installment flags)
        id: Date.now() + Math.random(), // Simple unique ID generation
    };

    // --- SANITIZATION STEP ---
    // Create a new object containing only defined properties
    const sanitizedItem = Object.entries(newItem).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            acc[key] = value; // Keep the property if its value is not undefined
        }
        // You could also choose to replace undefined with null here if preferred:
        // acc[key] = value === undefined ? null : value;
        return acc;
    }, {});
    // --- END SANITIZATION ---


    setFinancialData(prevData => {
        // Ensure the list exists before trying to spread it
        const currentList = prevData[listName] || [];
        return {
            ...prevData,
            [listName]: [...currentList, sanitizedItem] // Add the sanitized item
        };
    });
};

  // Generic function to remove any item type by ID
  const removeItem = (itemType, idToRemove) => {
      const listName = `${itemType}List`;
      setFinancialData(prevData => ({
          ...prevData,
          [listName]: (prevData[listName] || []).filter(item => item.id !== idToRemove)
      }));
  };

  // Generic function to update any item type by ID
const updateItem = (itemType, idToUpdate, updatedData) => {
    const listName = `${itemType}List`;

    // --- SANITIZATION STEP for updatedData ---
    const sanitizedUpdates = Object.entries(updatedData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            acc[key] = value;
        }
        return acc;
    }, {});
    // --- END SANITIZATION ---

    setFinancialData(prevData => {
         const currentList = prevData[listName] || [];
         return {
            ...prevData,
            [listName]: currentList.map(item =>
                item.id === idToUpdate
                 ? { ...item, ...sanitizedUpdates } // Merge sanitized updates onto existing item
                 : item
            )
         };
    });
};



  // --- Calculations (Memoized) ---
  const { filteredIncome, filteredExpenses, filteredRecurring, filteredInstallments } = useMemo(() => {
        const income = financialData.incomeList.filter(item => {
            if (!item.date) return false;
            try {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
            } catch { return false; }
        });

        // Expenses now includes single and installments
        const allExpensesForMonth = financialData.expenseList.filter(item => {
             if (!item.date) return false;
             try {
                 const itemDate = new Date(item.date);
                 return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
             } catch { return false; }
        });

        const expenses = allExpensesForMonth.filter(item => !item.isInstallment);
        const installments = allExpensesForMonth.filter(item => item.isInstallment);

        // Recurring are not filtered by month/year
        const recurring = financialData.recurringList || [];

        return {
            filteredIncome: income,
            filteredExpenses: expenses, // Only non-installments for the expense table
            filteredRecurring: recurring,
            filteredInstallments: installments // For the separate installment table/total
        };
    }, [financialData, selectedMonth, selectedYear]);


  const totals = useMemo(() => {
    const totalIncome = filteredIncome.reduce((acc, item) => acc + item.amount, 0);
    // Total expenses combines single expenses of the month AND installments of the month
    const totalExpenses = filteredExpenses.reduce((acc, item) => acc + item.amount, 0);
    // Total recurring applies every month regardless of the selected month filter
    const totalRecurring = filteredRecurring.reduce((acc, item) => acc + item.amount, 0);
    // Total installments is calculated separately for clarity in dashboard/balance
    const totalInstallments = filteredInstallments.reduce((acc, item) => acc + item.amount, 0);

    return { totalIncome, totalExpenses, totalRecurring, totalInstallments };
  }, [filteredIncome, filteredExpenses, filteredRecurring, filteredInstallments]);

  const balance = useMemo(() => {
      // Balance = Income of Month - (Single Expenses of Month + Installments of Month + ALL Recurring Expenses)
      return totals.totalIncome - (totals.totalExpenses + totals.totalInstallments + totals.totalRecurring);
  }, [totals]);


  // --- Render Logic ---

  if (loadingAuth) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans">
      {!user ? (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          <Header
            user={user}
            profiles={profiles}
            selectedProfile={selectedProfile}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onLogout={handleLogout}
          />

           {/* Display global errors */}
           {authError && <p className="text-center text-red-500 py-2">{authError}</p>}
           {profileError && <p className="text-center text-red-500 py-2">{profileError}</p>}
           {dataError && <p className="text-center text-red-500 py-2">{dataError}</p>}
           {isSaving && <p className="text-center text-yellow-400 text-xs py-1 animate-pulse">Salvando alterações...</p>}


          {/* Show message if no profile is selected or loading */}
          {loadingProfiles && <p className="text-center text-gray-400 py-4">Carregando perfis...</p>}
          {!loadingProfiles && profiles.length > 0 && !selectedProfile &&
              <p className="text-center text-yellow-500 py-4">Por favor, selecione um perfil para continuar.</p>
          }
           {!loadingProfiles && profiles.length === 0 &&
              <p className="text-center text-yellow-500 py-4">Nenhum perfil encontrado. Crie um perfil para começar.</p>
          }


          {/* Only render main content if a profile is selected */}
          {selectedProfile && !loadingData && (
              <>
                <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

                <MonthYearSelector
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    setSelectedMonth={(m) => setCurrentMonthYear(prev => ({ ...prev, month: m }))}
                    setSelectedYear={(y) => setCurrentMonthYear(prev => ({ ...prev, year: y }))}
                />

                <div className="container mx-auto px-4 pb-8"> {/* Add padding bottom */}
                    {activeTab === 'dashboard' && (
                    <DashboardView
                        totals={totals}
                        balance={balance}
                        formatCurrency={formatCurrency}
                    />
                    )}

                    {activeTab === 'income' && (
                    <TransactionSection
                        title="Gerenciar Receitas"
                        items={financialData.incomeList}
                        onAddItem={(data) => addItem('income', data)}
                        onRemoveItem={(id) => removeItem('income', id)}
                        onUpdateItem={(id, data) => updateItem('income', id, data)}
                        itemTypeColor="green-400"
                        baseColor="green"
                        formatCurrency={formatCurrency}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                    />
                    )}

                    {activeTab === 'expenses' && (
                    <TransactionSection
                        title="Gerenciar Despesas"
                        // Pass the combined list, filtering happens inside based on flags
                        items={financialData.expenseList}
                        onAddItem={(data) => addItem('expense', data)}
                        onRemoveItem={(id) => removeItem('expense', id)}
                        onUpdateItem={(id, data) => updateItem('expense', id, data)}
                        itemTypeColor="red-400"
                        baseColor="red"
                        showCardOption={true} // Expenses can have cards
                        cards={CARDS}
                        formatCurrency={formatCurrency}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        // Includes InstallmentSection and InstallmentList internally
                    />
                    )}

                    {activeTab === 'recurring' && (
                    <TransactionSection
                        title="Gerenciar Despesas Recorrentes"
                        items={financialData.recurringList}
                        onAddItem={(data) => addItem('recurring', data)}
                        onRemoveItem={(id) => removeItem('recurring', id)}
                        onUpdateItem={(id, data) => updateItem('recurring', id, data)}
                        itemTypeColor="orange-400"
                        baseColor="orange"
                        showCardOption={true} // Recurring can have cards
                        cards={CARDS}
                        isRecurring={true} // Important flag
                        formatCurrency={formatCurrency}
                        // No month/year needed for filtering recurring
                    />
                    )}
                </div>
              </>
          )}

          {/* Show loading indicator for data */}
           {loadingData && <div className="text-center text-gray-400 py-10">Carregando dados financeiros...</div>}


          <footer className="text-center py-6 bg-gray-950 border-t border-gray-800 mt-auto"> {/* Ensure footer is at bottom */}
            <p className="text-sm font-medium text-gray-400">
              Desenvolvido por <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">Wellington Beraldo</span>
            </p>
          </footer>
        </>
      )}
    </div>
  );
};

export default FinancialApp;
// --- END OF FILE App.js ---