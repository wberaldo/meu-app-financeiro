import React, { useState, useEffect } from 'react';
import './App.css';
import { auth, database, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, ref, set, onValue, push } from './firebase';

const FinancialApp = () => {
  // Estados para gerenciar login/cadastro
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Estados para armazenar os dados financeiros
  const [income, setIncome] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
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
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeDescription, setNewIncomeDescription] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [newRecurringAmount, setNewRecurringAmount] = useState('');
  const [newRecurringDescription, setNewRecurringDescription] = useState('');

  // Estados para perfis
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Novos estados para compras parceladas
  const [installmentExpense, setInstallmentExpense] = useState('');
  const [installmentDescription, setInstallmentDescription] = useState('');
  const [installmentMonths, setInstallmentMonths] = useState(1);
  const [installmentList, setInstallmentList] = useState([]);

  // Funções para login e cadastro (mantidas)
  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setUser(user);

      const userId = user.uid;
      const newProfileRef = ref(database, `users/${userId}/profiles`);
      const newProfile = {
        name: 'Principal',
        financialData: { incomeList: [], expenseList: [], recurringList: [], installmentList: [] }
      };

      const newProfileKey = push(newProfileRef).key;
      await set(ref(database, `users/${userId}/profiles/${newProfileKey}`), newProfile);

      setSelectedProfile(newProfileKey);
      alert('Cadastro realizado com sucesso! Perfil padrão criado.');
    } catch (error) {
      alert('Erro ao cadastrar: ' + error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      alert('Erro ao fazer login: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSelectedProfile(null);
    } catch (error) {
      alert('Erro ao fazer logout: ' + error.message);
    }
  };

  // Função para carregar perfis do Firebase
  const loadProfiles = async (userId) => {
    const profilesRef = ref(database, `users/${userId}/profiles`);
    onValue(profilesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfiles(Object.keys(data).map(key => ({ id: key, name: data[key].name })));
      }
    });
  };

  // Função para criar um novo perfil
  const createProfile = async () => {
    if (newProfileName.trim() === '') return;

    const userId = user.uid;
    const newProfileRef = ref(database, `users/${userId}/profiles`);
    const newProfile = {
      name: newProfileName,
      financialData: { incomeList: [], expenseList: [], recurringList: [], installmentList: [] }
    };

    try {
      const newProfileKey = push(newProfileRef).key;
      await set(ref(database, `users/${userId}/profiles/${newProfileKey}`), newProfile);
      setNewProfileName('');
      setIsProfileDropdownOpen(false);
      alert('Perfil criado com sucesso!');
    } catch (error) {
      alert('Erro ao criar perfil: ' + error.message);
    }
  };

  // Função para selecionar um perfil
  const selectProfile = async (profileId) => {
    const userId = user.uid;
    const financialDataRef = ref(database, `users/${userId}/profiles/${profileId}/financialData`);
    onValue(financialDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIncomeList(data.incomeList || []);
        setExpenseList(data.expenseList || []);
        setRecurringList(data.recurringList || []);
        setInstallmentList(data.installmentList || []);
      }
    });
    setSelectedProfile(profileId);
    setIsProfileDropdownOpen(false);
  };

  // Função para salvar dados financeiros no Firebase
  const saveFinancialData = async (userId, profileId, data) => {
    try {
      await set(ref(database, `users/${userId}/profiles/${profileId}/financialData`), data);
    } catch (error) {
      alert('Erro ao salvar dados: ' + error.message);
    }
  };

  // Carregar perfis quando o usuário logar
  useEffect(() => {
    if (user) {
      loadProfiles(user.uid);
    }
  }, [user]);

  // Salvar dados financeiros quando houver alterações
  useEffect(() => {
    if (user && selectedProfile) {
      const financialData = { incomeList, expenseList, recurringList, installmentList };
      saveFinancialData(user.uid, selectedProfile, financialData);
    }
  }, [user, selectedProfile, incomeList, expenseList, recurringList, installmentList]);

  // Funções para adicionar receitas e despesas (mantidas)
  const addIncome = () => {
    if (income && !isNaN(income) && parseFloat(income) > 0) {
      const newIncome = {
        id: Date.now(),
        amount: parseFloat(income),
        description: incomeDescription || 'Receita',
        date: new Date(Number(selectedYear), Number(selectedMonth), 15).toISOString(),
      };
      setIncomeList([...incomeList, newIncome]);
      setIncome('');
      setIncomeDescription('');
    }
  };

  const addExpense = () => {
    if (expense && !isNaN(expense) && parseFloat(expense) > 0) {
      const newExpense = {
        id: Date.now(),
        amount: parseFloat(expense),
        description: expenseDescription || 'Despesa',
        date: new Date(selectedYear, selectedMonth, new Date().getDate()),
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
        description: recurringDescription || 'Despesa Recorrente',
      };
      setRecurringList([...recurringList, newRecurring]);
      setRecurringExpense('');
      setRecurringDescription('');
    }
  };

  // Nova função para adicionar compras parceladas
  const addInstallmentExpense = () => {
    if (installmentExpense && !isNaN(installmentExpense) && parseFloat(installmentExpense) > 0 && installmentMonths > 0) {
      const totalAmount = parseFloat(installmentExpense);
      const installmentAmount = totalAmount / installmentMonths;

      const newInstallments = Array.from({ length: installmentMonths }, (_, index) => {
        const date = new Date(selectedYear, selectedMonth + index, new Date().getDate());
        return {
          id: Date.now() + index,
          amount: installmentAmount,
          description: `${installmentDescription || 'Compra Parcelada'} (${index + 1}/${installmentMonths})`,
          date: date.toISOString(),
          totalMonths: installmentMonths,
          currentMonth: index + 1,
        };
      });

      setInstallmentList([...installmentList, ...newInstallments]);
      setInstallmentExpense('');
      setInstallmentDescription('');
      setInstallmentMonths(1);
    }
  };

  // Funções para remover itens (mantidas)
  const removeIncome = (id) => {
    setIncomeList(incomeList.filter(item => item.id !== id));
  };

  const removeExpense = (id) => {
    setExpenseList(expenseList.filter(item => item.id !== id));
  };

  const removeRecurring = (id) => {
    setRecurringList(recurringList.filter(item => item.id !== id));
  };

  // Nova função para remover despesas parceladas
  const removeInstallment = (id) => {
    setInstallmentList(installmentList.filter(item => item.id !== id));
  };

  // Funções para editar valores e descrições (mantidas)
  const startEditingIncome = (id, amount, description) => {
    setEditingIncomeId(id);
    setNewIncomeAmount(amount);
    setNewIncomeDescription(description);
  };

  const saveEditedIncome = (id) => {
    setIncomeList(incomeList.map(item =>
      item.id === id ? { ...item, amount: parseFloat(newIncomeAmount), description: newIncomeDescription } : item
    ));
    setEditingIncomeId(null);
    setNewIncomeAmount('');
    setNewIncomeDescription('');
  };

  const startEditingExpense = (id, amount, description) => {
    setEditingExpenseId(id);
    setNewExpenseAmount(amount);
    setNewExpenseDescription(description);
  };

  const saveEditedExpense = (id) => {
    setExpenseList(expenseList.map(item =>
      item.id === id ? { ...item, amount: parseFloat(newExpenseAmount), description: newExpenseDescription } : item
    ));
    setEditingExpenseId(null);
    setNewExpenseAmount('');
    setNewExpenseDescription('');
  };

  const startEditingRecurring = (id, amount, description) => {
    setEditingRecurringId(id);
    setNewRecurringAmount(amount);
    setNewRecurringDescription(description);
  };

  const saveEditedRecurring = (id) => {
    setRecurringList(recurringList.map(item =>
      item.id === id ? { ...item, amount: parseFloat(newRecurringAmount), description: newRecurringDescription } : item
    ));
    setEditingRecurringId(null);
    setNewRecurringAmount('');
    setNewRecurringDescription('');
  };

  // Funções para filtrar dados por mês (atualizadas para incluir compras parceladas)
  const filteredIncomeList = incomeList.filter(item => {
    const itemDate = new Date(item.date);
    return (
      itemDate.getMonth() === Number(selectedMonth) &&
      itemDate.getFullYear() === Number(selectedYear)
    );
  });

  const filteredExpenseList = expenseList.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
  });

  const filteredInstallmentList = installmentList.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
  });

  // Cálculos para o resumo financeiro (atualizados para incluir compras parceladas)
  const totalIncome = filteredIncomeList.reduce((acc, item) => acc + item.amount, 0);
  const totalExpenses = filteredExpenseList.reduce((acc, item) => acc + item.amount, 0);
  const totalRecurring = recurringList.reduce((acc, item) => acc + item.amount, 0);
  const totalInstallments = filteredInstallmentList.reduce((acc, item) => acc + item.amount, 0);
  const balance = totalIncome - totalExpenses - totalRecurring - totalInstallments;

  // Funções auxiliares (mantidas)
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

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearOptions.push(i);
  }

  // Dados para o gráfico (atualizados para incluir compras parceladas)
  const chartData = [
    { categoria: 'Receitas', valor: totalIncome, cor: '#00ff99' },
    { categoria: 'Despesas', valor: totalExpenses, cor: '#ff3366' },
    { categoria: 'Recorrentes', valor: totalRecurring, cor: '#ff9900' },
    { categoria: 'Parceladas', valor: totalInstallments, cor: '#ffcc00' }
  ];

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans">
      {!user ? (
        // Tela de login/cadastro (mantida)
        <div className="flex flex-col items-center justify-center h-screen">
          <h2 className="text-2xl font-bold mb-4">{isLogin ? 'Login' : 'Cadastro'}</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 mb-4"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 mb-4"
          />
          <button
            onClick={isLogin ? handleLogin : handleSignUp}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md px-6 py-2 transition-colors mb-4"
          >
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            {isLogin ? 'Criar uma conta' : 'Já tenho uma conta'}
          </button>
        </div>
      ) : (
        // Restante do aplicativo (atualizado para incluir compras parceladas)
        <>
          <header className="px-6 py-4 border-b border-gray-800">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                Controle Financeiro
              </h1>
              <div className="ml-auto flex items-center space-x-4">
                {/* Dropdown de Perfis (mantido) */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50"
                  >
                    {selectedProfile ? `Perfil: ${profiles.find(p => p.id === selectedProfile)?.name}` : 'Selecionar Perfil'}
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-10">
                      <div className="p-4">
                        <input
                          type="text"
                          placeholder="Novo Perfil"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4"
                        />
                        <button
                          onClick={createProfile}
                          className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
                        >
                          Criar Perfil
                        </button>
                      </div>
                      <div className="border-t border-gray-800">
                        {profiles.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => selectProfile(profile.id)}
                            className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 transition-colors"
                          >
                            {profile.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Botão de Logout (mantido) */}
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Abas (mantidas) */}
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

          {/* Seletor de Mês e Ano (mantido) */}
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

          {/* Conteúdo Principal (atualizado para incluir compras parceladas) */}
          <div className="container mx-auto px-4">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900 rounded-xl p-6 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Receitas Totais</h3>
                  <p className="text-3xl font-bold text-cyan-400">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-6 border-2 border-red-400 shadow-lg shadow-red-500/20">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Despesas Totais</h3>
                  <p className="text-3xl font-bold text-red-400">{formatCurrency(totalExpenses + totalRecurring + totalInstallments)}</p>
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
                  <div className="flex-grow">
                    <input
                      type="text"
                      placeholder="Descrição"
                      value={incomeDescription}
                      onChange={(e) => setIncomeDescription(e.target.value)}
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
                            <td className="py-3 px-4">
                              {editingIncomeId === item.id ? (
                                <input
                                  type="text"
                                  value={newIncomeDescription}
                                  onChange={(e) => setNewIncomeDescription(e.target.value)}
                                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white"
                                />
                              ) : (
                                item.description
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">
                              {editingIncomeId === item.id ? (
                                <input
                                  type="number"
                                  value={newIncomeAmount}
                                  onChange={(e) => setNewIncomeAmount(e.target.value)}
                                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white"
                                />
                              ) : (
                                formatCurrency(item.amount)
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {editingIncomeId === item.id ? (
                                <button
                                  onClick={() => saveEditedIncome(item.id)}
                                  className="text-green-400 hover:text-green-300 mr-2"
                                >
                                  Salvar
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditingIncome(item.id, item.amount, item.description)}
                                  className="text-blue-400 hover:text-blue-300 mr-2"
                                >
                                  Editar
                                </button>
                              )}
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

                <h2 className="text-xl font-semibold text-red-400 mb-4">Adicionar Compra Parcelada</h2>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-grow">
                    <input
                      type="number"
                      placeholder="Valor Total"
                      value={installmentExpense}
                      onChange={(e) => setInstallmentExpense(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <div className="flex-grow">
                    <input
                      type="text"
                      placeholder="Descrição"
                      value={installmentDescription}
                      onChange={(e) => setInstallmentDescription(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <div className="flex-grow">
                    <input
                      type="number"
                      placeholder="Número de Parcelas"
                      value={installmentMonths}
                      onChange={(e) => setInstallmentMonths(parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <button
                    onClick={addInstallmentExpense}
                    className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-medium rounded-md px-6 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
                  >
                    Adicionar
                  </button>
                </div>

                <h3 className="text-lg font-medium text-gray-300 mt-8 mb-4">Despesas Registradas</h3>
                {filteredExpenseList.length > 0 || filteredInstallmentList.length > 0 ? (
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
                              {editingExpenseId === item.id ? (
                                <input
                                  type="number"
                                  value={newExpenseAmount}
                                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white"
                                />
                              ) : (
                                formatCurrency(item.amount)
                              )}
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
                                  onClick={() => startEditingExpense(item.id, item.amount, item.description)}
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
                        {filteredInstallmentList.map((item) => (
                          <tr key={item.id} className="border-b border-gray-800">
                            <td className="py-3 px-4">{item.description}</td>
                            <td className="py-3 px-4 text-right text-red-400 font-medium">{formatCurrency(item.amount)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => removeInstallment(item.id)}
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
                            {formatCurrency(totalExpenses + totalInstallments)}
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
                              {editingRecurringId === item.id ? (
                                <input
                                  type="number"
                                  value={newRecurringAmount}
                                  onChange={(e) => setNewRecurringAmount(e.target.value)}
                                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white"
                                />
                              ) : (
                                formatCurrency(item.amount)
                              )}
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
                                  onClick={() => startEditingRecurring(item.id, item.amount, item.description)}
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

          {/* Rodapé (mantido) */}
          <footer className="text-center py-6 bg-gray-900 border-t border-gray-800">
            <p className="text-lg font-poppins font-semibold animate-gradient bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              By Wellington Beraldo
            </p>
          </footer>
        </>
      )}
    </div>
  );
};

export default FinancialApp;