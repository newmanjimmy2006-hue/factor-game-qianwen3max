// Game.js - 修正版：修复Type 5因式转换、双倍卡逻辑、提示分级

class RandomModeDifficulty {
    constructor() {
        this.CONFIG = {
            EVAL_UNIT_SIZE: 2,
            MAX_UNITS: 10,
            INITIAL_DISTRIBUTION: { medium: 100, hard: 0 },
            TARGET_DISTRIBUTION: {
                crush:   { medium: 30, hard: 70 },
                good:    { medium: 50, hard: 50 },
                average: { medium: 70, hard: 30 },
                struggle:{ medium: 100, hard: 0 }
            },
            MAX_CHANGE_PER_STEP: 20,
            HARD_MAX: 70,
            HARD_MIN: 0,
            BOSS_QUESTIONS: [16, 20]
        };

        this.state = {
            currentUnit: { answers: [], times: [], index: 1 },
            currentDistribution: { ...this.CONFIG.INITIAL_DISTRIBUTION },
            lastPerformance: null,
            questionCount: 0,
            isFinalPhase: false
        };
    }

    init() {
        this.state.currentUnit = { answers: [], times: [], index: 1 };
        this.state.currentDistribution = { ...this.CONFIG.INITIAL_DISTRIBUTION };
        this.state.lastPerformance = null;
        this.state.questionCount = 0;
        this.state.isFinalPhase = false;
        return this;
    }

    getNextDifficulty() {
        this.state.questionCount++;
        if (this.CONFIG.BOSS_QUESTIONS.includes(this.state.questionCount)) {
            return 'hard';
        }
        const dist = this.state.currentDistribution;
        const rand = Math.random() * 100;
        return rand < dist.hard ? 'hard' : 'medium';
    }

    recordAnswer(isCorrect, timeSeconds) {
        if (this.state.isFinalPhase) return;
        this.state.currentUnit.answers.push(isCorrect);
        this.state.currentUnit.times.push(timeSeconds || 999);
        
        if (this.state.currentUnit.answers.length >= this.CONFIG.EVAL_UNIT_SIZE) {
            this._evaluateAndAdjust();
        }
    }

    _evaluateAndAdjust() {
        const answers = this.state.currentUnit.answers;
        const times = this.state.currentUnit.times;
        const correctCount = answers.filter(a => a).length;
        const avgTime = times.reduce((a,b)=>a+b,0) / times.length;
        
        let performance;
        if (correctCount === 2 && avgTime < 5) performance = 'crush';
        else if (correctCount === 2) performance = 'good';
        else if (correctCount === 1) performance = 'average';
        else performance = 'struggle';
        
        const target = this.CONFIG.TARGET_DISTRIBUTION[performance];
        const current = this.state.currentDistribution;
        
        let newHard = current.hard;
        const diff = target.hard - current.hard;
        const limitedDiff = Math.max(-this.CONFIG.MAX_CHANGE_PER_STEP, 
                                    Math.min(this.CONFIG.MAX_CHANGE_PER_STEP, diff));
        newHard += limitedDiff;
        newHard = Math.max(this.CONFIG.HARD_MIN, Math.min(this.CONFIG.HARD_MAX, newHard));
        
        this.state.currentDistribution = { medium: 100 - newHard, hard: newHard };
        this.state.lastPerformance = performance;
        this.state.currentUnit.index++;
        this.state.currentUnit.answers = [];
        this.state.currentUnit.times = [];
        
        if (this.state.currentUnit.index >= this.CONFIG.MAX_UNITS) {
            this.state.isFinalPhase = true;
        }
    }

    getStatus() {
        return {
            distribution: { ...this.state.currentDistribution },
            currentUnit: this.state.currentUnit.index,
            progressInUnit: `${this.state.currentUnit.answers.length}/2`,
            questionCount: this.state.questionCount,
            isFinalPhase: this.state.isFinalPhase,
            lastPerformance: this.state.lastPerformance
        };
    }
}

