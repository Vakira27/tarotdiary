/* ============================================
   STUDY.JS — Режим изучения (флеш-карты)
   ============================================ */

const StudyManager = {
    PROGRESS_KEY: 'tarot_study_progress',
    currentMode: null,       // 'keywords' | 'card' | 'meaning'
    currentFilter: 'all',
    cards: [],               // Текущий набор карт
    currentIndex: 0,
    isFlipped: false,
    cardsStudied: 0,

    /* --- Получение прогресса --- */
    getProgress() {
        try {
            const data = localStorage.getItem(this.PROGRESS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    /* --- Сохранение прогресса --- */
    saveProgress(progress) {
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
    },

    /* --- Отметить карту как изученную --- */
    markStudied(cardId) {
        const progress = this.getProgress();
        if (!progress[cardId]) {
            progress[cardId] = { count: 0, lastStudied: null };
        }
        progress[cardId].count += 1;
        progress[cardId].lastStudied = new Date().toISOString();
        this.saveProgress(progress);
    },

    /* --- Количество изученных карт --- */
    getStudiedCount() {
        return Object.keys(this.getProgress()).length;
    },

    /* --- Фильтрация карт --- */
    filterCards(filter) {
        if (!window.TAROT_CARDS) return [];
        const cards = window.TAROT_CARDS;
        switch (filter) {
            case 'major': return cards.filter(c => c.arcana === 'major');
            case 'minor': return cards.filter(c => c.arcana === 'minor');
            case 'wands': return cards.filter(c => c.suit === 'wands');
            case 'cups': return cards.filter(c => c.suit === 'cups');
            case 'swords': return cards.filter(c => c.suit === 'swords');
            case 'pentacles': return cards.filter(c => c.suit === 'pentacles');
            default: return [...cards];
        }
    },

    /* --- Перемешать массив (Fisher-Yates) --- */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /* --- Начать сессию изучения --- */
    startSession(mode, filter) {
        this.currentMode = mode;
        this.currentFilter = filter;
        this.cards = this.shuffle(this.filterCards(filter));
        this.currentIndex = 0;
        this.isFlipped = false;
        this.cardsStudied = 0;

        if (this.cards.length === 0) {
            return false;
        }
        return true;
    },

    /* --- Получить текущую карту --- */
    getCurrentCard() {
        if (this.currentIndex < 0 || this.currentIndex >= this.cards.length) return null;
        return this.cards[this.currentIndex];
    },

    /* --- Следующая карта --- */
    nextCard() {
        if (this.currentIndex < this.cards.length - 1) {
            // Отмечаем текущую карту как изученную
            const current = this.getCurrentCard();
            if (current) {
                this.markStudied(current.id);
                this.cardsStudied++;
            }
            this.currentIndex++;
            this.isFlipped = false;
            return true;
        }
        // Последняя карта тоже изучена
        const current = this.getCurrentCard();
        if (current) {
            this.markStudied(current.id);
            this.cardsStudied++;
        }
        return false; // Конец колоды
    },

    /* --- Предыдущая карта --- */
    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.isFlipped = false;
            return true;
        }
        return false;
    },

    /* --- Перевернуть карту --- */
    flip() {
        this.isFlipped = !this.isFlipped;
        return this.isFlipped;
    },

    /* --- Перемешать заново --- */
    reshuffleCards() {
        this.cards = this.shuffle(this.cards);
        this.currentIndex = 0;
        this.isFlipped = false;
    },

    /* --- Рендер передней стороны --- */
    renderFront(card) {
        if (!card) return '';

        switch (this.currentMode) {
            case 'keywords':
                // Показываем карту — нужно вспомнить ключевые слова
                return `
                    <div class="flash-front-content">
                        <div class="flash-symbol">${card.symbol}</div>
                        <div class="flash-name">${card.name}</div>
                        ${card.suitName ? `<div class="flash-suit">${card.suitName}</div>` : ''}
                        <div class="flash-prompt">Вспомните ключевые слова</div>
                    </div>
                `;
            case 'card':
                // Показываем ключевые слова — нужно угадать карту
                return `
                    <div class="flash-front-content">
                        <div class="flash-keywords-list">
                            ${card.keywords.map(k => `<span class="flash-keyword">${k}</span>`).join('')}
                        </div>
                        <div class="flash-prompt">Какая это карта?</div>
                    </div>
                `;
            case 'meaning':
                // Показываем карту — нужно вспомнить значение
                return `
                    <div class="flash-front-content">
                        <div class="flash-symbol">${card.symbol}</div>
                        <div class="flash-name">${card.name}</div>
                        <div class="flash-keywords-small">
                            ${card.keywords.map(k => `<span class="badge">${k}</span>`).join('')}
                        </div>
                        <div class="flash-prompt">Нажмите, чтобы увидеть значение</div>
                    </div>
                `;
            default:
                return '';
        }
    },

    /* --- Рендер задней стороны --- */
    renderBack(card) {
        if (!card) return '';

        switch (this.currentMode) {
            case 'keywords':
                return `
                    <div class="flash-back-content">
                        <div class="flash-answer-label">Ключевые слова:</div>
                        <div class="flash-keywords-list">
                            ${card.keywords.map(k => `<span class="flash-keyword">${k}</span>`).join('')}
                        </div>
                        <div class="flash-advice">${card.advice}</div>
                    </div>
                `;
            case 'card':
                return `
                    <div class="flash-back-content">
                        <div class="flash-symbol">${card.symbol}</div>
                        <div class="flash-answer-label">${card.name}</div>
                        ${card.suitName ? `<div class="flash-suit">${card.suitName}</div>` : ''}
                        <div class="flash-element">${card.element}</div>
                    </div>
                `;
            case 'meaning':
                return `
                    <div class="flash-back-content flash-back-meaning">
                        <div class="flash-meaning-section">
                            <strong>☀️ Прямое:</strong>
                            <p>${card.upright}</p>
                        </div>
                        <div class="flash-meaning-section">
                            <strong>🔄 Перевёрнутое:</strong>
                            <p>${card.reversed}</p>
                        </div>
                        <div class="flash-advice">${card.advice}</div>
                    </div>
                `;
            default:
                return '';
        }
    },

    /* --- Рендер флеш-карты --- */
    renderFlashcard(frontEl, backEl) {
        const card = this.getCurrentCard();
        if (!card) return;

        frontEl.innerHTML = this.renderFront(card);
        backEl.innerHTML = this.renderBack(card);
    },

    /* --- Обновление прогресс-бара --- */
    updateProgress(fillEl, textEl) {
        const total = this.cards.length;
        const current = this.currentIndex + 1;
        const percent = (current / total) * 100;

        fillEl.style.width = percent + '%';
        textEl.textContent = `${current} / ${total}`;
    }
};
