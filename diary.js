/* ============================================
   DIARY.JS — Логика дневника раскладов
   Хранение данных в localStorage
   ============================================ */

const DiaryManager = {
    STORAGE_KEY: 'tarot_diary_entries',
    STREAK_KEY: 'tarot_diary_streak',
    LAST_DATE_KEY: 'tarot_diary_last_date',

    /* --- Получение всех записей --- */
    getEntries() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading diary entries:', e);
            return [];
        }
    },

    /* --- Сохранение всех записей --- */
    saveEntries(entries) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
        } catch (e) {
            console.error('Error saving diary entries:', e);
        }
    },

    /* --- Добавление новой записи --- */
    addEntry(entry) {
        const entries = this.getEntries();
        entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        entry.createdAt = new Date().toISOString();
        entry.updatedAt = entry.createdAt;
        entries.unshift(entry); // Новые записи в начало
        this.saveEntries(entries);
        this.updateStreak();
        return entry;
    },

    /* --- Обновление записи --- */
    updateEntry(id, updatedData) {
        const entries = this.getEntries();
        const index = entries.findIndex(e => e.id === id);
        if (index === -1) return null;
        entries[index] = { ...entries[index], ...updatedData, updatedAt: new Date().toISOString() };
        this.saveEntries(entries);
        return entries[index];
    },

    /* --- Удаление записи --- */
    deleteEntry(id) {
        const entries = this.getEntries();
        const filtered = entries.filter(e => e.id !== id);
        if (filtered.length === entries.length) return false;
        this.saveEntries(filtered);
        return true;
    },

    /* --- Получение одной записи --- */
    getEntry(id) {
        return this.getEntries().find(e => e.id === id) || null;
    },

    /* --- Подсчёт записей --- */
    getCount() {
        return this.getEntries().length;
    },

    /* --- Обновление streak (дней подряд) --- */
    updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = localStorage.getItem(this.LAST_DATE_KEY);
        let streak = parseInt(localStorage.getItem(this.STREAK_KEY) || '0');

        if (lastDate === today) {
            // Уже была запись сегодня
            return streak;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
            streak += 1;
        } else if (lastDate !== today) {
            streak = 1;
        }

        localStorage.setItem(this.STREAK_KEY, streak.toString());
        localStorage.setItem(this.LAST_DATE_KEY, today);
        return streak;
    },

    /* --- Получение streak --- */
    getStreak() {
        const lastDate = localStorage.getItem(this.LAST_DATE_KEY);
        if (!lastDate) return 0;

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === today || lastDate === yesterdayStr) {
            return parseInt(localStorage.getItem(this.STREAK_KEY) || '0');
        }
        // Streak broken
        localStorage.setItem(this.STREAK_KEY, '0');
        return 0;
    },

    /* --- Получение типа расклада на русском --- */
    getSpreadTypeName(type) {
        const types = {
            'daily': 'Карта дня',
            'three': 'Три карты',
            'celtic': 'Кельтский крест',
            'love': 'Расклад на любовь',
            'career': 'Расклад на карьеру',
            'custom': 'Другой'
        };
        return types[type] || type || 'Не указан';
    },

    /* --- Получение emoji настроения --- */
    getMoodEmoji(mood) {
        const moods = {
            'great': '😊',
            'good': '🙂',
            'neutral': '😐',
            'bad': '😔',
            'awful': '😢'
        };
        return moods[mood] || '';
    },

    /* --- Форматирование даты --- */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('ru-RU', options);
    },

    /* --- Рендер списка записей --- */
    renderDiaryList(container, emptyState) {
        const entries = this.getEntries();

        if (entries.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';

        container.innerHTML = entries.map(entry => {
            const cards = (entry.cards || []).map(cardId => {
                const card = window.TAROT_CARDS ? window.TAROT_CARDS.find(c => c.id === cardId) : null;
                return card ? `<span class="diary-card-badge" title="${card.name}">${card.symbol}</span>` : '';
            }).join('');

            const moodEmoji = this.getMoodEmoji(entry.mood);
            const spreadName = this.getSpreadTypeName(entry.spreadType);

            return `
                <div class="diary-entry" data-id="${entry.id}">
                    <div class="diary-entry-header">
                        <div class="diary-entry-date">
                            <span class="date-text">${this.formatDate(entry.date)}</span>
                            ${moodEmoji ? `<span class="mood-indicator">${moodEmoji}</span>` : ''}
                        </div>
                        <div class="diary-entry-type">${spreadName}</div>
                    </div>
                    ${entry.question ? `<div class="diary-entry-question">❓ ${entry.question}</div>` : ''}
                    ${cards ? `<div class="diary-entry-cards">${cards}</div>` : ''}
                    ${entry.interpretation ? `<div class="diary-entry-preview">${entry.interpretation.substring(0, 150)}${entry.interpretation.length > 150 ? '...' : ''}</div>` : ''}
                    <div class="diary-entry-actions">
                        <button class="btn btn-sm btn-outline diary-view-btn" data-id="${entry.id}">Открыть</button>
                        <button class="btn btn-sm btn-outline diary-edit-btn" data-id="${entry.id}">✏️</button>
                        <button class="btn btn-sm btn-danger diary-delete-btn" data-id="${entry.id}">🗑</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /* --- Рендер просмотра записи --- */
    renderEntryView(container, entryId) {
        const entry = this.getEntry(entryId);
        if (!entry) {
            container.innerHTML = '<p>Запись не найдена</p>';
            return;
        }

        const cards = (entry.cards || []).map(cardId => {
            const card = window.TAROT_CARDS ? window.TAROT_CARDS.find(c => c.id === cardId) : null;
            if (!card) return '';
            return `
                <div class="view-card-item" data-card-id="${card.id}">
                    <span class="view-card-symbol">${card.symbol}</span>
                    <span class="view-card-name">${card.name}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="entry-view-header">
                <h2>${this.formatDate(entry.date)} ${this.getMoodEmoji(entry.mood)}</h2>
                <span class="entry-view-type">${this.getSpreadTypeName(entry.spreadType)}</span>
            </div>
            ${entry.question ? `
                <div class="entry-view-section">
                    <h3>❓ Вопрос</h3>
                    <p>${entry.question}</p>
                </div>
            ` : ''}
            ${cards ? `
                <div class="entry-view-section">
                    <h3>🎴 Карты</h3>
                    <div class="entry-view-cards">${cards}</div>
                </div>
            ` : ''}
            ${entry.interpretation ? `
                <div class="entry-view-section">
                    <h3>📝 Интерпретация</h3>
                    <p>${entry.interpretation}</p>
                </div>
            ` : ''}
            ${entry.notes ? `
                <div class="entry-view-section">
                    <h3>💭 Заметки</h3>
                    <p>${entry.notes}</p>
                </div>
            ` : ''}
            <div class="entry-view-actions">
                <button class="btn btn-primary entry-edit-btn" data-id="${entry.id}">✏️ Редактировать</button>
                <button class="btn btn-danger entry-delete-btn" data-id="${entry.id}">🗑 Удалить</button>
            </div>
        `;
    }
};