class Game {
    constructor() {
        this.state = {
            isPlaying: false,
            currentQuestion: null,
            currentOptions: [],
            score: 0,
            totalScore: 0,
            streak: 0,
            maxStreak: 0,
            correctCount: 0,
            wrongCount: 0,
            totalAnswered: 0,
            startTime: null,
            level: 'easy',
            mode: 'normal',
            usedHint: false,
            doubleCardActive: false,
            questionTypes: [],
            recentBC: [],
            usedQuestions: new Set(),
            sessionHistory: []
        };

        this.items = { skipCard: 0, doubleCard: 0, hintLevel: 1 };
        this.hardTypeState = { lastTypes: [], type6Count: 0, totalHard: 0 };
        this.badgeSystem = null;
        this.shop = null;
        this.randomDifficulty = new RandomModeDifficulty();
        this.startTime = 0;
        this.questionStartTime = 0;
        this.timerInterval = null;
    }

    init(badgeSystem, shop) {
        this.badgeSystem = badgeSystem;
        this.shop = shop;
        this.loadGameData();
        return this;
    }

    on(event, callback) {
        this.callbacks = this.callbacks || {};
        this.callbacks[event] = callback;
        return this;
    }

    startGame(level = 'easy', mode = 'normal') {
        const validLevels = ['easy', 'medium', 'hard'];
        if (!validLevels.includes(level)) level = 'easy';
        
        this.state.isPlaying = true;
        this.state.level = level;
        this.state.mode = mode;
        this.state.score = 0;
        this.state.streak = 0;
        this.state.correctCount = 0;
        this.state.wrongCount = 0;
        this.state.totalAnswered = 0;
        this.state.questionTypes = [];
        this.state.recentBC = [];
        this.state.usedQuestions.clear();
        this.state.sessionHistory = [];
        this.state.usedHint = false;
        this.state.doubleCardActive = false;
        
        this.hardTypeState = { lastTypes: [], type6Count: 0, totalHard: 0 };
        this.startTime = Date.now();
        this.questionStartTime = Date.now();
        this.startTimer();
        
        if (mode === 'random') {
            this.randomDifficulty.init();
        }
        
        this.nextQuestion();
        return this;
    }

    generateRealtimeQuestion(level) {
        if (level === 'easy') {
            const presets = CONFIG.PRESETS.easy;
            const available = presets.filter(p => 
                !this.state.usedQuestions.has(`${p.a},${p.b},${p.c}`)
            );
            
            if (available.length > 0) {
                const shuffled = Utils.shuffle([...available]);
                const selected = shuffled[0];
                this.state.usedQuestions.add(`${selected.a},${selected.b},${selected.c}`);
                this.state.recentBC.push({ b: Math.abs(selected.b), c: Math.abs(selected.c) });
                if (this.state.recentBC.length > 5) this.state.recentBC.shift();
                return selected;
            }
        }
        
        let questionData = null;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            if (level === 'hard') {
                questionData = this._generateHardQuestion();
            } else if (level === 'medium') {
                questionData = this._generateMediumQuestion();
            } else {
                questionData = this._generateEasyQuestion();
            }
            
            if (!questionData) continue;
            
            const qid = `${questionData.a},${questionData.b},${questionData.c}`;
            if (this.state.usedQuestions.has(qid)) continue;
            if (this._isTooSimilar(questionData)) continue;
            
            this.state.usedQuestions.add(qid);
            this.state.recentBC.push({ b: Math.abs(questionData.b), c: Math.abs(questionData.c) });
            if (this.state.recentBC.length > 5) this.state.recentBC.shift();
            
            return questionData;
        }
        return this._generateFallbackQuestion(level);
    }

    _generateEasyQuestion() {
        const isSimple = Math.random() < 0.7;
        const bRange = isSimple ? [1, 12] : [13, 20];
        const cRange = isSimple ? [1, 20] : [1, 36];
        
        const e1 = Utils.randomInt(-cRange[1], cRange[1]);
        const e2 = Utils.randomInt(-cRange[1], cRange[1]);
        if (e1 * e2 === 0) return null;
        
        const b = e1 + e2;
        if (Math.abs(b) > bRange[1] || Math.abs(b) < bRange[0]) return null;
        
        const c = e1 * e2;
        if (Math.abs(c) > cRange[1]) return null;
        
        return {
            a: 1, b: b, c: c,
            factors: [[1, e1], [1, e2]],
            method: this._classifyMethod(1, b, c),
            level: 'easy'
        };
    }

    _generateMediumQuestion() {
        const a = Utils.randomInt(2, 6);
        const aFactors = this._factorize(a);
        const [d1, d2] = aFactors[Math.floor(Math.random() * aFactors.length)];
        
        const e1 = Utils.randomInt(-8, 8);
        const e2 = Utils.randomInt(-8, 8);
        if (e1 === 0 || e2 === 0) return null;
        
        const b = d1 * e2 + d2 * e1;
        const c = e1 * e2;
        
        if (Math.abs(b) > 50 || Math.abs(c) > 100) return null;
        
        return {
            a, b, c,
            factors: [[d1, e1], [d2, e2]],
            method: 'standard_cross',
            level: 'medium'
        };
    }

    _generateHardQuestion() {
        const type = this._getHardTypeByRotation();
        this.hardTypeState.totalHard++;
        if (type === 6) this.hardTypeState.type6Count++;
        
        let data;
        switch(type) {
            case 1: data = this._generateType1_LargeCoeff(); break;
            case 2: data = this._generateType2_Negative(); break;
            case 3: data = this._generateType3_NearPerfect(); break;
            case 4: data = this._generateType4_Prime(); break;
            case 5: data = this._generateType5_Substitution(); break;
            case 6: data = this._generateType6_GCD(); break;
        }
        
        if (data) {
            data.hardType = type;
            data.level = 'hard';
        }
        return data;
    }

    _getHardTypeByRotation() {
        const availableTypes = [1, 2, 3, 4, 5, 6];
        const filtered = availableTypes.filter(t => !this.hardTypeState.lastTypes.includes(t));
        const candidates = filtered.length > 0 ? filtered : availableTypes;
        
        const type6Ratio = this.hardTypeState.totalHard > 0 ? 
            this.hardTypeState.type6Count / this.hardTypeState.totalHard : 0;
        
        let selected;
        if (type6Ratio < 0.20 && candidates.includes(6)) {
            selected = 6;
        } else if (type6Ratio > 0.25 && candidates.length > 1) {
            const non6 = candidates.filter(t => t !== 6);
            selected = non6[Math.floor(Math.random() * non6.length)];
        } else {
            selected = candidates[Math.floor(Math.random() * candidates.length)];
        }
        
        this.hardTypeState.lastTypes.push(selected);
        if (this.hardTypeState.lastTypes.length > 3) {
            this.hardTypeState.lastTypes.shift();
        }
        return selected;
    }

    _generateType1_LargeCoeff() {
        const a = Utils.randomInt(7, 12);
        const aFactors = this._factorize(a);
        const [d1, d2] = aFactors[Math.floor(Math.random() * aFactors.length)];
        
        const e1 = Utils.randomInt(-15, 15);
        const e2 = Utils.randomInt(-15, 15);
        if (e1 === 0 || e2 === 0) return null;
        
        const b = d1 * e2 + d2 * e1;
        const c = e1 * e2;
        
        if (Math.abs(b) > 60 || Math.abs(c) > 150) return null;
        
        return { a, b, c, factors: [[d1, e1], [d2, e2]], method: 'type1_large' };
    }

    _generateType2_Negative() {
        const isLeadingNegative = Math.random() < 0.5;
        const base = this._generateMediumQuestion() || this._generateType1_LargeCoeff();
        if (!base) return null;
        
        if (isLeadingNegative) {
            base.a = -base.a;
            base.factors = [[-base.factors[0][0], -base.factors[0][1]], base.factors[1]];
            base.b = -base.b;
        } else {
            if (base.b * base.c > 0) {
                base.c = -base.c;
                base.factors[1][1] = -base.factors[1][1];
            }
        }
        base.method = 'type2_negative';
        return base;
    }

    _generateType3_NearPerfect() {
        let attempts = 0;
        while (attempts < 20) {
            attempts++;
            const a = Utils.randomInt(2, 6);
            const b = Utils.randomInt(5, 20);
            const perfectC = (b * b) / (4 * a);
            const offset = Utils.randomInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
            const c = Math.round(perfectC) + offset;
            
            if (c === 0) continue;
            const disc = b*b - 4*a*c;
            if (disc < 0) continue;
            
            const sqrt = Math.sqrt(disc);
            if (sqrt === Math.floor(sqrt) && disc !== 0) {
                return { a, b, c, method: 'type3_near_perfect', factors: this._factorizeQuadratic(a,b,c) };
            }
        }
        return null;
    }

    _generateType4_Prime() {
        const primes = [11, 13, 17, 19];
        const a = primes[Math.floor(Math.random() * primes.length)];
        const e1 = Utils.randomInt(-12, 12);
        const e2 = Utils.randomInt(-12, 12);
        if (e1 === 0 || e2 === 0) return null;
        
        const b = a * e2 + 1 * e1;
        const c = e1 * e2;
        
        return { 
            a, b, c, 
            factors: [[a, e1], [1, e2]], 
            method: 'type4_prime' 
        };
    }

    // 【关键修复】Type 5：正确实现换元法，从 y 因式推导出 x 因式
    _generateType5_Substitution() {
        // 换元结构：令 y = x + k，构造关于 y 的简单因式，再转换回 x
        const k = Utils.randomInt(1, 5);
        
        // 随机生成关于 y 的因式系数 (d1*y + e1)(d2*y + e2)
        const d1 = Utils.randomInt(1, 3);
        const d2 = Utils.randomInt(1, 3);
        const a = d1 * d2;  // 二次项系数保持不变
        
        // 随机生成常数项（确保非零且合理，避免过于简单的对称情况）
        let e1 = Utils.randomInt(-6, 6);
        let e2 = Utils.randomInt(-6, 6);
        if (e1 === 0) e1 = 1;
        if (e2 === 0) e2 = -1;  // 避免两个都为正/负导致过于简单
        
        // 关于 y 的多项式系数：ay² + b_y*y + c_y
        const b_y = d1 * e2 + d2 * e1;
        const c_y = e1 * e2;
        
        // 转换回 x：将 y = x + k 代入
        // 原式 = a(x+k)² + b_y(x+k) + c_y
        // 展开：a(x²+2kx+k²) + b_y*x + b_y*k + c_y
        //      = ax² + (2ak + b_y)x + (ak² + b_y*k + c_y)
        const b = 2 * a * k + b_y;
        const c = a * k * k + b_y * k + c_y;
        
        // 将 y 因式转换为 x 因式：(d*y + e) → d(x+k) + e = d*x + (dk + e)
        const xFactor1 = [d1, d1 * k + e1];
        const xFactor2 = [d2, d2 * k + e2];
        
        // 验证：确保转换后的因式相乘确实等于目标多项式
        const checkA = xFactor1[0] * xFactor2[0];
        const checkB = xFactor1[0] * xFactor2[1] + xFactor2[0] * xFactor1[1];
        const checkC = xFactor1[1] * xFactor2[1];
        
        if (checkA !== a || checkB !== b || checkC !== c) {
            console.warn('Type 5 生成验证失败，重新生成');
            return null;  // 验证失败则返回null，外层会重试
        }
        
        return {
            a, b, c,
            factors: [xFactor1, xFactor2],
            yFactors: [[d1, e1], [d2, e2]],  // 保留用于提示显示
            substitution: { k, b_y, c_y },   // 记录中间值供提示使用
            method: 'type5_substitution',
            level: 'hard'
        };
    }

    _generateType6_GCD() {
        let base;
        if (Math.random() < 0.5) {
            base = this._generateMediumQuestion();
        } else {
            base = this._generateEasyQuestion();
        }
        if (!base) return null;
        
        const k = Utils.randomInt(2, 6);
        const scheme = Math.random() < 0.5 ? 'A' : 'B';
        
        const [f1, f2] = base.factors;
        let nakedFactor, gcdFactor;
        
        if (scheme === 'A') {
            nakedFactor = [...f1];
            gcdFactor = [f2[0] * k, f2[1] * k];
        } else {
            gcdFactor = [f1[0] * k, f1[1] * k];
            nakedFactor = [...f2];
        }
        
        return {
            a: base.a * k,
            b: base.b * k,
            c: base.c * k,
            factors: [nakedFactor, gcdFactor],
            baseFactors: [f1, f2],
            gcd: k,
            scheme: scheme,
            method: 'type6_gcd',
            level: 'hard'
        };
    }

    _factorize(n) {
        const factors = [];
        for (let i = 1; i <= Math.sqrt(n); i++) {
            if (n % i === 0) {
                factors.push([i, n/i]);
                if (i !== n/i) factors.push([n/i, i]);
            }
        }
        return factors;
    }

    _factorizeQuadratic(a, b, c) {
        const disc = b*b - 4*a*c;
        const sqrt = Math.sqrt(disc);
        const x1 = (-b + sqrt) / (2*a);
        const x2 = (-b - sqrt) / (2*a);
        return [[a, Math.round(-a*x1)], [1, Math.round(-x2)]];
    }

    _classifyMethod(a, b, c) {
        if (a === 1 && b*b === 4*c && c > 0) return 'perfect_square';
        if (b === 0 && c < 0) return 'square_diff';
        if (a === 1) {
            if (b > 0 && c > 0) return 'positive';
            if (b < 0 && c > 0) return 'negative_both';
            if (c < 0) return 'negative_c';
        }
        return 'normal';
    }

    _isTooSimilar(q) {
        const recent = this.state.sessionHistory.slice(-3);
        return recent.some(h => h.a === q.a && h.b === q.b && h.c === q.c);
    }

    _generateFallbackQuestion(level) {
        const fallbacks = {
            easy: [
                { a: 1, b: 5, c: 6, factors: [[1, 2], [1, 3]], method: 'fallback', level: 'easy' },
                { a: 1, b: -5, c: 6, factors: [[1, -2], [1, -3]], method: 'fallback', level: 'easy' },
                { a: 1, b: 5, c: -6, factors: [[1, 6], [1, -1]], method: 'fallback', level: 'easy' },
                { a: 1, b: -7, c: 12, factors: [[1, -3], [1, -4]], method: 'fallback', level: 'easy' },
                { a: 1, b: 8, c: 15, factors: [[1, 3], [1, 5]], method: 'fallback', level: 'easy' },
                { a: 1, b: -8, c: 15, factors: [[1, -3], [1, -5]], method: 'fallback', level: 'easy' },
                { a: 1, b: 7, c: 12, factors: [[1, 3], [1, 4]], method: 'fallback', level: 'easy' }
            ],
            medium: [
                { a: 2, b: 5, c: 3, factors: [[2, 3], [1, 1]], method: 'fallback', level: 'medium' },
                { a: 2, b: -5, c: 3, factors: [[2, -3], [1, -1]], method: 'fallback', level: 'medium' },
                { a: 3, b: 10, c: 3, factors: [[3, 1], [1, 3]], method: 'fallback', level: 'medium' },
                { a: 3, b: -10, c: 3, factors: [[3, -1], [1, -3]], method: 'fallback', level: 'medium' }
            ],
            hard: [
                { a: 6, b: 5, c: -6, factors: [[3, 3], [2, -2]], method: 'fallback', level: 'hard' },
                { a: 7, b: 8, c: 1, factors: [[7, 1], [1, 1]], method: 'fallback', level: 'hard' },
                { a: 6, b: -5, c: -6, factors: [[3, -3], [2, 2]], method: 'fallback', level: 'hard' }
            ]
        };
        
        const levelFallbacks = fallbacks[level] || fallbacks.easy;
        const index = this.state.totalAnswered % levelFallbacks.length;
        return levelFallbacks[index];
    }

    nextQuestion() {
        if (!this.state.isPlaying) return;
        
        if (this.state.totalAnswered >= 20) {
            this.endGame();
            return;
        }
        
        let actualLevel = this.state.level;
        if (this.state.mode === 'random') {
            actualLevel = this.randomDifficulty.getNextDifficulty();
        }
        
        const questionData = this.generateRealtimeQuestion(actualLevel);
        if (!questionData) {
            this.endGame();
            return;
        }
        
        this.state.currentQuestion = new Question(questionData);
        this.state.currentOptions = this.state.currentQuestion.generateOptions(actualLevel);
        
        if (!this.state.currentOptions || this.state.currentOptions.length === 0) {
            this.nextQuestion();
            return;
        }
        
        this.questionStartTime = Date.now();
        this.state.usedHint = false;
        this.state.totalAnswered++;
        
        this.state.sessionHistory.push({
            a: questionData.a,
            b: questionData.b,
            c: questionData.c,
            type: questionData.method,
            hardType: questionData.hardType
        });
        
        if (this.callbacks && this.callbacks.onQuestionUpdate) {
            this.callbacks.onQuestionUpdate({
                question: this.state.currentQuestion,
                options: this.state.currentOptions,
                progress: {
                    current: this.state.totalAnswered,
                    total: 20
                },
                randomStatus: this.state.mode === 'random' ? this.randomDifficulty.getStatus() : null
            });
        }
    }

    handleAnswer(selectedTexts) {
        if (!this.state.isPlaying || !this.state.currentQuestion) {
            return { success: false, message: '游戏未开始' };
        }
        
        const question = this.state.currentQuestion;
        const isCorrect = question.checkAnswer(selectedTexts);
        const answerTime = (Date.now() - this.questionStartTime) / 1000;
        
        if (this.state.mode === 'random') {
            this.randomDifficulty.recordAnswer(isCorrect, answerTime);
        }
        
        if (isCorrect) {
            return this._handleCorrect(answerTime, question);
        } else {
            return this._handleWrong();
        }
    }

    _handleCorrect(time, question) {
        this.state.streak++;
        if (this.state.streak > this.state.maxStreak) {
            this.state.maxStreak = this.state.streak;
        }
        this.state.correctCount++;
        
        const earned = this._calculateScore(time, question);
        this.state.score += earned;
        
        // 修复：触发UI更新
        if (this.callbacks && this.callbacks.onScoreUpdate) {
            this.callbacks.onScoreUpdate({
                score: this.state.score,
                totalScore: this.state.totalScore + this.state.score,
                streak: this.state.streak
            });
        }
        
        if (this.badgeSystem) {
            const newBadges = this.badgeSystem.updateStats({
                isCorrect: true,
                time: time,
                score: earned,
                level: question.level,
                usedHint: this.state.usedHint,
                method: question.method,
                isRandom: this.state.mode === 'random',
                a: question.a,
                b: question.b,
                c: question.c,
                factors: question.factors,
                hardType: question.hardType
            });
            
            if (newBadges && newBadges.length > 0 && this.callbacks.onBadgeUnlock) {
                newBadges.forEach(badge => this.callbacks.onBadgeUnlock(badge));
            }
        }
        
        return {
            success: true,
            correct: true,
            earned: earned,
            streak: this.state.streak
        };
    }

    _handleWrong() {
        this.state.streak = 0;
        this.state.wrongCount++;
        
        if (this.badgeSystem) {
            this.badgeSystem.updateStats({
                isCorrect: false,
                level: this.state.currentQuestion.level
            });
        }
        
        return { success: true, correct: false, streak: 0 };
    }

    _calculateScore(time, question) {
        let base = question.level === 'hard' ? 30 : question.level === 'medium' ? 20 : 10;
        
        if (time < 3) base *= 1.5;
        else if (time < 5) base *= 1.2;
        else if (time < 8) base *= 1.1;
        
        if (this.state.streak >= 10) base *= 1.3;
        else if (this.state.streak >= 5) base *= 1.2;
        else if (this.state.streak >= 3) base *= 1.1;
        
        if (!this.state.usedHint) base *= 1.1;
        
        if (this.state.doubleCardActive) {
            base *= 2;
            this.state.doubleCardActive = false;
            if (this.callbacks && this.callbacks.onDoubleCardUsed) {
                this.callbacks.onDoubleCardUsed();
            }
        }
        
        return Math.round(base);
    }

    useSkip() {
        if (this.items.skipCard <= 0) return { success: false, message: '无跳过卡' };
        this.items.skipCard--;
        this.saveGameData();
        this.nextQuestion();
        return { success: true, message: '已跳过' };
    }

    useHint() {
        if (this.state.usedHint) return { success: false, message: '已使用提示' };
        this.state.usedHint = true;
        
        const q = this.state.currentQuestion;
        let hintText = q.hint;
        let detailedHint = null;
        
        if (this.items.hintLevel >= 2) {
            if (q.method === 'type6_gcd') {
                detailedHint = `提示：先提取公因数${q.gcd}，剩余部分为 ${Utils.formatExpression(q.a/q.gcd, q.b/q.gcd, q.c/q.gcd)}`;
            } else if (q.a === 1) {
                detailedHint = `提示：寻找两数，和为${q.b}，积为${q.c}。其中一个因式可能是 (x ${q.factors[0][1] >= 0 ? '+' : ''}${q.factors[0][1]})`;
            } else {
                detailedHint = `提示：${q.a}可分解为${q.factors[0][0]}×${q.factors[1][0]}，尝试十字相乘`;
            }
        }
        
        if (this.items.hintLevel >= 3) {
            if (q.method === 'type6_gcd') {
                detailedHint += `\n步骤：1. 提取${q.gcd}得 ${q.gcd}(${Utils.formatExpression(q.a/q.gcd, q.b/q.gcd, q.c/q.gcd)})\n2. 对括号内分解得 (${Question.formatFactor(q.baseFactors[0])})(${Question.formatFactor(q.baseFactors[1])})`;
            }
        }
        
        return { 
            success: true, 
            hint: hintText,
            detailedHint: detailedHint,
            level: this.items.hintLevel 
        };
    }

    activateDoubleCard() {
        if (this.items.doubleCard <= 0) return { success: false, message: '无双倍卡' };
        if (this.state.doubleCardActive) return { success: false, message: '双倍卡已激活' };
        
        this.items.doubleCard--;
        this.state.doubleCardActive = true;
        this.saveGameData();
        return { success: true, message: '双倍卡已激活，下一题得分×2！' };
    }

    endGame() {
        this.state.isPlaying = false;
        this.stopTimer();
        this.state.totalScore += this.state.score;
        this.saveGameData();
        
        if (this.callbacks && this.callbacks.onGameEnd) {
            this.callbacks.onGameEnd({
                score: this.state.score,
                totalScore: this.state.totalScore,
                correct: this.state.correctCount,
                wrong: this.state.wrongCount,
                level: this.state.level
            });
        }
    }

    quitGame() { this.endGame(); }
    
    saveGameData() {
        const data = {
            totalScore: this.state.totalScore,
            items: this.items,
            maxStreak: this.state.maxStreak
        };
        localStorage.setItem('factorization_game_data', JSON.stringify(data));
    }
    
    loadGameData() {
        try {
            const saved = localStorage.getItem('factorization_game_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.state.totalScore = data.totalScore || 0;
                this.items = data.items || { skipCard: 0, doubleCard: 0, hintLevel: 1 };
                this.state.maxStreak = data.maxStreak || 0;
            }
        } catch(e) {}
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.state.isPlaying) return;
            const elapsed = Math.floor((Date.now() - this.questionStartTime) / 1000);
            const totalElapsed = Math.floor((Date.now() - this.startTime) / 1000);
            if (this.callbacks && this.callbacks.onTimeUpdate) {
                this.callbacks.onTimeUpdate({ 
                    question: elapsed,
                    total: totalElapsed
                });
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    getState() { return this.state; }
    getItems() { return this.items; }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, RandomModeDifficulty };
}