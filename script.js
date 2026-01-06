[file name]: script.js
[file content begin]
// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ФУНКЦИИ
// ============================================
let authManager = null;
let palletTrackerApp = null;

// Функция для отладки
function debugLog(message, data = null) {
    console.log(`[DEBUG] ${message}`, data || '');
}

// ============================================
// КЛАСС АВТОРИЗАЦИИ
// ============================================
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = {
            'admin': { password: 'admin123', name: 'Администратор' },
            'operator': { password: 'operator123', name: 'Оператор' },
            'user': { password: 'user123', name: 'Пользователь' }
        };
    }

    init() {
        debugLog('Инициализация AuthManager');
        this.setupEventListeners();
        this.checkAutoLogin();
    }

    setupEventListeners() {
        debugLog('Настройка обработчиков событий AuthManager');

        // Основной обработчик кнопки входа
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', (e) => {
                debugLog('Кнопка входа нажата');
                this.login();
            });
        } else {
            debugLog('ERROR: Кнопка входа не найдена!');
        }

        // Кнопка показа/скрытия пароля
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Ввод по Enter в полях формы
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.login();
                }
            });
        }

        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.login();
                }
            });
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('togglePassword');
        
        if (passwordInput && toggleButton) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                passwordInput.type = 'password';
                toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
            }
        }
    }

    login() {
        debugLog('=== ВХОД В СИСТЕМУ ===');
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        debugLog(`Логин: ${username}, Пароль: ${password ? '***' : '(пустой)'}`);
        
        // Проверка заполнения полей
        if (!username || !password) {
            this.showNotification('Введите имя пользователя и пароль', 'error');
            return;
        }
        
        // Проверка учетных данных
        if (this.users[username] && this.users[username].password === password) {
            debugLog('Учетные данные верны');
            
            this.currentUser = {
                username: username,
                name: this.users[username].name
            };
            
            // Сохраняем сессию
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Переключаем экраны
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            // Обновляем информацию о пользователе
            document.getElementById('currentUser').textContent = this.currentUser.name;
            document.getElementById('footerUser').textContent = this.currentUser.name;
            
            // Инициализируем основное приложение
            if (!palletTrackerApp) {
                palletTrackerApp = new PalletTrackerApp();
            }
            palletTrackerApp.initApp();
            
            this.showNotification(`Добро пожаловать, ${this.currentUser.name}!`, 'success');
        } else {
            debugLog('Неверные учетные данные');
            this.showNotification('Неверное имя пользователя или пароль', 'error');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        
        // Переключаем экраны
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        
        // Очищаем форму
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('rememberMe').checked = false;
        
        this.showNotification('Вы успешно вышли из системы', 'info');
    }

    checkAutoLogin() {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                
                // Переключаем экраны
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appContainer').style.display = 'block';
                
                // Обновляем информацию о пользователе
                document.getElementById('currentUser').textContent = this.currentUser.name;
                document.getElementById('footerUser').textContent = this.currentUser.name;
                
                // Инициализируем основное приложение
                if (!palletTrackerApp) {
                    palletTrackerApp = new PalletTrackerApp();
                }
                palletTrackerApp.initApp();
                
            } catch (e) {
                debugLog('Ошибка при восстановлении сессии:', e);
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type} show`;
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }
}

// ============================================
// КЛАСС ОСНОВНОГО ПРИЛОЖЕНИЯ
// ============================================
class PalletTrackerApp {
    constructor() {
        this.workStartTime = null;
        this.workEndTime = null;
        this.isWorkingDay = false;
        this.isOnBreak = false;
        this.breakStartTime = null;
        this.breakDuration = 0;
        this.currentPalletCheck = null;
        this.palletsChecked = 0;
        this.totalPalletsToCheck = 15;
        this.todayChecks = [];
        this.allDaysHistory = {};
        this.tempErrors = [];
        this.pendingConfirmCallback = null;
        this.currentPalletStatsIndex = null;
        
        this.settings = {
            rcName: 'Распределительный центр',
            rcCode: 'РЦ-001',
            specialistName: 'Иванов И.И.',
            specialistEmail: 'ivanov@example.com',
            targetPallets: 15
        };
    }

    initApp() {
        debugLog('Инициализация PalletTrackerApp');
        this.setupDate();
        this.setupEventListeners();
        this.loadFromStorage();
        this.loadSettings();
        this.updateDisplay();
        this.updateErrorFormVisibility();
    }

    setupDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('ru-RU', options);
    }

    setupEventListeners() {
        debugLog('Настройка обработчиков событий PalletTrackerApp');

        // Кнопка выхода
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authManager.logout();
        });

        // Кнопка настроек
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Рабочее время
        document.getElementById('startWorkDay').addEventListener('click', () => this.startWorkDay());
        document.getElementById('breakBtn').addEventListener('click', () => this.toggleBreak());
        document.getElementById('endWorkDay').addEventListener('click', () => this.showEndWorkDayModal());
        document.getElementById('resetDay').addEventListener('click', () => this.resetWorkDay());
        document.getElementById('showHistory').addEventListener('click', () => this.showHistoryModal());
        document.getElementById('saveData').addEventListener('click', () => this.saveToStorage());

        // Проверка паллетов
        document.getElementById('startPalletCheck').addEventListener('click', () => this.startPalletCheck());
        document.getElementById('endPalletCheck').addEventListener('click', () => this.askAboutErrors());

        // Экспорт
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('generateAct').addEventListener('click', () => this.generateAct());
        document.getElementById('generateLetter').addEventListener('click', () => this.generateLetter());

        // Ввод по Enter
        document.getElementById('palletCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startPalletCheck();
        });
        document.getElementById('boxCount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startPalletCheck();
        });

        // Модальные окна ошибок
        document.getElementById('noErrors').addEventListener('click', () => this.endPalletCheckWithErrors([]));
        document.getElementById('yesErrors').addEventListener('click', () => this.showErrorForm());
        
        // Форма ошибок
        document.getElementById('addAnotherError').addEventListener('click', () => this.addError());
        document.getElementById('finishErrors').addEventListener('click', () => this.finishErrors());
        document.getElementById('cancelErrors').addEventListener('click', () => this.cancelErrors());

        // Обновление видимости полей в форме ошибок
        document.querySelectorAll('input[name="errorType"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateErrorFormVisibility());
        });

        // Настройки
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.hideModal('settingsModal'));

        // Закрытие модальных окон
        document.getElementById('closePalletStats').addEventListener('click', () => this.hideModal('palletStatsModal'));
        document.getElementById('closeHistory').addEventListener('click', () => this.hideModal('historyModal'));
        document.getElementById('closeConfirmModal').addEventListener('click', () => this.hideModal('confirmModal'));
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideModal('confirmModal'));

        // Клик по фону для закрытия модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal.id);
            });
        });

        // Обработчик клавиши Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    // ============ РАБОЧИЙ ДЕНЬ ============
    startWorkDay() {
        this.workStartTime = new Date();
        this.isWorkingDay = true;
        this.isOnBreak = false;
        this.breakStartTime = null;
        this.breakDuration = 0;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        this.currentPalletCheck = null;

        // Скрываем панель экспорта
        document.getElementById('exportSection').style.display = 'none';

        this.updateDisplay();
        this.enablePalletControls();
        authManager.showNotification('Рабочий день начат', 'success');
    }

    toggleBreak() {
        if (!this.isWorkingDay) {
            authManager.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }

        if (this.currentPalletCheck) {
            authManager.showNotification('Завершите текущую проверку паллета перед перерывом!', 'error');
            return;
        }

        if (this.isOnBreak) {
            // Завершение перерыва
            if (this.breakStartTime) {
                const breakEndTime = new Date();
                const breakTime = Math.round((breakEndTime - this.breakStartTime) / 1000 / 60);
                this.breakDuration += breakTime;
                this.breakStartTime = null;
            }
            this.isOnBreak = false;
            this.enablePalletControls();
            authManager.showNotification('Перерыв завершен', 'success');
        } else {
            // Начало перерыва
            this.isOnBreak = true;
            this.breakStartTime = new Date();
            this.disablePalletControls();
            authManager.showNotification('Начался перерыв', 'info');
        }

        this.updateDisplay();
    }

    endWorkDay() {
        this.workEndTime = new Date();
        this.isWorkingDay = false;
        this.isOnBreak = false;

        // Завершаем перерыв если он был активен
        if (this.breakStartTime) {
            const breakEndTime = new Date();
            const breakTime = Math.round((breakEndTime - this.breakStartTime) / 1000 / 60);
            this.breakDuration += breakTime;
            this.breakStartTime = null;
        }

        this.saveTodayToHistory();
        this.updateDisplay();
        this.disablePalletControls();
        authManager.showNotification('Рабочий день завершен', 'success');
    }

    showEndWorkDayModal() {
        if (this.palletsChecked < this.totalPalletsToCheck) {
            this.showConfirmModal(
                `Проверено только ${this.palletsChecked} из ${this.totalPalletsToCheck} паллетов. Завершить рабочий день?`,
                () => this.endWorkDay()
            );
        } else {
            this.showConfirmModal('Завершить рабочий день?', () => this.endWorkDay());
        }
    }

    resetWorkDay() {
        this.showConfirmModal('Вы уверены, что хотите сбросить текущий рабочий день? Все данные будут потеряны.', () => {
            this.workStartTime = null;
            this.workEndTime = null;
            this.isWorkingDay = false;
            this.isOnBreak = false;
            this.breakStartTime = null;
            this.breakDuration = 0;
            this.currentPalletCheck = null;
            this.palletsChecked = 0;
            this.todayChecks = [];
            this.tempErrors = [];

            // Скрываем панель экспорта
            document.getElementById('exportSection').style.display = 'none';

            this.updateDisplay();
            this.disablePalletControls();
            authManager.showNotification('Рабочий день сброшен', 'info');
        });
    }

    // ============ ПРОВЕРКА ПАЛЛЕТОВ ============
    startPalletCheck() {
        const code = document.getElementById('palletCode').value.trim().toUpperCase();
        const boxCount = parseInt(document.getElementById('boxCount').value) || 0;

        if (!this.isWorkingDay) {
            authManager.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }

        if (this.isOnBreak) {
            authManager.showNotification('Сейчас перерыв! Завершите перерыв чтобы начать проверку.', 'error');
            return;
        }

        if (boxCount <= 0) {
            authManager.showNotification('Введите количество коробов (минимум 1)!', 'error');
            document.getElementById('boxCount').focus();
            return;
        }

        if (code) {
            if (!code.startsWith('D') || code.length < 2 || !/^D\d+$/.test(code)) {
                authManager.showNotification('Неверный формат D-кода! Пример: D40505050', 'error');
                return;
            }

            const isDuplicate = this.todayChecks.some(check => check.code === code);
            if (isDuplicate) {
                authManager.showNotification(`Паллет ${code} уже проверен сегодня!`, 'error');
                return;
            }
        }

        if (this.currentPalletCheck) {
            authManager.showNotification('Завершите текущую проверку паллета!', 'error');
            return;
        }

        this.tempErrors = [];

        const palletCode = code || `Без D-кода-${Date.now().toString().slice(-4)}`;
        this.showConfirmModal(`Начать проверку паллета: ${palletCode}\nКоличество коробов: ${boxCount}?`, () => {
            this.currentPalletCheck = {
                code: palletCode,
                boxCount: boxCount,
                start: new Date(),
                end: null,
                duration: null,
                errors: []
            };

            document.getElementById('palletCode').value = '';
            document.getElementById('boxCount').value = '';

            this.updateCurrentCheckDisplay();
            this.updateButtonStates();
            authManager.showNotification(`Проверка паллета ${this.currentPalletCheck.code} начата`, 'success');
        });
    }

    askAboutErrors() {
        if (!this.currentPalletCheck) {
            authManager.showNotification('Нет активной проверки!', 'error');
            return;
        }

        this.showModal('errorModal');
    }

    showErrorForm() {
        this.hideModal('errorModal');
        this.resetErrorForm();
        this.updateErrorFormVisibility();
        this.showModal('errorDetailsModal');
    }

    resetErrorForm() {
        document.querySelector('input[name="errorType"][value="недостача"]').checked = true;
        document.getElementById('productPLU').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('productUnit').value = 'шт';
        document.getElementById('errorComment').value = '';
        document.getElementById('addedErrorsList').innerHTML = '';
    }

    updateErrorFormVisibility() {
        const errorType = document.querySelector('input[name="errorType"]:checked').value;
        const productDetails = document.getElementById('productDetails');
        
        if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
            productDetails.style.display = 'block';
        } else {
            productDetails.style.display = 'none';
        }
    }

    addError() {
        const errorType = document.querySelector('input[name="errorType"]:checked').value;
        const comment = document.getElementById('errorComment').value.trim();

        const errorData = {
            type: errorType,
            comment: comment || ''
        };

        if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
            errorData.plu = document.getElementById('productPLU').value;
            errorData.productName = document.getElementById('productName').value;
            errorData.quantity = document.getElementById('productQuantity').value;
            errorData.unit = document.getElementById('productUnit').value;
        }

        this.tempErrors.push(errorData);
        this.updateAddedErrorsList();

        // Очистить форму для следующей ошибки
        document.getElementById('productPLU').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('errorComment').value = '';
        
        document.querySelector('input[name="errorType"][value="недостача"]').checked = true;
        this.updateErrorFormVisibility();

        authManager.showNotification('Ошибка добавлена', 'success');
    }

    updateAddedErrorsList() {
        const list = document.getElementById('addedErrorsList');
        list.innerHTML = '';

        this.tempErrors.forEach((error, index) => {
            const li = document.createElement('li');
            let text = `${index + 1}. ${error.type}`;

            if (error.productName) {
                text += ` - ${error.productName}`;
            }
            if (error.comment) {
                text += ` (${error.comment.length > 30 ? error.comment.substring(0, 30) + '...' : error.comment})`;
            }

            li.innerHTML = `
                <span>${text}</span>
                <button class="remove-error" data-index="${index}">× Удалить</button>
            `;

            list.appendChild(li);
        });

        document.querySelectorAll('.remove-error').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-error').dataset.index);
                this.tempErrors.splice(index, 1);
                this.updateAddedErrorsList();
            });
        });
    }

    finishErrors() {
        if (this.tempErrors.length === 0) {
            authManager.showNotification('Не добавлено ни одной ошибки!', 'error');
            return;
        }

        this.endPalletCheckWithErrors([...this.tempErrors]);
        this.hideModal('errorDetailsModal');
    }

    cancelErrors() {
        this.showConfirmModal('Отменить добавление ошибок?', () => {
            this.tempErrors = [];
            this.hideModal('errorDetailsModal');
            this.askAboutErrors();
        });
    }

    endPalletCheckWithErrors(errors) {
        if (!this.currentPalletCheck) return;

        this.hideModal('errorModal');
        this.hideModal('errorDetailsModal');

        const endTime = new Date();
        const duration = Math.round((endTime - this.currentPalletCheck.start) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        this.currentPalletCheck.end = endTime;
        this.currentPalletCheck.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.currentPalletCheck.errors = [...errors];

        this.todayChecks.push({...this.currentPalletCheck});
        this.palletsChecked++;

        this.updateTodayChecksTable();
        this.updateDisplay();

        let message = `Паллет ${this.currentPalletCheck.code} проверен!\n`;
        message += `Коробов: ${this.currentPalletCheck.boxCount}\n`;
        message += `Длительность: ${this.currentPalletCheck.duration}\n`;
        message += `Проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;

        if (errors.length > 0) {
            message += `\nОшибок: ${errors.length}`;
        }

        if (this.palletsChecked >= this.totalPalletsToCheck) {
            message += '\n✅ Все паллеты проверены!';
            this.enableEndWorkDay();
            this.showExportPanel();
        }

        authManager.showNotification(message, 'success');

        this.currentPalletCheck = null;
        this.tempErrors = [];
        this.updateCurrentCheckDisplay();
        this.updateButtonStates();
    }

    showExportPanel() {
        document.getElementById('exportSection').style.display = 'block';
    }

    // ============ МОДАЛЬНЫЕ ОКНА ============
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    hideAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
        this.pendingConfirmCallback = null;
    }

    showConfirmModal(message, callback) {
        this.pendingConfirmCallback = callback;
        document.getElementById('confirmMessage').textContent = message;
        this.showModal('confirmModal');
    }

    confirmAction() {
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
        }
        this.hideModal('confirmModal');
        this.pendingConfirmCallback = null;
    }

    // ============ НАСТРОЙКИ ============
    showSettingsModal() {
        document.getElementById('rcName').value = this.settings.rcName;
        document.getElementById('rcCode').value = this.settings.rcCode;
        document.getElementById('specialistName').value = this.settings.specialistName;
        document.getElementById('specialistEmail').value = this.settings.specialistEmail;
        document.getElementById('targetPallets').value = this.settings.targetPallets;

        this.showModal('settingsModal');
    }

    saveSettings() {
        this.settings = {
            rcName: document.getElementById('rcName').value || 'Распределительный центр',
            rcCode: document.getElementById('rcCode').value || 'РЦ-001',
            specialistName: document.getElementById('specialistName').value || 'Иванов И.И.',
            specialistEmail: document.getElementById('specialistEmail').value || 'ivanov@example.com',
            targetPallets: parseInt(document.getElementById('targetPallets').value) || 15
        };

        this.totalPalletsToCheck = this.settings.targetPallets;

        localStorage.setItem('palletTrackerSettings', JSON.stringify(this.settings));
        this.hideModal('settingsModal');
        this.updateDisplay();
        authManager.showNotification('Настройки сохранены', 'success');
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('palletTrackerSettings');
            if (saved) {
                this.settings = JSON.parse(saved);
                this.totalPalletsToCheck = this.settings.targetPallets;
            }
        } catch (e) {
            debugLog('Ошибка загрузки настроек:', e);
        }
    }

    // ============ ЭКСПОРТ ДАННЫХ ============
    exportToExcel() {
        if (this.todayChecks.length === 0) {
            authManager.showNotification('Нет данных для экспорта', 'error');
            return;
        }

        try {
            // Создаем книгу Excel
            const wb = XLSX.utils.book_new();
            
            // ===== Лист с данными проверок (формат как в Лист15) =====
            const checksData = [
                ['Дата', 'Завод', 'РЦ', 'Номер Паллеты', 'Наименование ошибки', 'Материал', 'Наименование материала', 'Количество', 'Базисная единица', 'Продолжительность проверки, минут', 'Комментарий']
            ];
            
            // Добавляем данные проверок в формате как в примере
            this.todayChecks.forEach((check) => {
                const checkDate = new Date(check.start);
                const dateStr = checkDate.toISOString().replace('T', ' ').substring(0, 19);
                
                // Если есть ошибки, создаем строку для каждой ошибки
                if (check.errors && check.errors.length > 0) {
                    check.errors.forEach(error => {
                        const row = [
                            dateStr, // Дата
                            '159.0', // Завод
                            this.settings.rcName, // РЦ
                            check.code, // Номер Паллеты
                            error.type, // Наименование ошибки
                            error.plu || '', // Материал (PLU)
                            error.productName || '', // Наименование материала
                            error.quantity || '', // Количество
                            error.unit || '', // Базисная единица
                            this.convertDurationToMinutes(check.duration), // Продолжительность в минутах
                            error.comment || '' // Комментарий
                        ];
                        checksData.push(row);
                    });
                } else {
                    // Если нет ошибок - "Без расхождений"
                    const row = [
                        dateStr, // Дата
                        '159.0', // Завод
                        this.settings.rcName, // РЦ
                        check.code, // Номер Паллеты
                        'Без расхождений', // Наименование ошибки
                        '', // Материал
                        '', // Наименование материала
                        check.boxCount || 0, // Количество
                        'короб', // Базисная единица
                        this.convertDurationToMinutes(check.duration), // Продолжительность в минутах
                        '' // Комментарий
                    ];
                    checksData.push(row);
                }
            });
            
            const checksWs = XLSX.utils.aoa_to_sheet(checksData);
            XLSX.utils.book_append_sheet(wb, checksWs, "Проверки");
            
            // ===== Лист со сводной информацией =====
            const summaryData = [
                ['Отчет о проверке паллетов', '', '', '', '', '', ''],
                ['Дата:', new Date().toLocaleDateString('ru-RU'), '', '', '', '', ''],
                ['РЦ:', this.settings.rcName, 'Код РЦ:', this.settings.rcCode, '', '', ''],
                ['Специалист КРО:', this.settings.specialistName, 'Email:', this.settings.specialistEmail, '', '', ''],
                ['', '', '', '', '', '', ''],
                ['№', 'D-код', 'Коробов', 'Начало', 'Окончание', 'Длительность', 'Ошибки']
            ];
            
            this.todayChecks.forEach((check, index) => {
                const errorsCount = check.errors ? check.errors.length : 0;
                summaryData.push([
                    index + 1,
                    check.code,
                    check.boxCount || 0,
                    this.formatTime(new Date(check.start)),
                    this.formatTime(new Date(check.end)),
                    check.duration,
                    errorsCount > 0 ? `${errorsCount} ошибок` : 'Нет'
                ]);
            });
            
            const totalPallets = this.todayChecks.length;
            const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
            const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
            
            summaryData.push(['', '', '', '', '', '', '']);
            summaryData.push(['ИТОГО:', totalPallets, 'паллетов', totalBoxes, 'коробов', totalErrors, 'ошибок']);
            
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, "Сводная информация");
            
            // Генерируем имя файла
            const fileName = `Проверка_паллетов_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.xlsx`;
            
            // Сохраняем файл
            XLSX.writeFile(wb, fileName);
            
            authManager.showNotification('Excel файл успешно скачан в нужном формате', 'success');
        } catch (error) {
            debugLog('Ошибка при экспорте в Excel:', error);
            authManager.showNotification('Ошибка при экспорте в Excel', 'error');
        }
    }

    convertDurationToMinutes(durationStr) {
        if (!durationStr) return 0;
        
        try {
            const parts = durationStr.split(':');
            if (parts.length >= 2) {
                const minutes = parseInt(parts[0]) || 0;
                const seconds = parseInt(parts[1]) || 0;
                const totalMinutes = minutes + (seconds / 60);
                return Math.round(totalMinutes * 10) / 10;
            }
        } catch (e) {
            debugLog('Ошибка преобразования длительности:', e);
        }
        
        return 0;
    }

    generateAct() {
        if (this.todayChecks.length === 0) {
            authManager.showNotification('Нет данных для формирования акта', 'error');
            return;
        }
        
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        const actContent = `
АКТ ПРОВЕРКИ ПАЛЛЕТОВ № ${new Date().getTime()}
            
Дата составления: ${new Date().toLocaleDateString('ru-RU')}
            
1. Распределительный центр: ${this.settings.rcName}
2. Код РЦ: ${this.settings.rcCode}
3. Специалист КРО: ${this.settings.specialistName}
            
РЕЗУЛЬТАТЫ ПРОВЕРКИ:
            
1. Всего проверено паллетов: ${totalPallets}
2. Всего проверено коробов: ${totalBoxes}
3. Обнаружено ошибок: ${totalErrors}
            
Детали проверки:
${this.todayChecks.map((check, index) => `
${index + 1}. Паллет ${check.code}:
   - Коробов: ${check.boxCount || 0}
   - Время проверки: ${check.duration}
   - Ошибок: ${check.errors ? check.errors.length : 0}
`).join('')}
            
Подпись специалиста КРО: ____________________
            
Дата: ${new Date().toLocaleDateString('ru-RU')}
        `;
        
        this.downloadTextFile(`Акт_проверки_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.txt`, actContent);
        authManager.showNotification('Акт проверки сформирован', 'success');
    }

    generateLetter() {
        if (this.todayChecks.length === 0) {
            authManager.showNotification('Нет данных для формирования письма', 'error');
            return;
        }
        
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        const letterContent = `
Уважаемые коллеги,
            
Направляем результаты проверки паллетов в РЦ ${this.settings.rcName} (${this.settings.rcCode}).
            
Дата проверки: ${new Date().toLocaleDateString('ru-RU')}
Специалист КРО: ${this.settings.specialistName}
            
Результаты проверки:
- Проверено паллетов: ${totalPallets}
- Проверено коробов: ${totalBoxes}
- Обнаружено ошибок: ${totalErrors}
            
${totalErrors > 0 ? 'Обнаружены следующие проблемы, требующие внимания:' : 'Ошибок не обнаружено. Все паллеты соответствуют требованиям.'}
            
${totalErrors > 0 ? this.todayChecks.filter(check => check.errors && check.errors.length > 0)
    .map(check => `Паллет ${check.code}: ${check.errors.length} ошибок`)
    .join('\n') : ''}
            
Просим принять необходимые меры по устранению выявленных замечаний.
            
С уважением,
${this.settings.specialistName}
Специалист КРО
${this.settings.specialistEmail}
        `;
        
        this.downloadTextFile(`Письмо_результатов_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.txt`, letterContent);
        authManager.showNotification('Письмо результатов сформировано', 'success');
    }

    downloadTextFile(filename, content) {
        const element = document.createElement('a');
        const file = new Blob([content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // ============ ОТОБРАЖЕНИЕ ДАННЫХ ============
    updateDisplay() {
        this.updateWorkTimeDisplay();
        this.updatePalletCounter();
        this.updateProgressBar();
        this.updateButtonStates();
        this.updateTodayChecksTable();
        this.updateCurrentCheckDisplay();
        this.updateTodayStats();
    }

    updateWorkTimeDisplay() {
        const display = document.getElementById('workTimeDisplay');
        
        if (this.workStartTime) {
            const startStr = this.formatTime(this.workStartTime);
            
            if (this.workEndTime) {
                const endStr = this.formatTime(this.workEndTime);
                const duration = Math.round((this.workEndTime - this.workStartTime) / 1000 / 60);
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                
                let breakInfo = '';
                if (this.breakDuration > 0) {
                    breakInfo = ` | Перерывы: ${this.breakDuration} мин`;
                }
                
                display.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Начало: ${startStr} | Конец: ${endStr} | 
                    Время: ${hours}ч ${minutes}мин${breakInfo}
                `;
            } else {
                let currentStatus = 'Рабочий день идет...';
                let breakInfo = '';
                
                if (this.isOnBreak) {
                    currentStatus = 'Перерыв';
                    if (this.breakStartTime) {
                        const now = new Date();
                        const breakTime = Math.round((now - this.breakStartTime) / 1000 / 60);
                        breakInfo = ` (длится: ${breakTime} мин)`;
                    }
                }
                
                display.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Начало: ${startStr} | ${currentStatus}${breakInfo}
                `;
            }
        } else {
            display.innerHTML = `
                <i class="fas fa-clock"></i> 
                Рабочий день не начат
            `;
        }
    }

    updatePalletCounter() {
        document.getElementById('palletCounter').textContent = `Паллетов проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
    }

    updateProgressBar() {
        const progress = (this.palletsChecked / this.totalPalletsToCheck) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    updateCurrentCheckDisplay() {
        const display = document.getElementById('currentCheckDisplay');
        
        if (this.currentPalletCheck) {
            const startStr = this.formatTime(this.currentPalletCheck.start);
            let displayText = `
                <i class="fas fa-sync-alt fa-spin"></i>
                Проверяется: ${this.currentPalletCheck.code} (начато в ${startStr})
            `;
            
            if (this.currentPalletCheck.boxCount > 0) {
                displayText += `<br><i class="fas fa-box"></i> Коробов: ${this.currentPalletCheck.boxCount}`;
            }
            
            display.innerHTML = displayText;
        } else {
            display.innerHTML = '';
        }
    }

    updateButtonStates() {
        document.getElementById('startWorkDay').disabled = this.isWorkingDay;
        const breakBtn = document.getElementById('breakBtn');
        breakBtn.disabled = !this.isWorkingDay;
        breakBtn.innerHTML = this.isOnBreak ? 
            '<i class="fas fa-play"></i> Продолжить работу' : 
            '<i class="fas fa-coffee"></i> Перерыв';
        breakBtn.className = this.isOnBreak ? 'btn btn-success' : 'btn btn-warning';
        document.getElementById('endWorkDay').disabled = !this.isWorkingDay;
        document.getElementById('startPalletCheck').disabled = !this.isWorkingDay || this.currentPalletCheck !== null || this.isOnBreak;
        document.getElementById('endPalletCheck').disabled = this.currentPalletCheck === null;
    }

    enablePalletControls() {
        document.getElementById('startPalletCheck').disabled = false;
        document.getElementById('endPalletCheck').disabled = true;
        document.getElementById('startWorkDay').disabled = true;
        document.getElementById('endWorkDay').disabled = false;
        document.getElementById('breakBtn').disabled = false;
        
        this.updateButtonStates();
    }

    disablePalletControls() {
        document.getElementById('startPalletCheck').disabled = true;
        document.getElementById('endPalletCheck').disabled = true;
        document.getElementById('startWorkDay').disabled = false;
        document.getElementById('endWorkDay').disabled = true;
        document.getElementById('breakBtn').disabled = true;
        
        this.updateButtonStates();
    }

    enableEndWorkDay() {
        document.getElementById('endWorkDay').disabled = false;
        this.updateButtonStates();
    }

    // ============ ТАБЛИЦА СЕГОДНЯШНИХ ПРОВЕРОК ============
    updateTodayChecksTable() {
        const tbody = document.getElementById('todayChecksBody');
        tbody.innerHTML = '';

        this.todayChecks.forEach((check, index) => {
            const row = document.createElement('tr');
            const startStr = this.formatTime(check.start);
            const endStr = this.formatTime(check.end);
            const hasErrors = check.errors && check.errors.length > 0;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${check.code}</strong></td>
                <td>${check.boxCount || 0}</td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>${check.duration}</td>
                <td>
                    <span class="status-badge ${hasErrors ? 'status-warning' : 'status-success'}">
                        ${hasErrors ? 'Есть' : 'Нет'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-info view-stats-btn" data-index="${index}">
                        <i class="fas fa-chart-bar"></i> Статистика
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Добавить обработчики для кнопок просмотра статистики
        document.querySelectorAll('.view-stats-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.view-stats-btn').dataset.index);
                this.showPalletStats(index);
            });
        });
    }

    updateTodayStats() {
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);

        document.getElementById('totalPallets').textContent = totalPallets;
        document.getElementById('totalBoxes').textContent = totalBoxes;
        document.getElementById('totalErrors').textContent = totalErrors;
    }

    // ============ СТАТИСТИКА ПАЛЛЕТА ============
    showPalletStats(index) {
        this.currentPalletStatsIndex = index;
        const check = this.todayChecks[index];

        document.getElementById('palletStatsTitle').textContent = `Статистика паллета ${check.code} (№${index + 1})`;

        const startTime = new Date(check.start);
        const endTime = new Date(check.end);

        const startStr = startTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const endStr = endTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        document.getElementById('palletStatsInfo').innerHTML = `
            <p><strong>D-код паллета:</strong> ${check.code}</p>
            <p><strong>Количество коробов:</strong> ${check.boxCount || 0}</p>
            <p><strong>Начало проверки:</strong> ${startStr}</p>
            <p><strong>Окончание проверки:</strong> ${endStr}</p>
            <p><strong>Длительность проверки:</strong> ${check.duration}</p>
            <p><strong>Количество ошибок:</strong> ${check.errors ? check.errors.length : 0}</p>
        `;

        if (!check.errors || check.errors.length === 0) {
            document.getElementById('palletErrorsList').innerHTML = `
                <div class="error-item">
                    <h4>✅ Ошибок не обнаружено</h4>
                </div>
            `;
        } else {
            let errorsHtml = '';
            
            check.errors.forEach((error, i) => {
                errorsHtml += `
                    <div class="error-item">
                        <h4>${i + 1}. ${error.type}</h4>
                        <div class="error-details">
                `;
                
                if (['недостача', 'излишки', 'качество товара'].includes(error.type)) {
                    if (error.productName) {
                        errorsHtml += `<p><strong>Товар:</strong> ${error.productName}</p>`;
                    }
                    if (error.plu) {
                        errorsHtml += `<p><strong>PLU:</strong> ${error.plu}</p>`;
                    }
                    if (error.quantity) {
                        errorsHtml += `<p><strong>Количество:</strong> ${error.quantity}${error.unit || ''}</p>`;
                    }
                }
                
                if (error.comment) {
                    errorsHtml += `<p><strong>Комментарий:</strong> ${error.comment}</p>`;
                }
                
                errorsHtml += `
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('palletErrorsList').innerHTML = errorsHtml;
        }

        this.showModal('palletStatsModal');
    }

    // ============ ИСТОРИЯ ПРОВЕРОК ============
    showHistoryModal() {
        this.updateHistoryTable();
        this.showModal('historyModal');
    }

    updateHistoryTable() {
        const tbody = document.getElementById('historyBody');
        tbody.innerHTML = '';

        const dates = Object.keys(this.allDaysHistory).sort((a, b) => b.localeCompare(a));

        if (dates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-history" style="font-size: 2rem; color: #a0aec0; margin-bottom: 10px;"></i>
                        <p>История проверок пуста</p>
                    </td>
                </tr>
            `;
            return;
        }

        dates.forEach(dateStr => {
            const dayData = this.allDaysHistory[dateStr];

            if (dayData.work_start) {
                const date = new Date(dateStr);
                const dateDisplay = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                const startTime = new Date(dayData.work_start);
                const startStr = startTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let endStr = '-';
                let totalTime = '-';
                let pallets = dayData.pallets_checked || 0;
                let totalBoxes = 0;

                if (dayData.checks) {
                    totalBoxes = dayData.checks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
                }

                if (dayData.work_end) {
                    const endTime = new Date(dayData.work_end);
                    endStr = endTime.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const duration = (endTime - startTime) / 1000 / 60;
                    const hours = Math.floor(duration / 60);
                    const minutes = Math.round(duration % 60);
                    totalTime = `${hours}ч ${minutes}м`;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dateDisplay}</td>
                    <td>${startStr}</td>
                    <td>${endStr}</td>
                    <td>${pallets}</td>
                    <td>${totalBoxes}</td>
                    <td>${totalTime}</td>
                `;

                tbody.appendChild(row);
            }
        });
    }

    // ============ СОХРАНЕНИЕ ДАННЫХ ============
    saveTodayToHistory() {
        const today = new Date().toISOString().split('T')[0];

        this.allDaysHistory[today] = {
            work_start: this.workStartTime ? this.workStartTime.toISOString() : null,
            work_end: this.workEndTime ? this.workEndTime.toISOString() : null,
            pallets_checked: this.palletsChecked,
            break_duration: this.breakDuration,
            checks: this.todayChecks.map(check => ({
                ...check,
                start: check.start.toISOString(),
                end: check.end.toISOString()
            }))
        };

        this.saveToStorage();
    }

    saveToStorage() {
        const data = {
            allDaysHistory: this.allDaysHistory,
            todayChecks: this.todayChecks.map(check => ({
                ...check,
                start: check.start.toISOString(),
                end: check.end.toISOString()
            })),
            workStartTime: this.workStartTime ? this.workStartTime.toISOString() : null,
            workEndTime: this.workEndTime ? this.workEndTime.toISOString() : null,
            isOnBreak: this.isOnBreak,
            breakStartTime: this.breakStartTime ? this.breakStartTime.toISOString() : null,
            breakDuration: this.breakDuration,
            palletsChecked: this.palletsChecked,
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck ? {
                ...this.currentPalletCheck,
                start: this.currentPalletCheck.start.toISOString(),
                end: this.currentPalletCheck.end ? this.currentPalletCheck.end.toISOString() : null
            } : null,
            tempErrors: this.tempErrors
        };

        localStorage.setItem('palletTrackerData', JSON.stringify(data));
        authManager.showNotification('Данные сохранены', 'success');
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('palletTrackerData');
            if (!saved) return;

            const data = JSON.parse(saved);

            this.allDaysHistory = data.allDaysHistory || {};
            this.workStartTime = data.workStartTime ? new Date(data.workStartTime) : null;
            this.workEndTime = data.workEndTime ? new Date(data.workEndTime) : null;
            this.isOnBreak = data.isOnBreak || false;
            this.breakStartTime = data.breakStartTime ? new Date(data.breakStartTime) : null;
            this.breakDuration = data.breakDuration || 0;
            this.palletsChecked = data.palletsChecked || 0;
            this.isWorkingDay = data.isWorkingDay || false;
            this.tempErrors = data.tempErrors || [];

            // Восстанавливаем todayChecks
            this.todayChecks = (data.todayChecks || []).map(check => ({
                ...check,
                start: new Date(check.start),
                end: new Date(check.end)
            }));

            // Восстанавливаем currentPalletCheck
            if (data.currentPalletCheck) {
                this.currentPalletCheck = {
                    ...data.currentPalletCheck,
                    start: new Date(data.currentPalletCheck.start),
                    end: data.currentPalletCheck.end ? new Date(data.currentPalletCheck.end) : null
                };
            }

            // Показываем панель экспорта если все паллеты проверены
            if (this.palletsChecked >= this.totalPalletsToCheck && this.todayChecks.length > 0) {
                this.showExportPanel();
            }

        } catch (error) {
            debugLog('Ошибка загрузки данных:', error);
        }
    }

    // ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
    formatTime(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM загружен, начинаем инициализацию');
    
    // Инициализируем менеджер авторизации
    authManager = new AuthManager();
    authManager.init();
    
    debugLog('Приложение инициализировано');
});

// Экспортируем для отладки
window.authManager = authManager;
window.palletTrackerApp = palletTrackerApp;
window.debugLog = debugLog;
[file content end]
