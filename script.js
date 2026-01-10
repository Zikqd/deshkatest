// Основной класс приложения
class PalletTrackerApp {
    constructor() {
        this.workStartTime = null;
        this.workEndTime = null;
        this.isWorkingDay = false;
        this.currentPalletCheck = null;
        this.palletsChecked = 0;
        this.totalPalletsToCheck = 15;
        this.todayChecks = [];
        this.allDaysHistory = {};
        this.tempErrors = [];
        this.pendingConfirmCallback = null;
        this.currentPalletStatsIndex = null;
        
        // Переменные для управления перерывами
        this.breaks = []; // Массив перерывов {start, end, duration}
        this.isOnBreak = false;
        this.currentBreakStart = null;
        this.totalBreakTime = 0; // Общее время перерывов в миллисекундах
        
        this.settings = {
            rcName: 'Распределительный центр',
            rcCode: 'РЦ-001',
            specialistName: 'Иванов И.И.',
            specialistEmail: 'ivanov@example.com',
            targetPallets: 15,
            factoryNumber: '159'
        };
    }
    
    initApp() {
        console.log('Инициализация приложения');
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
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            currentDateElement.textContent = now.toLocaleDateString('ru-RU', options);
        }
    }
    
    setupEventListeners() {
        console.log('Настройка обработчиков событий');
        
        // Кнопка настроек
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
        }
        
        // Кнопки рабочего времени
        const startWorkDayBtn = document.getElementById('startWorkDay');
        if (startWorkDayBtn) {
            startWorkDayBtn.addEventListener('click', () => this.startWorkDay());
        }
        
        const breakButton = document.getElementById('breakButton');
        if (breakButton) {
            breakButton.addEventListener('click', () => this.toggleBreak());
        }
        
        const endWorkDayBtn = document.getElementById('endWorkDay');
        if (endWorkDayBtn) {
            endWorkDayBtn.addEventListener('click', () => this.showEndWorkDayModal());
        }
        
        const resetDayBtn = document.getElementById('resetDay');
        if (resetDayBtn) {
            resetDayBtn.addEventListener('click', () => this.resetWorkDay());
        }
        
        const showHistoryBtn = document.getElementById('showHistory');
        if (showHistoryBtn) {
            showHistoryBtn.addEventListener('click', () => this.showHistoryModal());
        }
        
        const saveDataBtn = document.getElementById('saveData');
        if (saveDataBtn) {
            saveDataBtn.addEventListener('click', () => this.saveToStorage());
        }
        
        // Кнопки проверки паллетов
        const startPalletCheckBtn = document.getElementById('startPalletCheck');
        if (startPalletCheckBtn) {
            startPalletCheckBtn.addEventListener('click', () => this.startPalletCheck());
        }
        
        const endPalletCheckBtn = document.getElementById('endPalletCheck');
        if (endPalletCheckBtn) {
            endPalletCheckBtn.addEventListener('click', () => this.askAboutErrors());
        }
        
        // Кнопки экспорта
        const exportExcelBtn = document.getElementById('exportExcel');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
        
        const generateActBtn = document.getElementById('generateAct');
        if (generateActBtn) {
            generateActBtn.addEventListener('click', () => this.generateAct());
        }
        
        const generateLetterBtn = document.getElementById('generateLetter');
        if (generateLetterBtn) {
            generateLetterBtn.addEventListener('click', () => this.generateLetter());
        }
        
        // Ввод D-кода по Enter
        const palletCodeInput = document.getElementById('palletCode');
        if (palletCodeInput) {
            palletCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startPalletCheck();
            });
        }
        
        // Ввод количества коробов по Enter
        const boxCountInput = document.getElementById('boxCount');
        if (boxCountInput) {
            boxCountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startPalletCheck();
            });
        }
        
        // Обработчики модальных окон
        const noErrorsBtn = document.getElementById('noErrors');
        if (noErrorsBtn) {
            noErrorsBtn.addEventListener('click', () => this.endPalletCheckWithErrors([]));
        }
        
        const yesErrorsBtn = document.getElementById('yesErrors');
        if (yesErrorsBtn) {
            yesErrorsBtn.addEventListener('click', () => this.showErrorForm());
        }
        
        // Форма ошибок
        const addAnotherErrorBtn = document.getElementById('addAnotherError');
        if (addAnotherErrorBtn) {
            addAnotherErrorBtn.addEventListener('click', () => this.addError());
        }
        
        const finishErrorsBtn = document.getElementById('finishErrors');
        if (finishErrorsBtn) {
            finishErrorsBtn.addEventListener('click', () => this.finishErrors());
        }
        
        const cancelErrorsBtn = document.getElementById('cancelErrors');
        if (cancelErrorsBtn) {
            cancelErrorsBtn.addEventListener('click', () => this.cancelErrors());
        }
        
        // Обновление видимости полей в форме ошибок
        document.querySelectorAll('input[name="errorType"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateErrorFormVisibility());
        });
        
        // Настройки
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        const closeSettingsBtn = document.getElementById('closeSettings');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.hideModal('settingsModal'));
        }
        
        // Закрытие модальных окон
        const closePalletStatsBtn = document.getElementById('closePalletStats');
        if (closePalletStatsBtn) {
            closePalletStatsBtn.addEventListener('click', () => this.hideModal('palletStatsModal'));
        }
        
        const closeHistoryBtn = document.getElementById('closeHistory');
        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', () => this.hideModal('historyModal'));
        }
        
        const closeConfirmModalBtn = document.getElementById('closeConfirmModal');
        if (closeConfirmModalBtn) {
            closeConfirmModalBtn.addEventListener('click', () => this.hideModal('confirmModal'));
        }
        
        const confirmYesBtn = document.getElementById('confirmYes');
        if (confirmYesBtn) {
            confirmYesBtn.addEventListener('click', () => this.confirmAction());
        }
        
        const confirmNoBtn = document.getElementById('confirmNo');
        if (confirmNoBtn) {
            confirmNoBtn.addEventListener('click', () => this.hideModal('confirmModal'));
        }
        
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
    
    resetWorkDay() {
        this.showConfirmModal('Вы уверены, что хотите сбросить текущий рабочий день? Все данные будут потеряны.', () => {
            this.workStartTime = null;
            this.workEndTime = null;
            this.isWorkingDay = false;
            this.currentPalletCheck = null;
            this.palletsChecked = 0;
            this.todayChecks = [];
            this.tempErrors = [];
            this.breaks = [];
            this.isOnBreak = false;
            this.currentBreakStart = null;
            this.totalBreakTime = 0;
            
            // Очищаем localStorage только для текущего дня
            this.clearTodayFromStorage();
            
            // Скрываем панель экспорта
            const exportSection = document.getElementById('exportSection');
            if (exportSection) exportSection.style.display = 'none';
            
            // Скрываем отображение перерыва
            const breakDisplay = document.getElementById('breakTimeDisplay');
            if (breakDisplay) breakDisplay.style.display = 'none';
            
            this.updateDisplay();
            this.disablePalletControls();
            this.showNotification('Рабочий день сброшен', 'info');
        });
    }
    
    clearTodayFromStorage() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const saved = localStorage.getItem('palletTrackerData');
            if (saved) {
                const data = JSON.parse(saved);
                // Удаляем только данные текущего дня из истории
                if (data.allDaysHistory && data.allDaysHistory[today]) {
                    delete data.allDaysHistory[today];
                    localStorage.setItem('palletTrackerData', JSON.stringify(data));
                }
            }
        } catch (e) {
            console.error('Ошибка при очистке данных:', e);
        }
    }
    
    showSettingsModal() {
        // Загружаем текущие настройки в форму
        const rcNameInput = document.getElementById('rcName');
        const rcCodeInput = document.getElementById('rcCode');
        const specialistNameInput = document.getElementById('specialistName');
        const specialistEmailInput = document.getElementById('specialistEmail');
        const targetPalletsInput = document.getElementById('targetPallets');
        const factoryNumberInput = document.getElementById('factoryNumber');
        
        if (rcNameInput) rcNameInput.value = this.settings.rcName;
        if (rcCodeInput) rcCodeInput.value = this.settings.rcCode;
        if (specialistNameInput) specialistNameInput.value = this.settings.specialistName;
        if (specialistEmailInput) specialistEmailInput.value = this.settings.specialistEmail;
        if (targetPalletsInput) targetPalletsInput.value = this.settings.targetPallets;
        if (factoryNumberInput) factoryNumberInput.value = this.settings.factoryNumber;
        
        this.showModal('settingsModal');
    }
    
    saveSettings() {
        const rcNameInput = document.getElementById('rcName');
        const rcCodeInput = document.getElementById('rcCode');
        const specialistNameInput = document.getElementById('specialistName');
        const specialistEmailInput = document.getElementById('specialistEmail');
        const targetPalletsInput = document.getElementById('targetPallets');
        const factoryNumberInput = document.getElementById('factoryNumber');
        
        this.settings = {
            rcName: rcNameInput ? rcNameInput.value || 'Распределительный центр' : 'Распределительный центр',
            rcCode: rcCodeInput ? rcCodeInput.value || 'РЦ-001' : 'РЦ-001',
            specialistName: specialistNameInput ? specialistNameInput.value || 'Иванов И.И.' : 'Иванов И.И.',
            specialistEmail: specialistEmailInput ? specialistEmailInput.value || 'ivanov@example.com' : 'ivanov@example.com',
            targetPallets: targetPalletsInput ? parseInt(targetPalletsInput.value) || 15 : 15,
            factoryNumber: factoryNumberInput ? factoryNumberInput.value || '159' : '159'
        };
        
        this.totalPalletsToCheck = this.settings.targetPallets;
        
        // Обновляем имя пользователя в интерфейсе
        const currentUserElement = document.getElementById('currentUser');
        const footerUserElement = document.getElementById('footerUser');
        
        if (currentUserElement) currentUserElement.textContent = this.settings.specialistName;
        if (footerUserElement) footerUserElement.textContent = this.settings.specialistName;
        
        localStorage.setItem('palletTrackerSettings', JSON.stringify(this.settings));
        this.hideModal('settingsModal');
        this.updateDisplay();
        this.showNotification('Настройки сохранены', 'success');
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('palletTrackerSettings');
            if (saved) {
                this.settings = JSON.parse(saved);
                this.totalPalletsToCheck = this.settings.targetPallets;
                
                // Обновляем имя пользователя в интерфейсе
                const currentUserElement = document.getElementById('currentUser');
                const footerUserElement = document.getElementById('footerUser');
                
                if (currentUserElement) currentUserElement.textContent = this.settings.specialistName;
                if (footerUserElement) footerUserElement.textContent = this.settings.specialistName;
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
    
    // ============ МОДАЛЬНЫЕ ОКНА ============
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
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
        const confirmMessage = document.getElementById('confirmMessage');
        if (confirmMessage) {
            confirmMessage.textContent = message;
        }
        this.showModal('confirmModal');
    }
    
    confirmAction() {
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
        }
        this.hideModal('confirmModal');
        this.pendingConfirmCallback = null;
    }
    
    // ============ РАБОЧИЙ ДЕНЬ И ПЕРЕРЫВЫ ============
    startWorkDay() {
        this.workStartTime = new Date();
        this.isWorkingDay = true;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        this.currentPalletCheck = null;
        this.breaks = [];
        this.isOnBreak = false;
        this.currentBreakStart = null;
        this.totalBreakTime = 0;
        
        // Скрываем панель экспорта
        const exportSection = document.getElementById('exportSection');
        if (exportSection) exportSection.style.display = 'none';
        
        this.updateDisplay();
        this.enablePalletControls();
        this.showNotification('Рабочий день начат', 'success');
    }
    
    toggleBreak() {
        if (!this.isWorkingDay) {
            this.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }
        
        if (this.currentPalletCheck) {
            this.showNotification('Завершите проверку паллета перед перерывом!', 'error');
            return;
        }
        
        if (!this.isOnBreak) {
            // Начало перерыва
            this.currentBreakStart = new Date();
            this.isOnBreak = true;
            const breakButton = document.getElementById('breakButton');
            if (breakButton) {
                breakButton.innerHTML = '<i class="fas fa-coffee"></i> Завершить перерыв';
                breakButton.classList.remove('btn-warning');
                breakButton.classList.add('btn-success');
            }
            
            const breakDisplay = document.getElementById('breakTimeDisplay');
            if (breakDisplay) {
                breakDisplay.textContent = `Перерыв начат: ${this.formatTime(this.currentBreakStart)}`;
                breakDisplay.style.display = 'block';
            }
            
            this.showNotification('Перерыв начат', 'info');
        } else {
            // Завершение перерыва
            const breakEnd = new Date();
            const breakDuration = breakEnd - this.currentBreakStart;
            
            this.breaks.push({
                start: this.currentBreakStart,
                end: breakEnd,
                duration: breakDuration
            });
            
            this.totalBreakTime += breakDuration;
            
            this.isOnBreak = false;
            this.currentBreakStart = null;
            
            const breakButton = document.getElementById('breakButton');
            if (breakButton) {
                breakButton.innerHTML = '<i class="fas fa-coffee"></i> Перерыв';
                breakButton.classList.remove('btn-success');
                breakButton.classList.add('btn-warning');
            }
            
            const breakDisplay = document.getElementById('breakTimeDisplay');
            if (breakDisplay) {
                breakDisplay.style.display = 'none';
            }
            
            const breakMinutes = Math.round(breakDuration / 1000 / 60);
            this.showNotification(`Перерыв завершен. Длительность: ${breakMinutes} минут`, 'info');
        }
        
        this.updateDisplay();
    }
    
    endWorkDay() {
        if (this.isOnBreak) {
            // Если пользователь на перерыве, завершаем его
            this.toggleBreak();
        }
        
        this.workEndTime = new Date();
        this.isWorkingDay = false;
        
        this.saveTodayToHistory();
        this.updateDisplay();
        this.disablePalletControls();
        this.showNotification('Рабочий день завершен', 'success');
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
    
    // ============ ПРОВЕРКА ПАЛЛЕТОВ ============
    startPalletCheck() {
        if (this.isOnBreak) {
            this.showNotification('Завершите перерыв перед началом проверки!', 'error');
            return;
        }
        
        const palletCodeInput = document.getElementById('palletCode');
        const boxCountInput = document.getElementById('boxCount');
        
        const code = palletCodeInput ? palletCodeInput.value.trim().toUpperCase() : '';
        const boxCount = boxCountInput ? parseInt(boxCountInput.value) || 0 : 0;
        
        if (!this.isWorkingDay) {
            this.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }
        
        if (boxCount <= 0) {
            this.showNotification('Введите количество коробов (минимум 1)!', 'error');
            if (boxCountInput) boxCountInput.focus();
            return;
        }
        
        if (code) {
            if (!code.startsWith('D') || code.length < 2) {
                this.showNotification('Неверный формат D-кода! Пример: D40505050', 'error');
                return;
            }
            
            const isDuplicate = this.todayChecks.some(check => check.code === code);
            if (isDuplicate) {
                this.showNotification(`Паллет ${code} уже проверен сегодня!`, 'error');
                return;
            }
        }
        
        if (this.currentPalletCheck) {
            this.showNotification('Завершите текущую проверку паллета!', 'error');
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
                errors: [],
                errorSummary: 'Без расхождений'
            };
            
            if (palletCodeInput) palletCodeInput.value = '';
            if (boxCountInput) boxCountInput.value = '';
            
            this.updateCurrentCheckDisplay();
            this.updateButtonStates();
            this.showNotification(`Проверка паллета ${this.currentPalletCheck.code} начата`, 'success');
        });
    }
    
    askAboutErrors() {
        if (!this.currentPalletCheck) {
            this.showNotification('Нет активной проверки!', 'error');
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
        const defaultRadio = document.querySelector('input[name="errorType"][value="недостача"]');
        if (defaultRadio) defaultRadio.checked = true;
        
        const productPLU = document.getElementById('productPLU');
        const productName = document.getElementById('productName');
        const productQuantity = document.getElementById('productQuantity');
        const productUnit = document.getElementById('productUnit');
        const errorComment = document.getElementById('errorComment');
        const addedErrorsList = document.getElementById('addedErrorsList');
        
        if (productPLU) productPLU.value = '';
        if (productName) productName.value = '';
        if (productQuantity) productQuantity.value = '';
        if (productUnit) productUnit.value = 'шт';
        if (errorComment) errorComment.value = '';
        if (addedErrorsList) addedErrorsList.innerHTML = '';
    }
    
    updateErrorFormVisibility() {
        const errorTypeRadio = document.querySelector('input[name="errorType"]:checked');
        if (!errorTypeRadio) return;
        
        const errorType = errorTypeRadio.value;
        const productDetails = document.getElementById('productDetails');
        
        if (productDetails) {
            if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
                productDetails.style.display = 'block';
            } else {
                productDetails.style.display = 'none';
            }
        }
    }
    
    addError() {
        const errorTypeRadio = document.querySelector('input[name="errorType"]:checked');
        if (!errorTypeRadio) return;
        
        const errorType = errorTypeRadio.value;
        const errorCommentInput = document.getElementById('errorComment');
        const comment = errorCommentInput ? errorCommentInput.value.trim() : '';
        
        const errorData = {
            type: errorType,
            comment: comment || ''
        };
        
        if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
            const productPLU = document.getElementById('productPLU');
            const productName = document.getElementById('productName');
            const productQuantity = document.getElementById('productQuantity');
            const productUnit = document.getElementById('productUnit');
            
            errorData.plu = productPLU ? productPLU.value : '';
            errorData.productName = productName ? productName.value : '';
            errorData.quantity = productQuantity ? productQuantity.value : '';
            errorData.unit = productUnit ? productUnit.value : 'шт';
        }
        
        this.tempErrors.push(errorData);
        this.updateAddedErrorsList();
        
        // Очистить форму для следующей ошибки
        const productPLU = document.getElementById('productPLU');
        const productName = document.getElementById('productName');
        const productQuantity = document.getElementById('productQuantity');
        const errorComment = document.getElementById('errorComment');
        
        if (productPLU) productPLU.value = '';
        if (productName) productName.value = '';
        if (productQuantity) productQuantity.value = '';
        if (errorComment) errorComment.value = '';
        
        const defaultRadio = document.querySelector('input[name="errorType"][value="недостача"]');
        if (defaultRadio) defaultRadio.checked = true;
        this.updateErrorFormVisibility();
        
        this.showNotification('Ошибка добавлена', 'success');
    }
    
    updateAddedErrorsList() {
        const list = document.getElementById('addedErrorsList');
        if (!list) return;
        
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
                const button = e.target.closest('.remove-error');
                if (button) {
                    const index = parseInt(button.dataset.index);
                    this.tempErrors.splice(index, 1);
                    this.updateAddedErrorsList();
                }
            });
        });
    }
    
    finishErrors() {
        if (this.tempErrors.length === 0) {
            this.showNotification('Не добавлено ни одной ошибки!', 'error');
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
        const duration = Math.round((endTime - this.currentPalletCheck.start) / 1000 / 60);
        const minutes = Math.floor(duration);
        
        this.currentPalletCheck.end = endTime;
        this.currentPalletCheck.duration = duration;
        this.currentPalletCheck.errors = [...errors];
        
        // Обновляем сводку ошибок
        if (errors.length > 0) {
            const firstError = errors[0];
            this.currentPalletCheck.errorSummary = firstError.type;
            if (firstError.productName) {
                this.currentPalletCheck.errorSummary += ` (${firstError.productName})`;
            }
        } else {
            this.currentPalletCheck.errorSummary = 'Без расхождений';
        }
        
        this.todayChecks.push({...this.currentPalletCheck});
        this.palletsChecked++;
        
        this.updateTodayChecksTable();
        this.updateDisplay();
        
        let message = `Паллет ${this.currentPalletCheck.code} проверен!\n`;
        message += `Коробов: ${this.currentPalletCheck.boxCount}\n`;
        message += `Длительность: ${minutes} минут\n`;
        message += `Проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
        
        if (errors.length > 0) {
            message += `\nОшибок: ${errors.length}`;
        }
        
        // Проверяем, все ли паллеты проверены
        if (this.palletsChecked >= this.totalPalletsToCheck) {
            message += '\n✅ Все паллеты проверены! Рабочий день будет завершен автоматически.';
            this.enableEndWorkDay();
            this.showExportPanel();
            
            // Автоматически завершаем рабочий день через 2 секунды
            setTimeout(() => {
                this.endWorkDay();
            }, 2000);
        }
        
        this.showNotification(message, 'success');
        
        this.currentPalletCheck = null;
        this.tempErrors = [];
        this.updateCurrentCheckDisplay();
        this.updateButtonStates();
    }
    
    showExportPanel() {
        const exportSection = document.getElementById('exportSection');
        if (exportSection) exportSection.style.display = 'block';
    }
    
    // ============ ЭКСПОРТ В EXCEL ============
    exportToExcel() {
        if (this.todayChecks.length === 0) {
            this.showNotification('Нет данных для экспорта', 'error');
            return;
        }
        
        try {
            // Создаем данные для первого листа (формат из таблицы)
            const sheet1Data = [
                ['Дата', 'Завод', 'РЦ', 'Номер Паллеты', 'Наименование ошибки', 
                 'Материал', 'Наименование материала', 'Количество', 
                 'Базисная единица', 'Количество коробов', 'Продолжительность проверки, минут', 'Комментарий']
            ];
            
            // Заполняем данные проверок
            this.todayChecks.forEach((check, index) => {
                let materialPLU = '';
                let materialName = '';
                let materialQuantity = '';
                let materialUnit = '';
                let comment = '';
                
                // Извлекаем данные из первой ошибки если есть
                if (check.errors && check.errors.length > 0) {
                    const firstError = check.errors[0];
                    materialPLU = firstError.plu || '';
                    materialName = firstError.productName || '';
                    materialQuantity = firstError.quantity || '';
                    materialUnit = firstError.unit || '';
                    comment = firstError.comment || '';
                }
                
                sheet1Data.push([
                    new Date().toISOString().split('T')[0], // Дата
                    this.settings.factoryNumber, // Завод (номер завода)
                    this.settings.rcName, // РЦ
                    check.code, // Номер Паллеты
                    check.errorSummary, // Наименование ошибки
                    materialPLU, // Материал
                    materialName, // Наименование материала
                    materialQuantity, // Количество
                    materialUnit, // Базисная единица
                    check.boxCount || '', // Количество коробов
                    check.duration || '', // Продолжительность проверки, минут
                    comment // Комментарий
                ]);
            });
            
            // Создаем данные для второго листа (рабочее время)
            const sheet2Data = [
                ['Дата', 'Время прихода на РЦ', 'Время ухода с РЦ', 
                 'Продолжительность работы', 'ФИО', 'Дополнительный комментарий']
            ];
            
            if (this.workStartTime && this.workEndTime) {
                // Корректируем время: от начала отнимаем 15 минут, к концу прибавляем 15 минут
                const adjustedStartTime = new Date(this.workStartTime.getTime() - 15 * 60 * 1000);
                const adjustedEndTime = new Date(this.workEndTime.getTime() + 15 * 60 * 1000);
                
                // Рассчитываем продолжительность работы с учетом перерывов
                const workDuration = Math.round((this.workEndTime - this.workStartTime - this.totalBreakTime) / 1000 / 60);
                
                sheet2Data.push([
                    new Date().toISOString().split('T')[0], // Дата
                    this.formatTime(adjustedStartTime, true), // Время прихода на РЦ (скорректированное)
                    this.formatTime(adjustedEndTime, true), // Время ухода с РЦ (скорректированное)
                    workDuration, // Продолжительность работы (без учета перерывов)
                    this.settings.specialistName, // ФИО
                    this.breaks.length > 0 ? `Перерывы: ${this.breaks.length}, общее время: ${Math.round(this.totalBreakTime / 1000 / 60)} мин` : '' // Дополнительный комментарий
                ]);
            }
            
            // Создаем рабочую книгу
            const wb = XLSX.utils.book_new();
            
            // Создаем первый лист
            const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
            XLSX.utils.book_append_sheet(wb, ws1, "Лист1");
            
            // Создаем второй лист
            const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
            XLSX.utils.book_append_sheet(wb, ws2, "Лист2");
            
            // Генерируем имя файла
            const fileName = `Проверка_паллетов_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.xlsx`;
            
            // Сохраняем файл
            XLSX.writeFile(wb, fileName);
            
            this.showNotification('Excel файл успешно скачан', 'success');
        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            this.showNotification('Ошибка при экспорте в Excel', 'error');
        }
    }
    
    generateAct() {
        if (this.todayChecks.length === 0) {
            this.showNotification('Нет данных для формирования акта', 'error');
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
4. Номер завода: ${this.settings.factoryNumber}
            
РЕЗУЛЬТАТЫ ПРОВЕРКИ:
            
1. Всего проверено паллетов: ${totalPallets}
2. Всего проверено коробов: ${totalBoxes}
3. Обнаружено ошибок: ${totalErrors}
4. Перерывов: ${this.breaks.length}, общее время перерывов: ${Math.round(this.totalBreakTime / 1000 / 60)} минут
            
Детали проверки:
${this.todayChecks.map((check, index) => `
${index + 1}. Паллет ${check.code}:
   - Коробов: ${check.boxCount || 0}
   - Время проверки: ${check.duration} минут
   - Ошибок: ${check.errors ? check.errors.length : 0}
   - Статус: ${check.errorSummary}
`).join('')}
            
Подпись специалиста КРО: ____________________
            
Дата: ${new Date().toLocaleDateString('ru-RU')}
        `;
        
        this.downloadTextFile(`Акт_проверки_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.txt`, actContent);
        this.showNotification('Акт проверки сформирован', 'success');
    }
    
    generateLetter() {
        if (this.todayChecks.length === 0) {
            this.showNotification('Нет данных для формирования письма', 'error');
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
Номер завода: ${this.settings.factoryNumber}
            
Результаты проверки:
- Проверено паллетов: ${totalPallets}
- Проверено коробов: ${totalBoxes}
- Обнаружено ошибок: ${totalErrors}
- Перерывов: ${this.breaks.length}, общее время: ${Math.round(this.totalBreakTime / 1000 / 60)} минут
            
${totalErrors > 0 ? 'Обнаружены следующие проблемы, требующие внимания:' : 'Ошибок не обнаружено. Все паллеты соответствуют требованиям.'}
            
${totalErrors > 0 ? this.todayChecks.filter(check => check.errors && check.errors.length > 0)
    .map(check => `Паллет ${check.code}: ${check.errorSummary}`)
    .join('\n') : ''}
            
Просим принять необходимые меры по устранению выявленных замечаний.
            
С уважением,
${this.settings.specialistName}
Специалист КРО
${this.settings.specialistEmail}
        `;
        
        this.downloadTextFile(`Письмо_результатов_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.txt`, letterContent);
        this.showNotification('Письмо результатов сформировано', 'success');
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
        this.updateCurrentCheckDisplay();
        this.updateTodayStats();
    }
    
    updateWorkTimeDisplay() {
        const display = document.getElementById('workTimeDisplay');
        const breakDisplay = document.getElementById('breakTimeDisplay');
        
        if (!display) return;
        
        if (this.workStartTime) {
            const startStr = this.formatTime(this.workStartTime);
            
            if (this.workEndTime) {
                const endStr = this.formatTime(this.workEndTime);
                const totalWorkTime = this.workEndTime - this.workStartTime - this.totalBreakTime;
                const workMinutes = Math.round(totalWorkTime / 1000 / 60);
                const hours = Math.floor(workMinutes / 60);
                const minutes = workMinutes % 60;
                
                let breakInfo = '';
                if (this.breaks.length > 0) {
                    const totalBreakMinutes = Math.round(this.totalBreakTime / 1000 / 60);
                    breakInfo = ` | Перерывов: ${this.breaks.length} (${totalBreakMinutes} мин)`;
                }
                
                display.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Начало: ${startStr} | Конец: ${endStr} | 
                    Рабочее время: ${hours}ч ${minutes}мин${breakInfo}
                `;
            } else {
                let currentTimeInfo = '';
                if (this.isWorkingDay) {
                    const currentTime = new Date();
                    const workedTime = currentTime - this.workStartTime - this.totalBreakTime;
                    const workedMinutes = Math.round(workedTime / 1000 / 60);
                    const hours = Math.floor(workedMinutes / 60);
                    const minutes = workedMinutes % 60;
                    
                    let breakInfo = '';
                    if (this.breaks.length > 0) {
                        const totalBreakMinutes = Math.round(this.totalBreakTime / 1000 / 60);
                        breakInfo = ` | Перерывов: ${this.breaks.length} (${totalBreakMinutes} мин)`;
                    }
                    
                    currentTimeInfo = ` | Отработано: ${hours}ч ${minutes}мин${breakInfo}`;
                }
                
                display.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Начало: ${startStr}${currentTimeInfo}
                `;
                
                // Обновляем отображение перерыва если он активен
                if (this.isOnBreak && this.currentBreakStart) {
                    const breakTime = new Date() - this.currentBreakStart;
                    const breakMinutes = Math.round(breakTime / 1000 / 60);
                    if (breakDisplay) {
                        breakDisplay.textContent = `Перерыв: ${breakMinutes} минут`;
                        breakDisplay.style.display = 'block';
                    }
                }
            }
        } else {
            display.innerHTML = `
                <i class="fas fa-clock"></i> 
                Рабочий день не начат
            `;
        }
    }
    
    updatePalletCounter() {
        const palletCounter = document.getElementById('palletCounter');
        if (palletCounter) {
            palletCounter.textContent = `Паллетов проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
        }
    }
    
    updateProgressBar() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const progress = (this.palletsChecked / this.totalPalletsToCheck) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }
    
    updateCurrentCheckDisplay() {
        const display = document.getElementById('currentCheckDisplay');
        if (!display) return;
        
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
        const startWorkBtn = document.getElementById('startWorkDay');
        const breakBtn = document.getElementById('breakButton');
        const endWorkBtn = document.getElementById('endWorkDay');
        const startCheckBtn = document.getElementById('startPalletCheck');
        const endCheckBtn = document.getElementById('endPalletCheck');
        
        if (startWorkBtn) startWorkBtn.disabled = this.isWorkingDay;
        if (breakBtn) breakBtn.disabled = !this.isWorkingDay;
        if (endWorkBtn) endWorkBtn.disabled = !this.isWorkingDay;
        if (startCheckBtn) startCheckBtn.disabled = !this.isWorkingDay || this.currentPalletCheck !== null || this.isOnBreak;
        if (endCheckBtn) endCheckBtn.disabled = this.currentPalletCheck === null;
    }
    
    enablePalletControls() {
        this.updateButtonStates();
    }
    
    disablePalletControls() {
        this.updateButtonStates();
    }
    
    enableEndWorkDay() {
        const endWorkDay = document.getElementById('endWorkDay');
        if (endWorkDay) endWorkDay.disabled = false;
        this.updateButtonStates();
    }
    
    // ============ ТАБЛИЦА СЕГОДНЯШНИХ ПРОВЕРОК ============
    updateTodayChecksTable() {
        const tbody = document.getElementById('todayChecksBody');
        if (!tbody) return;
        
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
                <td>${check.duration || '-'} мин</td>
                <td>
                    <span class="status-badge ${hasErrors ? 'status-warning' : 'status-success'}">
                        ${check.errorSummary}
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
                const button = e.target.closest('.view-stats-btn');
                if (button) {
                    const index = parseInt(button.dataset.index);
                    this.showPalletStats(index);
                }
            });
        });
    }
    
    updateTodayStats() {
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        const totalPalletsElement = document.getElementById('totalPallets');
        const totalBoxesElement = document.getElementById('totalBoxes');
        const totalErrorsElement = document.getElementById('totalErrors');
        
        if (totalPalletsElement) totalPalletsElement.textContent = totalPallets;
        if (totalBoxesElement) totalBoxesElement.textContent = totalBoxes;
        if (totalErrorsElement) totalErrorsElement.textContent = totalErrors;
    }
    
    // ============ СОХРАНЕНИЕ ДАННЫХ ============
    saveTodayToHistory() {
        const today = new Date().toISOString().split('T')[0];
        
        this.allDaysHistory[today] = {
            work_start: this.workStartTime ? this.workStartTime.toISOString() : null,
            work_end: this.workEndTime ? this.workEndTime.toISOString() : null,
            pallets_checked: this.palletsChecked,
            breaks: this.breaks.map(br => ({
                start: br.start.toISOString(),
                end: br.end.toISOString(),
                duration: br.duration
            })),
            total_break_time: this.totalBreakTime,
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
            palletsChecked: this.palletsChecked,
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck ? {
                ...this.currentPalletCheck,
                start: this.currentPalletCheck.start.toISOString(),
                end: this.currentPalletCheck.end ? this.currentPalletCheck.end.toISOString() : null
            } : null,
            tempErrors: this.tempErrors,
            breaks: this.breaks.map(br => ({
                start: br.start.toISOString(),
                end: br.end ? br.end.toISOString() : null,
                duration: br.duration
            })),
            isOnBreak: this.isOnBreak,
            currentBreakStart: this.currentBreakStart ? this.currentBreakStart.toISOString() : null,
            totalBreakTime: this.totalBreakTime
        };
        
        localStorage.setItem('palletTrackerData', JSON.stringify(data));
        this.showNotification('Данные сохранены', 'success');
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('palletTrackerData');
            if (!saved) return;
            
            const data = JSON.parse(saved);
            
            this.allDaysHistory = data.allDaysHistory || {};
            this.workStartTime = data.workStartTime ? new Date(data.workStartTime) : null;
            this.workEndTime = data.workEndTime ? new Date(data.workEndTime) : null;
            this.palletsChecked = data.palletsChecked || 0;
            this.isWorkingDay = data.isWorkingDay || false;
            this.tempErrors = data.tempErrors || [];
            this.isOnBreak = data.isOnBreak || false;
            this.currentBreakStart = data.currentBreakStart ? new Date(data.currentBreakStart) : null;
            this.totalBreakTime = data.totalBreakTime || 0;
            
            // Восстанавливаем перерывы
            this.breaks = (data.breaks || []).map(br => ({
                start: new Date(br.start),
                end: br.end ? new Date(br.end) : null,
                duration: br.duration || 0
            }));
            
            // Восстанавливаем todayChecks с преобразованием строк в Date
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
            
            // Обновляем отображение перерыва если он активен
            if (this.isOnBreak && this.currentBreakStart) {
                const breakDisplay = document.getElementById('breakTimeDisplay');
                if (breakDisplay) {
                    const breakTime = new Date() - this.currentBreakStart;
                    const breakMinutes = Math.round(breakTime / 1000 / 60);
                    breakDisplay.textContent = `Перерыв: ${breakMinutes} минут`;
                    breakDisplay.style.display = 'block';
                }
                
                const breakButton = document.getElementById('breakButton');
                if (breakButton) {
                    breakButton.innerHTML = '<i class="fas fa-coffee"></i> Завершить перерыв';
                    breakButton.classList.remove('btn-warning');
                    breakButton.classList.add('btn-success');
                }
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
    
    // ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
    formatTime(date, timeOnly = false) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
        if (timeOnly) {
            return date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
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
    
    // ============ СТАТИСТИКА ПАЛЛЕТА ============
    showPalletStats(index) {
        this.currentPalletStatsIndex = index;
        const check = this.todayChecks[index];
        
        const palletStatsTitle = document.getElementById('palletStatsTitle');
        const statsInfo = document.getElementById('palletStatsInfo');
        const errorsList = document.getElementById('palletErrorsList');
        
        if (palletStatsTitle) {
            palletStatsTitle.textContent = `Статистика паллета ${check.code} (№${index + 1})`;
        }
        
        if (!statsInfo || !errorsList) return;
        
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
        
        statsInfo.innerHTML = `
            <p><strong>D-код паллета:</strong> ${check.code}</p>
            <p><strong>Количество коробов:</strong> ${check.boxCount || 0}</p>
            <p><strong>Начало проверки:</strong> ${startStr}</p>
            <p><strong>Окончание проверки:</strong> ${endStr}</p>
            <p><strong>Длительность проверки:</strong> ${check.duration} минут</p>
            <p><strong>Статус проверки:</strong> ${check.errorSummary}</p>
        `;
        
        if (!check.errors || check.errors.length === 0) {
            errorsList.innerHTML = `
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
            
            errorsList.innerHTML = errorsHtml;
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
        if (!tbody) return;
        
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
                    
                    const totalWorkTime = endTime - startTime - (dayData.total_break_time || 0);
                    const workMinutes = Math.round(totalWorkTime / 1000 / 60);
                    const hours = Math.floor(workMinutes / 60);
                    const minutes = workMinutes % 60;
                    totalTime = `${hours}ч ${minutes}м`;
                    
                    // Добавляем информацию о перерывах
                    if (dayData.breaks && dayData.breaks.length > 0) {
                        const breakMinutes = Math.round((dayData.total_break_time || 0) / 1000 / 60);
                        totalTime += ` (перерывы: ${breakMinutes}м)`;
                    }
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
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Документ загружен, начинаем инициализацию');
    
    // Инициализируем приложение
    window.app = new PalletTrackerApp();
    window.app.initApp();
    
    console.log('Приложение инициализировано');
});
