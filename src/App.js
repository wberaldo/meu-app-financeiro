import React, { useState, useEffect } from 'react';
import './App.css';

const FinancialApp = () => {
  // Estados para gerenciar perfis
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');

  // Estados para armazenar os dados financeiros
  const [income, setIncome] = useState('');
  const [incomeList, setIncomeList] = useState([]);
  const [expense, setExpense] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseList, setExpenseList] = useState([]);
  const [recurringExpense, setRecurringExpense] = useState('');
  const [recurringDescription, setRecurringDescription] = useState('');
  const [recurringList, setRecurringList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estados para edição
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newRecurringDescription, setNewRecurringDescription] = useState('');

  // Carregar perfis e dados do localStorage
  useEffect(() => {
    const savedProfiles = localStorage.getItem('profiles');
    if (savedProfiles) {
      setProfiles(JSON.parse(savedProfiles));
    }
  }, []);

  // Carregar dados do perfil atual
  useEffect(() => {
    if (currentProfile) {
      const profileData = profiles.find(p => p.name === currentProfile);
      if (profileData) {
        setIncomeList(profileData.incomeList || []);
        setExpenseList(profileData.expenseList || []);
        setRecurringList(profileData.recurringList || []);
      }
    }
  }, [currentProfile, profiles]);

  // Salvar perfis no localStorage quando atualizados
  useEffect(() => {
    if (currentProfile) {
      const updatedProfiles = profiles.map(p => 
        p.name === currentProfile 
          ? { ...p, incomeList, expenseList, recurringList } 
          : p
      );
      setProfiles(updatedProfiles);
      localStorage.setItem('profiles', JSON.stringify(updatedProfiles));
    }
  }, [incomeList, expenseList, recurringList]);

  // Funções para gerenciar perfis
  const createProfile = () => {
    if (newProfileName.trim() === '') return;

    const newProfile = {
      name: newProfileName,
      incomeList: [],
      expenseList: [],
      recurringList: []
    };

    setProfiles([...profiles, newProfile]);
    setCurrentProfile(newProfileName);
    setNewProfileName('');
  };

  const switchProfile = (profileName) => {
    setCurrentProfile(profileName);
  };

  const deleteProfile = (profileName) => {
    const updatedProfiles = profiles.filter(p => p.name !== profileName);
    setProfiles(updatedProfiles);
    localStorage.setItem('profiles', JSON.stringify(updatedProfiles));
    if (currentProfile === profileName) {
      setCurrentProfile(null);
      setIncomeList([]);
      setExpenseList([]);
      setRecurringList([]);
    }
  };

  // Funções para adicionar receitas e despesas
  const addIncome = () => {
    if (income && !isNaN(income) && parseFloat(income) > 0) {
      const newIncome = {
        id: Date.now(),
        amount: parseFloat(income),
        date: new Date(selectedYear, selectedMonth, 15),
        description: 'Receita Mensal'
      };
      setIncomeList([...incomeList, newIncome]);
      setIncome('');
    }
  };

  const addExpense = () => {
    if (expense && !isNaN(expense) && parseFloat(expense) > 0) {
      const newExpense = {
        id: Date.now(),
        amount: parseFloat(expense),
        description: expenseDescription || 'Despesa',
        date: new Date(selectedYear, selectedMonth, new Date().getDate())
      };
      setExpenseList([...expenseList, newExpense]);
      setExpense('');
      setExpenseDescription('');
    }
  };

  const addRecurringExpense = () => {
    if (recurringExpense && !isNaN(recurringExpense) && parseFloat(recurringExpense) > 0) {
      const newRecurring = {
        id: Date.now(),
        amount: parseFloat(recurringExpense),
        description: recurringDescription || 'Despesa Recorrente'
      };
      setRecurringList([...recurringList, newRecurring]);
      setRecurringExpense('');
      setRecurringDescription('');
    }
  };

  // Funções para remover itens
  const removeIncome = (id) => {
    setIncomeList(incomeList.filter(item => item.id !== id));
  };

  const removeExpense = (id) => {
    setExpenseList(expenseList.filter(item => item.id !== id));
  };

  const removeRecurring = (id) => {
    setRecurringList(recurringList.filter(item => item.id !== id));
  };

  // Funções para editar descrição
  const startEditingExpense = (id, description) => {
    setEditingExpenseId(id);
    setNewExpenseDescription(description);
  };

  const startEditingRecurring = (id, description) => {
    setEditingRecurringId(id);
    setNewRecurringDescription(description);
  };

  const saveEditedExpense = (id) => {
    setExpenseList(expenseList.map(item =>
      item.id === id ? { ...item, description: newExpenseDescription } : item
    ));
    setEditingExpenseId(null);
    setNewExpenseDescription('');
  };

  const saveEditedRecurring = (id) => {
    setRecurringList(recurringList.map(item =>
      item.id === id ? { ...item, description: newRecurringDescription } : item
    ));
    setEditingRecurringId(null);
    setNewRecurringDescription('');
  };

  // Funções para filtrar dados por mês
  const filteredIncomeList = incomeList.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
  });

  const filteredExpenseList = expenseList.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
  });

  // Cálculos para o resumo financeiro
  const totalIncome = filteredIncomeList.reduce((acc, item) => acc + item.amount, 0);
  const totalExpenses = filteredExpenseList.reduce((acc, item) => acc + item.amount, 0);
  const totalRecurring = recurringList.reduce((acc, item) => acc + item.amount, 0);
  const balance = totalIncome - totalExpenses - totalRecurring;

  // Funções auxiliares
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  // Gerar anos para o seletor (atual -5/+5)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearOptions.push(i);
  }

  // Dados para o gráfico
  const chartData = [
    { categoria: 'Receitas', valor: totalIncome, cor: '#00ff99' },
    { categoria: 'Despesas', valor: totalExpenses, cor: '#ff3366' },
    { categoria: 'Recorrentes', valor: totalRecurring, cor: '#ff9900' }
  ];

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans">
      {/* Cabeçalho */}
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          Controle Financeiro Neon
        </h1>
      </header>

      {/* Gerenciamento de Perfis */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Novo perfil"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={createProfile}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md px-6 py-2 transition-colors"
          >
            Criar Perfil
          </button>
        </div>
        <div className="mt-4">
          {profiles.map((profile) => (
            <div key={profile.name} className="flex items-center justify-between mb-2">
              <button
                onClick={() => switchProfile(profile.name)}
                className={`px-4 py-2 rounded-md transition-all duration-300 ${
                  currentProfile === profile.name
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {profile.name}
              </button>
              <button
                onClick={() => deleteProfile(profile.name)}
                className="text-red-400 hover:text-red-300"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Abas */}
      <div className="flex justify-center my-6">
        <div className="flex space-x-2 bg-gray-900 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 rounded-md transition-all duration-300 ${
              activeTab === 'dashboard' 
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/50' 
                : 'text-gray-400 hover:text-cyan-400'
            }`}  
            >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('income')} 
            className={`px-4 py-2 rounded-md transition-all duration-300 ${
              activeTab === 'income' 
                ? 'bg-gradient-to-r from-green-400 to-teal-500 text-white shadow-lg shadow-green-500/50' 
                : 'text-gray-400 hover:text-green-400'
            }`} 
            >
            Receitas
          </button>
          <button 
            onClick={() => setActiveTab('expenses')} 
            className={`px-4 py-2 rounded-md transition-all duration-300 ${
              activeTab === 'expenses' 
                ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-lg shadow-red-500/50' 
                : 'text-gray-400 hover:text-red-400'
            }`}
            >
            Despesas
          </button>
          <button 
            onClick={() => setActiveTab('recurring')} 
            className={`px-4 py-2 rounded-md transition-all duration-300 ${
              activeTab === 'recurring' 
                ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-white shadow-lg shadow-orange-500/50' 
                : 'text-gray-400 hover:text-orange-400'
            }`}
            >
            Recorrentes
          </button>
        </div>
      </div>

      {/* Seletor de Mês e Ano */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-4">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {monthNames.map((month, index) => (
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

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Receitas Totais</h3>
              <p className="text-3xl font-bold text-cyan-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-red-400 shadow-lg shadow-red-500/20">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Despesas Totais</h3>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(totalExpenses + totalRecurring)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-blue-400 shadow-lg shadow-blue-500/20">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Saldo</h3>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-pink-400'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="bg-gray-900 rounded-xl p-6 mb-8 border-2 border-purple-400 shadow-lg shadow-purple-500/20">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Distribuição Mensal</h3>
            <div className="flex items-center justify-center h-64">
              {chartData.map((item, index) => (
                <div key={index} className="flex flex-col items-center mx-4" style={{ height: '100%' }}>
                  <div className="flex-grow w-32 relative">
                    <div 
                      className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700 ease-in-out" 
                      style={{ 
                        backgroundColor: item.cor, 
                        height: `${(item.valor / Math.max(...chartData.map(d => d.valor), 1)) * 100}%`,
                        boxShadow: `0 0 15px ${item.cor}`
                      }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm font-medium" style={{ color: item.cor }}>{item.categoria}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="bg-gray-900 rounded-xl p-6 border-2 border-green-400 shadow-lg shadow-green-500/20">
            <h2 className="text-xl font-semibold text-green-400 mb-4">Adicionar Receita</h2>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-grow">
                <input
                  type="number"
                  placeholder="Valor"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <button
                onClick={addIncome}
                className="bg-gradient-to-r from-green-400 to-teal-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
              >
                Adicionar
              </button>
            </div>

            <h3 className="text-lg font-medium text-gray-300 mt-8 mb-4">Receitas Registradas</h3>
            {filteredIncomeList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400">Descrição</th>
                      <th className="text-right py-3 px-4 text-gray-400">Valor</th>
                      <th className="text-right py-3 px-4 text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncomeList.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3 px-4">{item.description}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => removeIncome(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-800/50">
                      <td className="py-3 px-4 font-medium">Total</td>
                      <td className="py-3 px-4 text-right text-green-400 font-bold">
                        {formatCurrency(totalIncome)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhuma receita registrada para este mês.</p>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-gray-900 rounded-xl p-6 border-2 border-red-400 shadow-lg shadow-red-500/20">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Adicionar Despesa</h2>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-grow">
                <input
                  type="number"
                  placeholder="Valor"
                  value={expense}
                  onChange={(e) => setExpense(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Descrição"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <button
                onClick={addExpense}
                className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
              >
                Adicionar
              </button>
            </div>

            <h3 className="text-lg font-medium text-gray-300 mt-8 mb-4">Despesas Registradas</h3>
            {filteredExpenseList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400">Descrição</th>
                      <th className="text-right py-3 px-4 text-gray-400">Valor</th>
                      <th className="text-right py-3 px-4 text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenseList.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3 px-4">
                          {editingExpenseId === item.id ? (
                            <input
                              type="text"
                              value={newExpenseDescription}
                              onChange={(e) => setNewExpenseDescription(e.target.value)}
                              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white"
                            />
                          ) : (
                            item.description
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-red-400 font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingExpenseId === item.id ? (
                            <button
                              onClick={() => saveEditedExpense(item.id)}
                              className="text-green-400 hover:text-green-300 mr-2"
                            >
                              Salvar
                            </button>
                          ) : (
                            <button
                              onClick={() => startEditingExpense(item.id, item.description)}
                              className="text-blue-400 hover:text-blue-300 mr-2"
                            >
                              Editar
                            </button>
                          )}
                          <button
                            onClick={() => removeExpense(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-800/50">
                      <td className="py-3 px-4 font-medium">Total</td>
                      <td className="py-3 px-4 text-right text-red-400 font-bold">
                        {formatCurrency(totalExpenses)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhuma despesa registrada para este mês.</p>
            )}
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="bg-gray-900 rounded-xl p-6 border-2 border-orange-400 shadow-lg shadow-orange-500/20">
            <h2 className="text-xl font-semibold text-orange-400 mb-4">Adicionar Despesa Recorrente</h2>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-grow">
                <input
                  type="number"
                  placeholder="Valor"
                  value={recurringExpense}
                  onChange={(e) => setRecurringExpense(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Descrição"
                  value={recurringDescription}
                  onChange={(e) => setRecurringDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                onClick={addRecurringExpense}
                className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/50"
              >
                Adicionar
              </button>
            </div>

            <h3 className="text-lg font-medium text-gray-300 mt-8 mb-4">Despesas Recorrentes</h3>
            {recurringList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400">Descrição</th>
                      <th className="text-right py-3 px-4 text-gray-400">Valor</th>
                      <th className="text-right py-3 px-4 text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurringList.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3 px-4">
                          {editingRecurringId === item.id ? (
                            <input
                              type="text"
                              value={newRecurringDescription}
                              onChange={(e) => setNewRecurringDescription(e.target.value)}
                              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white"
                            />
                          ) : (
                            item.description
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-orange-400 font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingRecurringId === item.id ? (
                            <button
                              onClick={() => saveEditedRecurring(item.id)}
                              className="text-green-400 hover:text-green-300 mr-2"
                            >
                              Salvar
                            </button>
                          ) : (
                            <button
                              onClick={() => startEditingRecurring(item.id, item.description)}
                              className="text-blue-400 hover:text-blue-300 mr-2"
                            >
                              Editar
                            </button>
                          )}
                          <button
                            onClick={() => removeRecurring(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-800/50">
                      <td className="py-3 px-4 font-medium">Total</td>
                      <td className="py-3 px-4 text-right text-orange-400 font-bold">
                        {formatCurrency(totalRecurring)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhuma despesa recorrente registrada.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialApp;