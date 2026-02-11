/**
 * BadgeSystem.js - 修正版（修复hard_type_count统计 + LocalStorage保护 + 修复Random模式统计遗漏）
 */

class BadgeSystem {
    constructor() {
        this.defaultStats = this.getDefaultStats();
        this.badges = this._safeStorageGet('badges', {});
        
        const savedStats = this._safeStorageGet('badgeStats', {});
        this.stats = this.mergeStatsWithDefaults(savedStats, this.defaultStats);
        
        this.initBadges();
    }

    _safeStorageGet(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn(`Storage access failed for ${key}:`, e);
            return defaultValue;
        }
    }

    _safeStorageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`Storage write failed for ${key}:`, e);
            return false;
        }
    }

    getDefaultStats() {
        return {
            totalSolved: 0,
            totalScore: 0,
            maxStreak: 0,
            currentStreak: 0,
            avgTime: 0,
            timeSum: 0,
            methodHistory: [],
            dailyLog: [],
            frenzyCount: 0,
            shopCount: 0,
            noHintStreak: 0,
            randomStreak: 0,
            randomHardTotal: 0,
            perfectSquareCount: 0,
            nearPerfectCount: 0,
            goldenRatioCount: 0,
            largeNumberCount: 0,
            nightCorrect: 0,
            nightTotal: 0,
            varietyNumbers: [],
            dailyCounts: { 
                early: 0, 
                lunch: 0, 
                after: 0, 
                night: 0, 
                dawn: 0
            },
            methodTypes: {},
            perfectCounts: {
                easy: 0,
                medium: 0,
                hard: 0
            },
            completedLevels: {
                easy: false,
                medium: false,
                hard: false
            },
            solarProgress: {},
            hardTypeCounts: {
                type1: 0,
                type2: 0,
                type3: 0,
                type4: 0,
                type5: 0,
                type6: 0
            }
        };
    }

    mergeStatsWithDefaults(saved, defaults) {
        const merged = { ...defaults, ...saved };
        
        merged.dailyCounts = { ...defaults.dailyCounts, ...(saved.dailyCounts || {}) };
        merged.perfectCounts = { ...defaults.perfectCounts, ...(saved.perfectCounts || {}) };
        merged.completedLevels = { ...defaults.completedLevels, ...(saved.completedLevels || {}) };
        merged.methodTypes = { ...defaults.methodTypes, ...(saved.methodTypes || {}) };
        merged.solarProgress = { ...defaults.solarProgress, ...(saved.solarProgress || {}) };
        merged.hardTypeCounts = { ...defaults.hardTypeCounts, ...(saved.hardTypeCounts || {}) };
        
        if (!Array.isArray(merged.methodHistory)) merged.methodHistory = [];
        if (!Array.isArray(merged.dailyLog)) merged.dailyLog = [];
        if (!Array.isArray(merged.varietyNumbers)) merged.varietyNumbers = [];
        
        return merged;
    }

    initBadges() {
        const allBadges = [
            ...CONFIG.BADGES.basic,
            ...CONFIG.BADGES.advanced,
            ...CONFIG.BADGES.solar,
            ...CONFIG.BADGES.scenic
        ];

        allBadges.forEach(badgeDef => {
            if (!this.badges[badgeDef.id]) {
                this.badges[badgeDef.id] = {
                    id: badgeDef.id,
                    unlocked: false,
                    unlockedAt: null,
                    level: badgeDef.levelable ? 1 : undefined,
                    progress: 0
                };
            }
        });
        this.save();
    }

    save() {
        this._safeStorageSet('badges', this.badges);
        this._safeStorageSet('badgeStats', this.stats);
    }

    // 【修复】添加 validLevels 检查，防止 Random 模式统计遗漏
    updateStats(gameData) {
        const { isCorrect, time, score, level, usedHint, method, isRandom, a, b, c, factors, hardType } = gameData;
        const newBadges = [];

        if (isCorrect) {
            this.stats.totalSolved++;
            this.stats.totalScore += score;
            this.stats.currentStreak++;
            this.stats.noHintStreak = usedHint ? 0 : this.stats.noHintStreak + 1;
            this.stats.timeSum += time;
            this.stats.avgTime = this.stats.timeSum / this.stats.totalSolved;

            if (this.stats.currentStreak > this.stats.maxStreak) {
                this.stats.maxStreak = this.stats.currentStreak;
            }

            if (isRandom) {
                this.stats.randomStreak++;
                if (level === 'hard') {
                    this.stats.randomHardTotal++;
                }
            } else {
                this.stats.randomStreak = 0;
            }

            if (method) {
                this.stats.methodHistory.push(method);
                if (this.stats.methodHistory.length > 10) {
                    this.stats.methodHistory.shift();
                }
            }

            // 【关键修复】确保只有有效的难度级别才计入完美计数
            const validLevels = ['easy', 'medium', 'hard'];
            if (!usedHint && validLevels.includes(level) && this.stats.perfectCounts && this.stats.perfectCounts[level] !== undefined) {
                this.stats.perfectCounts[level]++;
            }

            if (method === 'perfect_square' || method === 'perfect_square_a') {
                this.stats.perfectSquareCount++;
            }

            if (this.isNearPerfectSquare(a, b, c)) {
                this.stats.nearPerfectCount++;
            }

            if (this.isGoldenRatio(b, c)) {
                this.stats.goldenRatioCount++;
            }

            if (Math.abs(b) > 10 || Math.abs(c) > 10) {
                this.stats.largeNumberCount++;
            }

            this.updateTimeStats();

            const hour = new Date().getHours();
            if (hour >= 18 || hour < 6) {
                this.stats.nightCorrect++;
                this.stats.nightTotal++;
            }

            this.updateVarietyNumbers(factors);
            
            this.updateSolarProgress(gameData);

            if (hardType && this.stats.hardTypeCounts) {
                const typeKey = `type${hardType}`;
                if (this.stats.hardTypeCounts[typeKey] !== undefined) {
                    this.stats.hardTypeCounts[typeKey]++;
                    console.log(`高级题型统计：${typeKey} = ${this.stats.hardTypeCounts[typeKey]}`);
                }
            }
            
        } else {
            this.stats.currentStreak = 0;
            this.stats.noHintStreak = 0;
            this.stats.randomStreak = 0;
        }

        this.checkAllBadges(gameData, newBadges);
        this.save();
        return newBadges;
    }

    isNearPerfectSquare(a, b, c) {
        const discriminant = b*b - 4*a*c;
        if (discriminant < 0) return false;
        const sqrt = Math.sqrt(discriminant);
        const rounded = Math.round(sqrt);
        return (Math.abs(sqrt - rounded) < 0.5 && rounded*rounded !== discriminant) || 
               (discriminant >= 0 && discriminant <= 5);
    }

    isGoldenRatio(b, c) {
        if (!c || c === 0) return false;
        const ratio = Math.abs(b) / Math.abs(c);
        return ratio >= 1.4 && ratio <= 2.0;
    }

    updateTimeStats() {
        const hour = new Date().getHours();
        if (!this.stats.dailyCounts) this.stats.dailyCounts = {};
        
        if (hour >= 6 && hour < 8) this.stats.dailyCounts.early++;
        else if (hour >= 12 && hour < 14) this.stats.dailyCounts.lunch++;
        else if (hour >= 16 && hour < 18) this.stats.dailyCounts.after++;
        else if (hour >= 5 && hour < 7) this.stats.dailyCounts.dawn++;
        else if (hour >= 18 || hour < 6) this.stats.dailyCounts.night++;
    }

    updateVarietyNumbers(factors) {
        if (!factors) return;
        const nums = new Set();
        factors.forEach(f => {
            nums.add(Math.abs(f[0]));
            nums.add(Math.abs(f[1]));
        });
        if (!this.stats.varietyNumbers) this.stats.varietyNumbers = [];
        this.stats.varietyNumbers.push(...Array.from(nums));
        if (this.stats.varietyNumbers.length > 20) {
            this.stats.varietyNumbers = this.stats.varietyNumbers.slice(-20);
        }
    }
    
    updateSolarProgress(gameData) {
        const now = new Date();
        
        CONFIG.BADGES.solar.forEach(badge => {
            const startDate = new Date(now.getFullYear(), badge.month - 1, badge.day);
            const endDate = new Date(startDate.getTime() + badge.duration * 24 * 60 * 60 * 1000);
            
            if (now >= startDate && now <= endDate && gameData.isCorrect) {
                let progress = this.stats.solarProgress[badge.id] || 0;
                
                switch(badge.id) {
                    case 'yushui':
                    case 'chushu':
                        if (!gameData.usedHint) progress++;
                        break;
                    case 'jingzhe':
                    case 'dongzhi':
                    case 'xiazhi':
                        if (gameData.time <= 3) progress++;
                        break;
                    case 'chunfen':
                    case 'qiufen':
                        if (gameData.method === 'perfect_square') progress++;
                        break;
                    case 'guyu':
                    case 'bailu':
                    case 'shuangjiang':
                        if (gameData.level === 'hard') progress++;
                        break;
                    case 'xiaoman':
                    case 'xiaoxue':
                        progress++;
                        break;
                    case 'dashu':
                    case 'dahan':
                        if (this.stats.currentStreak >= 10) progress++;
                        break;
                    default:
                        progress++;
                }
                
                this.stats.solarProgress[badge.id] = progress;
            }
        });
    }

    checkAllBadges(gameData, newBadges) {
        this.checkBasicBadges(gameData, newBadges);
        this.checkAdvancedBadges(gameData, newBadges);
        this.checkSolarBadges(gameData, newBadges);
        this.checkScenicBadges(gameData, newBadges);
    }

    checkBasicBadges(gameData, newBadges) {
        CONFIG.BADGES.basic.forEach(badge => {
            let shouldUnlock = false;
            const cond = badge.condition;

            switch(cond.type) {
                case 'count':
                    shouldUnlock = this.stats.totalSolved >= cond.target;
                    break;
                case 'streak':
                    shouldUnlock = this.stats.currentStreak >= cond.target || 
                                  this.stats.maxStreak >= cond.target;
                    break;
                case 'speed':
                    shouldUnlock = gameData.time <= cond.target && gameData.isCorrect;
                    break;
                case 'perfect_count':
                    if (this.stats.perfectCounts && cond.target) {
                        shouldUnlock = this.stats.perfectCounts[cond.target.level] >= cond.target.count;
                    }
                    break;
                case 'complete_any':
                    if (gameData.level === cond.target && gameData.isCorrect) {
                        if (this.stats.completedLevels) {
                            this.stats.completedLevels[cond.target] = true;
                        }
                        shouldUnlock = true;
                    }
                    break;
                case 'total_count':
                case 'total_score':
                case 'avg_speed':
                    shouldUnlock = true;
                    break;
            }

            if (shouldUnlock && this.unlockBadge(badge)) {
                newBadges.push(badge);
            }
        });
    }

    checkAdvancedBadges(gameData, newBadges) {
        CONFIG.BADGES.advanced.forEach(badge => {
            let shouldUnlock = false;
            const cond = badge.condition;

            switch(cond.type) {
                case 'method_variety':
                    const recent = this.stats.methodHistory.slice(-5);
                    shouldUnlock = recent.length >= 5 && new Set(recent).size === 5;
                    break;
                case 'no_hint_streak':
                    shouldUnlock = this.stats.noHintStreak >= cond.target;
                    break;
                case 'random_hard_total':
                    shouldUnlock = this.stats.randomHardTotal >= cond.target;
                    break;
                case 'random_streak':
                    shouldUnlock = this.stats.randomStreak >= cond.target;
                    break;
                case 'time_range':
                    const { start, end, count } = cond.target;
                    const hour = new Date().getHours();
                    if (hour >= start && hour < end && gameData.isCorrect) {
                        if (!this.stats.dailyCounts) this.stats.dailyCounts = {};
                        if (start === 6) shouldUnlock = (this.stats.dailyCounts.early || 0) >= count;
                        else if (start === 12) shouldUnlock = (this.stats.dailyCounts.lunch || 0) >= count;
                        else if (start === 16) shouldUnlock = (this.stats.dailyCounts.after || 0) >= count;
                    }
                    break;
                case 'frenzy_count':
                    shouldUnlock = this.stats.frenzyCount >= cond.target;
                    break;
                case 'shop_count':
                    shouldUnlock = this.stats.shopCount >= cond.target;
                    break;
                case 'badge_count':
                    const unlocked = Object.values(this.badges).filter(b => b.unlocked).length;
                    shouldUnlock = unlocked >= cond.target;
                    break;
                case 'hard_type_count':
                    if (cond.target && cond.target.type && cond.target.count) {
                        const typeKey = `type${cond.target.type}`;
                        const currentCount = this.stats.hardTypeCounts[typeKey] || 0;
                        shouldUnlock = currentCount >= cond.target.count;
                        if (shouldUnlock) {
                            console.log(`解锁徽章：${badge.name} (${typeKey}: ${currentCount})`);
                        }
                    }
                    break;
            }

            if (shouldUnlock && this.unlockBadge(badge)) {
                newBadges.push(badge);
            }
        });
    }

    checkSolarBadges(gameData, newBadges) {
        CONFIG.BADGES.solar.forEach(badge => {
            const progress = this.stats.solarProgress[badge.id] || 0;
            
            if (progress >= 5 && this.unlockBadge(badge)) {
                newBadges.push(badge);
            }
        });
    }

    checkScenicBadges(gameData, newBadges) {
        CONFIG.BADGES.scenic.forEach(badge => {
            let shouldUnlock = false;
            const cond = badge.condition;

            switch(cond.type) {
                case 'total_count':
                    shouldUnlock = this.stats.totalSolved >= cond.target;
                    break;
                case 'streak':
                    shouldUnlock = this.stats.maxStreak >= cond.target;
                    break;
                case 'perfect_square_count':
                    shouldUnlock = this.stats.perfectSquareCount >= cond.target;
                    break;
                case 'near_perfect':
                    shouldUnlock = this.stats.nearPerfectCount >= cond.target;
                    break;
                case 'time_range':
                    if (cond.target.start === 5) {
                        if (!this.stats.dailyCounts) this.stats.dailyCounts = {};
                        shouldUnlock = (this.stats.dailyCounts.dawn || 0) >= cond.target.count;
                    }
                    break;
                case 'large_number':
                    shouldUnlock = this.stats.largeNumberCount >= cond.target.count;
                    break;
                case 'variety_numbers':
                    const unique = [...new Set(this.stats.varietyNumbers || [])];
                    shouldUnlock = unique.length >= cond.target;
                    break;
                case 'night_accuracy':
                    if (this.stats.nightTotal > 0) {
                        const acc = this.stats.nightCorrect / this.stats.nightTotal;
                        shouldUnlock = acc >= cond.target && this.stats.nightTotal >= 5;
                    }
                    break;
                case 'golden_ratio':
                    shouldUnlock = this.stats.goldenRatioCount >= cond.target;
                    break;
                case 'collection':
                    const targets = cond.targets;
                    shouldUnlock = targets.every(id => this.badges[id]?.unlocked);
                    break;
            }

            if (shouldUnlock && this.unlockBadge(badge)) {
                newBadges.push(badge);
            }
        });
    }

    unlockBadge(badge) {
        const data = this.badges[badge.id];
        if (!data) return false;

        if (badge.levelable) {
            const progress = this.getBadgeProgress(badge);
            const newLevel = this.calculateLevel(badge, progress);
            
            if (newLevel > data.level) {
                data.level = newLevel;
                data.progress = progress;
                this.save();
                return true;
            }
            data.progress = progress;
            this.save();
            return false;
        }

        if (data.unlocked) return false;

        data.unlocked = true;
        data.unlockedAt = new Date().toISOString();

        if (Utils.audio && Utils.audio.play) Utils.audio.play('badge');
        this.save();
        return true;
    }

    unlock(badgeId) {
        const all = [
            ...CONFIG.BADGES.basic,
            ...CONFIG.BADGES.advanced,
            ...CONFIG.BADGES.solar,
            ...CONFIG.BADGES.scenic
        ];
        const badge = all.find(b => b.id === badgeId);
        if (badge) {
            const result = this.unlockBadge(badge);
            if (result) {
                return { 
                    ...badge, 
                    ...this.badges[badgeId],
                    description: badge.desc || badge.description || '暂无描述'
                };
            }
        }
        return false;
    }

    getBadgeProgress(badge) {
        switch(badge.condition.type) {
            case 'total_count': return this.stats.totalSolved;
            case 'total_score': return this.stats.totalScore;
            case 'avg_speed': return Math.max(0, 20 - this.stats.avgTime);
            default: return 0;
        }
    }

    calculateLevel(badge, progress) {
        const targets = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
        let level = 1;
        for (let i = 0; i < targets.length; i++) {
            if (progress >= targets[i]) level = i + 2;
            else break;
        }
        return level;
    }

    addFrenzy() {
        this.stats.frenzyCount++;
        this.save();
    }

    addShopCount() {
        this.stats.shopCount++;
        this.save();
    }

    getUnlockedBadges() {
        return Object.values(this.badges)
            .filter(b => b.unlocked)
            .map(b => ({ ...this.findBadgeDef(b.id), ...b }));
    }

    findBadgeDef(id) {
        const all = [
            ...CONFIG.BADGES.basic,
            ...CONFIG.BADGES.advanced,
            ...CONFIG.BADGES.solar,
            ...CONFIG.BADGES.scenic
        ];
        const def = all.find(b => b.id === id);
        if (def) {
            return {
                ...def,
                description: def.desc || def.description || '暂无描述'
            };
        }
        return null;
    }

    getWallData() {
        const cats = [
            { key: 'basic', name: '基础成就', class: 'badge-category-basic' },
            { key: 'advanced', name: '进阶挑战', class: 'badge-category-advanced' },
            { key: 'solar', name: '二十四节气', class: 'badge-category-solar' },
            { key: 'scenic', name: '5A景区', class: 'badge-category-scenic' }
        ];
        
        return cats.map(cat => ({
            name: cat.name,
            class: cat.class,
            badges: CONFIG.BADGES[cat.key].map(def => ({
                ...def,
                ...this.badges[def.id],
                description: def.desc || def.description || '暂无描述',
                icon: def.icon || '🏅'
            }))
        }));
    }

    getStats() {
        const total = Object.keys(this.badges).length;
        const unlocked = Object.values(this.badges).filter(b => b.unlocked).length;
        return { 
            total, 
            unlocked, 
            locked: total - unlocked, 
            progress: Math.round((unlocked/total)*100),
            hardTypeStats: this.stats.hardTypeCounts
        };
    }

    reset() {
        this.badges = {};
        this.stats = this.getDefaultStats();
        this.initBadges();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgeSystem;
}