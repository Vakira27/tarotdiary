/* ============================================
   APP.JS — Основная логика приложения
   Навигация, рендеринг, карта дня
   ============================================ */

(function() {
    'use strict';

    /* --- Элементы DOM --- */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    /* --- Состояние приложения --- */
    const App = {
        currentPage: 'home',
        previousPage: null,
        cardOfDay: null,
        cardOfDayDate: null,
        editingEntryId: null,
        selectedCardsForEntry: [],
        confirmCallback: null,
    };

    /* ==========================================
       НАВИГАЦИЯ
       ========================================== */

    function navigateTo(page, pushState = true) {
        // Скрыть текущую страницу
        $$('.page').forEach(p => p.classList.remove('active'));
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        $$('.mobile-nav-link').forEach(l => l.classList.remove('active'));

        // Показать новую страницу
        const pageEl = $(`#page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
        }

        // Обновить навигацию
        const navLink = $(`.nav-link[data-page="${page}"]`);
        if (navLink) navLink.classList.add('active');
        const mobileLink = $(`.mobile-nav-link[data-page="${page}"]`);
        if (mobileLink) mobileLink.classList.add('active');

        App.previousPage = App.currentPage;
        App.currentPage = page;

        // Обновить hash
        if (pushState) {
            window.location.hash = page;
        }

        // Скролл наверх
        $('#mainContent').scrollTo(0, 0);

        // Выполнить действия при открытии страницы
        onPageOpen(page);
    }

    function onPageOpen(page) {
        switch (page) {
            case 'home':
                renderHome();
                break;
            case 'library':
                renderLibrary();
                break;
            case 'diary':
                renderDiary();
                break;
            case 'study':
                showStudyModes();
                break;
        }
    }

    /* ==========================================
       ГЛАВНАЯ СТРАНИЦА
       ========================================== */

    function renderHome() {
        renderCardOfDay();
        updateStats();
    }

    function renderCardOfDay() {
        if (!window.TAROT_CARDS || window.TAROT_CARDS.length === 0) return;

        const today = new Date().toISOString().split('T')[0];
        const savedDate = localStorage.getItem('tarot_cod_date');
        const savedCardId = localStorage.getItem('tarot_cod_id');

        let card;
        if (savedDate === today && savedCardId) {
            card = window.TAROT_CARDS.find(c => c.id === savedCardId);
        }

        if (!card) {
            card = getRandomCard();
            localStorage.setItem('tarot_cod_date', today);
            localStorage.setItem('tarot_cod_id', card.id);
        }

        App.cardOfDay = card;

        $('#codSymbol').textContent = card.symbol;
        $('#codName').textContent = card.name;
        $('#codKeywords').innerHTML = card.keywords.map(k => `<span class="badge">${k}</span>`).join('');
        $('#codMeaning').textContent = card.upright;
        $('#codAdvice').innerHTML = `<strong>💡 Совет:</strong> ${card.advice}`;
    }

    function getRandomCard() {
        const cards = window.TAROT_CARDS;
        return cards[Math.floor(Math.random() * cards.length)];
    }

    function updateStats() {
        const diaryCount = DiaryManager.getCount();
        const studiedCount = StudyManager.getStudiedCount();
        const streak = DiaryManager.getStreak();

        $('#statDiaryEntries').textContent = diaryCount;
        $('#statStudied').textContent = studiedCount;
        $('#statStreak').textContent = streak;
        $('#total-entries').textContent = diaryCount;
    }

    /* ==========================================
       БИБЛИОТЕКА КАРТ
       ========================================== */

    let currentFilter = 'all';
    let searchQuery = '';

    function renderLibrary() {
        renderCardGrid();
    }

    function renderCardGrid() {
        if (!window.TAROT_CARDS) return;

        let cards = [...window.TAROT_CARDS];

        // Применить фильтр
        if (currentFilter !== 'all') {
            if (currentFilter === 'major') {
                cards = cards.filter(c => c.arcana === 'major');
            } else {
                cards = cards.filter(c => c.suit === currentFilter);
            }
        }

        // Применить поиск
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            cards = cards.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.keywords.some(k => k.toLowerCase().includes(q))
            );
        }

        // Обновить счётчик
        $('#cardsCount').textContent = `Показано: ${cards.length} карт`;

        // Рендер
        const grid = $('#cardGrid');
        grid.innerHTML = cards.map(card => {
            const suitClass = card.suit ? `suit-${card.suit}` : 'suit-major';
            return `
                <div class="tarot-card ${suitClass}" data-card-id="${card.id}">
                    <div class="tarot-card-symbol">${card.symbol}</div>
                    <div class="tarot-card-name">${card.name}</div>
                    <div class="tarot-card-keywords">
                        ${card.keywords.slice(0, 3).map(k => `<span class="badge badge-sm">${k}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Добавить обработчики клика
        grid.querySelectorAll('.tarot-card').forEach(el => {
            el.addEventListener('click', () => {
                const cardId = el.dataset.cardId;
                showCardDetail(cardId);
            });
        });
    }

    function showCardDetail(cardId) {
        const card = window.TAROT_CARDS.find(c => c.id === cardId);
        if (!card) return;

        $('#detailSymbol').textContent = card.symbol;
        $('#detailNumber').textContent = card.arcana === 'major' ? romanNumeral(card.number) : '';
        $('#detailName').textContent = card.name;
        $('#detailArcana').textContent = card.arcana === 'major' ? 'Старший Аркан' : card.suitName;
        $('#detailElement').textContent = card.element || '';
        $('#detailKeywords').innerHTML = card.keywords.map(k => `<span class="badge">${k}</span>`).join('');
        $('#detailUpright').textContent = card.upright;
        $('#detailReversed').textContent = card.reversed;
        $('#detailAdvice').textContent = card.advice;

        // Установить цвет акцента по масти
        const detail = $('#cardDetail');
        detail.className = 'card-detail';
        if (card.suit) detail.classList.add(`detail-${card.suit}`);

        navigateTo('card-detail');
    }

    function romanNumeral(num) {
        const numerals = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                          'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
        return numerals[num] || num.toString();
    }

    /* ==========================================
       ДНЕВНИК
       ========================================== */

    function renderDiary() {
        DiaryManager.renderDiaryList($('#diaryList'), $('#diaryEmpty'));
        attachDiaryEventHandlers();
    }

    function attachDiaryEventHandlers() {
        // Кнопки просмотра
        $$('.diary-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                showEntryView(id);
            });
        });

        // Кнопки редактирования
        $$('.diary-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                openEditEntry(id);
            });
        });

        // Кнопки удаления
        $$('.diary-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                confirmAction('Удалить запись?', 'Это действие нельзя отменить.', () => {
                    DiaryManager.deleteEntry(id);
                    renderDiary();
                    updateStats();
                    showToast('Запись удалена', 'success');
                });
            });
        });
    }

    function showEntryView(entryId) {
        DiaryManager.renderEntryView($('#entryView'), entryId);
        navigateTo('view-entry');

        // Обработчики в просмотре
        const editBtn = $('#entryView').querySelector('.entry-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                openEditEntry(editBtn.dataset.id);
            });
        }

        const deleteBtn = $('#entryView').querySelector('.entry-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                confirmAction('Удалить запись?', 'Это действие нельзя отменить.', () => {
                    DiaryManager.deleteEntry(deleteBtn.dataset.id);
                    navigateTo('diary');
                    showToast('Запись удалена', 'success');
                });
            });
        }

        // Клик по карте в просмотре → показать детали карты
        $$('.view-card-item').forEach(el => {
            el.addEventListener('click', () => {
                showCardDetail(el.dataset.cardId);
            });
        });
    }

    /* --- Форма записи --- */

    function openNewEntry() {
        App.editingEntryId = null;
        App.selectedCardsForEntry = [];
        $('#entryFormTitle').textContent = 'Новая запись';
        $('#entryForm').reset();
        $('#entryId').value = '';
        $('#entryDate').value = new Date().toISOString().split('T')[0];
        $('#entryMood').value = '';
        $$('.mood-btn').forEach(b => b.classList.remove('active'));
        renderSelectedCards();
        navigateTo('new-entry');
    }

    function openEditEntry(entryId) {
        const entry = DiaryManager.getEntry(entryId);
        if (!entry) return;

        App.editingEntryId = entryId;
        App.selectedCardsForEntry = entry.cards || [];
        $('#entryFormTitle').textContent = 'Редактировать запись';
        $('#entryId').value = entryId;
        $('#entryDate').value = entry.date || '';
        $('#entrySpreadType').value = entry.spreadType || '';
        $('#entryQuestion').value = entry.question || '';
        $('#entryInterpretation').value = entry.interpretation || '';
        $('#entryNotes').value = entry.notes || '';
        $('#entryMood').value = entry.mood || '';

        // Установить активную кнопку настроения
        $$('.mood-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mood === entry.mood);
        });

        renderSelectedCards();
        navigateTo('new-entry');
    }

    function saveEntry(e) {
        e.preventDefault();

        const entry = {
            date: $('#entryDate').value,
            spreadType: $('#entrySpreadType').value,
            question: $('#entryQuestion').value,
            cards: App.selectedCardsForEntry,
            interpretation: $('#entryInterpretation').value,
            notes: $('#entryNotes').value,
            mood: $('#entryMood').value,
        };

        if (App.editingEntryId) {
            DiaryManager.updateEntry(App.editingEntryId, entry);
            showToast('Запись обновлена', 'success');
        } else {
            DiaryManager.addEntry(entry);
            showToast('Запись добавлена', 'success');
        }

        updateStats();
        navigateTo('diary');
    }

    /* --- Выбор карт для записи --- */

    function renderSelectedCards() {
        const container = $('#selectedCards');
        if (App.selectedCardsForEntry.length === 0) {
            container.innerHTML = '<span class="selected-cards-empty">Карты не выбраны</span>';
            return;
        }

        container.innerHTML = App.selectedCardsForEntry.map((cardId, index) => {
            const card = window.TAROT_CARDS ? window.TAROT_CARDS.find(c => c.id === cardId) : null;
            if (!card) return '';
            return `
                <div class="selected-card-tag">
                    <span>${card.symbol} ${card.name}</span>
                    <button type="button" class="remove-card-btn" data-index="${index}">✕</button>
                </div>
            `;
        }).join('');

        // Обработчики удаления карты
        container.querySelectorAll('.remove-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                App.selectedCardsForEntry.splice(idx, 1);
                renderSelectedCards();
            });
        });
    }

    function openCardSelectModal() {
        const modal = $('#cardSelectModal');
        modal.style.display = 'flex';
        $('#cardSelectSearch').value = '';
        renderCardSelectList('');
        $('#cardSelectSearch').focus();
    }

    function closeCardSelectModal() {
        $('#cardSelectModal').style.display = 'none';
    }

    function renderCardSelectList(query) {
        if (!window.TAROT_CARDS) return;
        let cards = window.TAROT_CARDS;

        if (query) {
            const q = query.toLowerCase();
            cards = cards.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.keywords.some(k => k.toLowerCase().includes(q))
            );
        }

        const list = $('#cardSelectList');
        list.innerHTML = cards.map(card => `
            <div class="card-select-item" data-card-id="${card.id}">
                <span class="card-select-symbol">${card.symbol}</span>
                <span class="card-select-name">${card.name}</span>
            </div>
        `).join('');

        list.querySelectorAll('.card-select-item').forEach(item => {
            item.addEventListener('click', () => {
                const cardId = item.dataset.cardId;
                if (!App.selectedCardsForEntry.includes(cardId)) {
                    App.selectedCardsForEntry.push(cardId);
                    renderSelectedCards();
                }
                closeCardSelectModal();
            });
        });
    }

    /* ==========================================
       РЕЖИМ ИЗУЧЕНИЯ
       ========================================== */

    let selectedStudyMode = null;

    function showStudyModes() {
        $('#studyModes').style.display = 'grid';
        $('#studyFilter').style.display = 'none';
        $('#studyArea').style.display = 'none';
        $('#studyResults').style.display = 'none';
    }

    function showStudyFilter(mode) {
        selectedStudyMode = mode;
        $('#studyModes').style.display = 'none';
        $('#studyFilter').style.display = 'flex';
    }

    function startStudySession(filter) {
        const success = StudyManager.startSession(selectedStudyMode, filter);
        if (!success) {
            showToast('Нет карт для изучения', 'error');
            return;
        }

        $('#studyFilter').style.display = 'none';
        $('#studyArea').style.display = 'flex';
        $('#studyHint').style.display = 'block';

        renderCurrentFlashcard();
    }

    function renderCurrentFlashcard() {
        const card = StudyManager.getCurrentCard();
        if (!card) return;

        const inner = $('#flashcardInner');
        inner.classList.remove('flipped');
        StudyManager.isFlipped = false;

        StudyManager.renderFlashcard($('#flashcardFront'), $('#flashcardBack'));
        StudyManager.updateProgress($('#studyProgressFill'), $('#studyProgressText'));
    }

    function flipFlashcard() {
        const inner = $('#flashcardInner');
        StudyManager.flip();
        inner.classList.toggle('flipped');
        $('#studyHint').style.display = 'none';
    }

    function nextFlashcard() {
        const hasMore = StudyManager.nextCard();
        if (hasMore) {
            renderCurrentFlashcard();
        } else {
            showStudyResults();
        }
    }

    function prevFlashcard() {
        if (StudyManager.prevCard()) {
            renderCurrentFlashcard();
        }
    }

    function showStudyResults() {
        $('#studyArea').style.display = 'none';
        $('#studyResults').style.display = 'flex';
        $('#resultsStats').textContent = `Вы изучили ${StudyManager.cardsStudied} карт. Всего изучено уникальных карт: ${StudyManager.getStudiedCount()} из 78.`;
        updateStats();
    }

    /* ==========================================
       TOAST УВЕДОМЛЕНИЯ
       ========================================== */

    function showToast(message, type = 'success') {
        const toast = $('#toast');
        const icon = $('#toastIcon');
        const msg = $('#toastMessage');

        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        icon.textContent = icons[type] || '✅';
        msg.textContent = message;

        toast.className = `toast toast-${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    /* ==========================================
       МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ
       ========================================== */

    function confirmAction(title, message, callback) {
        $('#confirmTitle').textContent = title;
        $('#confirmMessage').textContent = message;
        $('#confirmModal').style.display = 'flex';
        App.confirmCallback = callback;
    }

    function closeConfirmModal() {
        $('#confirmModal').style.display = 'none';
        App.confirmCallback = null;
    }

    /* ==========================================
       ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ
       ========================================== */

    function initEventListeners() {

        /* --- Навигация --- */
        $$('.nav-link, .mobile-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                navigateTo(page);
            });
        });

        // Hash navigation
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && hash !== App.currentPage) {
                navigateTo(hash, false);
            }
        });

        /* --- Главная страница --- */
        $('#newCardOfDay').addEventListener('click', () => {
            localStorage.removeItem('tarot_cod_date');
            localStorage.removeItem('tarot_cod_id');
            renderCardOfDay();
            showToast('Новая карта дня!', 'info');
        });

        $('#codDetails').addEventListener('click', () => {
            if (App.cardOfDay) {
                showCardDetail(App.cardOfDay.id);
            }
        });

        // Quick actions
        $$('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch (action) {
                    case 'new-entry': openNewEntry(); break;
                    case 'study': navigateTo('study'); break;
                    case 'library': navigateTo('library'); break;
                }
            });
        });

        /* --- Библиотека --- */
        $('#searchInput').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            $('#searchClear').style.display = searchQuery ? 'block' : 'none';
            renderCardGrid();
        });

        $('#searchClear').addEventListener('click', () => {
            searchQuery = '';
            $('#searchInput').value = '';
            $('#searchClear').style.display = 'none';
            renderCardGrid();
        });

        $$('.filter-pills .filter-pill[data-filter]').forEach(pill => {
            pill.addEventListener('click', () => {
                $$('.filter-pills .filter-pill[data-filter]').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentFilter = pill.dataset.filter;
                renderCardGrid();
            });
        });

        /* --- Детали карты --- */
        $('#backToLibrary').addEventListener('click', () => {
            navigateTo('library');
        });

        /* --- Дневник --- */
        $('#newEntryBtn').addEventListener('click', openNewEntry);
        $('#emptyNewEntry').addEventListener('click', openNewEntry);

        /* --- Форма записи --- */
        $('#backToDiary').addEventListener('click', () => navigateTo('diary'));
        $('#cancelEntry').addEventListener('click', () => navigateTo('diary'));
        $('#entryForm').addEventListener('submit', saveEntry);

        // Выбор карт
        $('#addCardBtn').addEventListener('click', openCardSelectModal);
        $('#closeCardSelect').addEventListener('click', closeCardSelectModal);
        $('#cardSelectSearch').addEventListener('input', (e) => {
            renderCardSelectList(e.target.value);
        });

        // Клик вне модального окна
        $('#cardSelectModal').addEventListener('click', (e) => {
            if (e.target === $('#cardSelectModal')) {
                closeCardSelectModal();
            }
        });

        // Настроение
        $$('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.mood-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                $('#entryMood').value = btn.dataset.mood;
            });
        });

        /* --- Просмотр записи --- */
        $('#backToDiaryFromView').addEventListener('click', () => navigateTo('diary'));

        /* --- Режим изучения --- */
        $$('.study-mode-card').forEach(card => {
            card.addEventListener('click', () => {
                showStudyFilter(card.dataset.mode);
            });
        });

        $$('[data-study-filter]').forEach(pill => {
            pill.addEventListener('click', () => {
                $$('[data-study-filter]').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });

        $('#startStudy').addEventListener('click', () => {
            const activeFilter = document.querySelector('[data-study-filter].active');
            const filter = activeFilter ? activeFilter.dataset.studyFilter : 'all';
            startStudySession(filter);
        });

        $('#cancelStudy').addEventListener('click', showStudyModes);

        // Flashcard controls
        $('#flashcard').addEventListener('click', flipFlashcard);
        $('#studyFlip').addEventListener('click', flipFlashcard);
        $('#studyNext').addEventListener('click', nextFlashcard);
        $('#studyPrev').addEventListener('click', prevFlashcard);

        $('#studyShuffle').addEventListener('click', () => {
            StudyManager.reshuffleCards();
            renderCurrentFlashcard();
            showToast('Карты перемешаны', 'info');
        });

        $('#studyStop').addEventListener('click', () => {
            showStudyResults();
        });

        $('#studyAgain').addEventListener('click', () => {
            startStudySession(StudyManager.currentFilter);
        });

        $('#studyBack').addEventListener('click', showStudyModes);

        /* --- Модальное окно подтверждения --- */
        $('#confirmYes').addEventListener('click', () => {
            if (App.confirmCallback) App.confirmCallback();
            closeConfirmModal();
        });
        $('#confirmNo').addEventListener('click', closeConfirmModal);
        $('#confirmModal').addEventListener('click', (e) => {
            if (e.target === $('#confirmModal')) closeConfirmModal();
        });

        /* --- Клавиатура --- */
        document.addEventListener('keydown', (e) => {
            // Escape закрывает модалки
            if (e.key === 'Escape') {
                closeCardSelectModal();
                closeConfirmModal();
            }

            // В режиме изучения
            if (App.currentPage === 'study' && $('#studyArea').style.display !== 'none') {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    flipFlashcard();
                } else if (e.key === 'ArrowRight') {
                    nextFlashcard();
                } else if (e.key === 'ArrowLeft') {
                    prevFlashcard();
                }
            }
        });
    }

    /* ==========================================
       ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
       ========================================== */

    function init() {
        initEventListeners();

        // Проверить hash в URL
        const hash = window.location.hash.slice(1);
        if (hash) {
            navigateTo(hash, false);
        } else {
            navigateTo('home', false);
        }
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
