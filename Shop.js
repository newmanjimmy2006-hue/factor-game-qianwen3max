// Shop.js - 修正版（添加LocalStorage保护 + 优化购买逻辑同步）

class Shop {
    constructor(game) {
        this.game = game;
        
        this.products = {
            'skip_card': {
                id: 'skip_card',
                name: '跳过卡 ×3',
                description: '遇到难题？跳过它！不中断连击',
                price: 150,
                type: 'consumable',
                icon: '⏭️',
                getCount: () => 3
            },
            'double_card': {
                id: 'double_card',
                name: '双倍积分卡',
                description: '下一题得分翻倍！',
                price: 200,
                type: 'consumable',
                icon: '💎',
                getCount: () => 1
            },
            'hint_upgrade': {
                id: 'hint_upgrade',
                name: '提示升级 Lv.2',
                description: '永久解锁高级提示，显示部分答案',
                price: 500,
                type: 'permanent',
                icon: '💡',
                getCount: () => 1
            },
            'hint_upgrade_3': {
                id: 'hint_upgrade_3',
                name: '提示升级 Lv.3',
                description: '永久解锁步骤分解',
                price: 1500,
                type: 'permanent',
                icon: '🔍',
                requires: 'hint_upgrade'
            },
            'default': {
                id: 'default',
                name: 'iOS蓝白主题',
                description: '简洁清新的默认主题',
                price: 0,
                type: 'theme',
                icon: '💙',
                themeName: 'default',
                previewColor: '#007AFF',
                isDefault: true
            }
        };
        
        // 添加中国传统主题
        if (typeof CONFIG !== 'undefined' && CONFIG.THEMES) {
            Object.values(CONFIG.THEMES).forEach(theme => {
                if (theme.id !== 'default') {
                    this.products[theme.id] = {
                        id: theme.id,
                        name: theme.name + '主题',
                        description: theme.desc,
                        price: theme.price,
                        type: 'theme',
                        icon: '🎨',
                        themeName: theme.id,
                        previewColor: theme.preview,
                        themeClass: theme.class
                    };
                }
            });
        }
        
        this.purchased = {
            permanent: new Set(),
            themes: new Set(['default']),
            consumables: {},
            limited: new Set()
        };
        
        this.loadPurchaseHistory();
    }
    
    // 【新增】安全存储访问
    _safeGet(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn(`Shop: Failed to read ${key} from storage`, e);
            return defaultValue;
        }
    }
    
    _safeSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`Shop: Failed to write ${key} to storage`, e);
            return false;
        }
    }
    
    getAllProducts() {
        const totalScore = this.game ? this.game.state.totalScore : 0;
        
        return Object.values(this.products).map(product => {
            const canAfford = totalScore >= product.price;
            const isPurchased = this.isPurchased(product);
            const isAvailable = this.isAvailable(product);
            
            return {
                ...product,
                canAfford,
                isPurchased,
                isAvailable,
                disabled: !canAfford || (isPurchased && product.type !== 'consumable') || !isAvailable
            };
        });
    }
    
    getProduct(productId) {
        return this.products[productId];
    }
    
    isPurchased(product) {
        if (product.isDefault) return true;
        
        if (product.type === 'permanent') {
            return this.purchased.permanent.has(product.id);
        }
        if (product.type === 'theme') {
            return this.purchased.themes.has(product.id);
        }
        if (product.type === 'limited') {
            return this.purchased.limited.has(product.id);
        }
        if (product.type === 'consumable') {
            return false; // 消耗品可以重复购买
        }
        return false;
    }
    
    isAvailable(product) {
        // 检查依赖关系
        if (product.requires && !this.purchased.permanent.has(product.requires)) {
            return false;
        }
        if (product.seasonal) {
            // 可以添加季节检查逻辑
            return true;
        }
        return true;
    }
    
    buy(productId) {
        const product = this.products[productId];
        if (!product) {
            return { success: false, message: '商品不存在' };
        }
        
        // 非消耗品检查是否已购买
        if (product.type !== 'consumable' && this.isPurchased(product)) {
            return { success: false, message: '您已经拥有这个商品了' };
        }
        
        // 检查依赖
        if (!this.isAvailable(product)) {
            return { success: false, message: '需要先购买前置商品' };
        }
        
        const totalScore = this.game ? this.game.state.totalScore : 0;
        if (totalScore < product.price) {
            return { 
                success: false, 
                message: `积分不足！还需要 ${product.price - totalScore} 分`,
                needMore: product.price - totalScore
            };
        }
        
        const result = this.processPurchase(product);
        
        if (result.success) {
            // 扣除积分
            if (this.game) {
                this.game.state.totalScore -= product.price;
                // 确保立即保存
                if (typeof this.game.saveGameData === 'function') {
                    this.game.saveGameData();
                }
            }
            
            // 记录购买（非消耗品）
            if (product.type !== 'consumable') {
                this.recordPurchase(product);
            }
            
            // 更新徽章统计
            if (this.game && this.game.badgeSystem) {
                this.game.badgeSystem.addShopCount();
                const stats = this.game.badgeSystem.getStats();
                if (stats.unlocked >= 20) {
                    this.game.badgeSystem.unlock('collector');
                }
            }
        }
        
        return result;
    }
    
    processPurchase(product) {
        switch (product.type) {
            case 'consumable':
                if (product.id === 'skip_card') {
                    const count = product.getCount();
                    if (!this.game.items) this.game.items = {};
                    this.game.items.skipCard = (this.game.items.skipCard || 0) + count;
                    return { 
                        success: true, 
                        message: `获得 ${count} 张跳过卡`, 
                        item: 'skipCard', 
                        count: count 
                    };
                }
                if (product.id === 'double_card') {
                    const count = product.getCount();
                    if (!this.game.items) this.game.items = {};
                    this.game.items.doubleCard = (this.game.items.doubleCard || 0) + count;
                    return { 
                        success: true, 
                        message: `获得 ${count} 张双倍卡`, 
                        item: 'doubleCard', 
                        count: count 
                    };
                }
                break;
                
            case 'permanent':
                if (product.id === 'hint_upgrade') {
                    if (!this.game.items) this.game.items = {};
                    this.game.items.hintLevel = Math.max(this.game.items.hintLevel || 1, 2);
                    return { 
                        success: true, 
                        message: '提示已升级到 Lv.2', 
                        upgrade: 'hint', 
                        level: 2 
                    };
                }
                if (product.id === 'hint_upgrade_3') {
                    if (!this.game.items) this.game.items = {};
                    this.game.items.hintLevel = 3;
                    return { 
                        success: true, 
                        message: '提示已升级到 Lv.3', 
                        upgrade: 'hint', 
                        level: 3 
                    };
                }
                break;
                
            case 'theme':
                if (!this.game.unlockedThemes) this.game.unlockedThemes = [];
                if (!this.game.unlockedThemes.includes(product.themeName)) {
                    this.game.unlockedThemes.push(product.themeName);
                }
                return { 
                    success: true, 
                    message: `解锁了${product.name}`, 
                    theme: product.themeName, 
                    autoApply: false 
                };
                
            case 'limited':
                return { success: true, message: `获得${product.name}`, item: product.id };
        }
        
        return { success: false, message: '购买处理失败' };
    }
    
    recordPurchase(product) {
        switch (product.type) {
            case 'permanent':
                this.purchased.permanent.add(product.id);
                break;
            case 'theme':
                this.purchased.themes.add(product.id);
                if (this.game && this.game.unlockedThemes) {
                    if (!this.game.unlockedThemes.includes(product.themeName)) {
                        this.game.unlockedThemes.push(product.themeName);
                    }
                }
                break;
            case 'limited':
                this.purchased.limited.add(product.id);
                break;
        }
        this.savePurchaseHistory();
    }
    
    savePurchaseHistory() {
        const data = {
            permanent: Array.from(this.purchased.permanent),
            themes: Array.from(this.purchased.themes),
            limited: Array.from(this.purchased.limited),
            consumables: this.purchased.consumables
        };
        this._safeSet('factorization_shop_history', data);
        if (this.game && this.game.unlockedThemes) {
            this._safeSet('unlocked_themes', this.game.unlockedThemes);
        }
    }
    
    loadPurchaseHistory() {
        try {
            const saved = this._safeGet('factorization_shop_history');
            if (saved) {
                this.purchased.permanent = new Set(saved.permanent || []);
                this.purchased.themes = new Set(saved.themes || ['default']);
                this.purchased.limited = new Set(saved.limited || []);
                this.purchased.consumables = saved.consumables || {};
            }
            if (this.game) {
                if (!this.game.unlockedThemes) this.game.unlockedThemes = ['default'];
                if (!this.game.items) this.game.items = { skipCard: 0, doubleCard: 0, hintLevel: 1 };
                
                // 同步已解锁主题
                this.purchased.themes.forEach(themeId => {
                    const product = this.products[themeId];
                    if (product && product.themeName && !this.game.unlockedThemes.includes(product.themeName)) {
                        this.game.unlockedThemes.push(product.themeName);
                    }
                });
            }
        } catch (e) {
            console.error('加载商店数据失败:', e);
            // 使用默认空状态，确保游戏可以继续
        }
    }
    
    getCurrentScore() {
        return this.game ? this.game.state.totalScore : 0;
    }
    
    getCategories() {
        return [
            { id: 'all', name: '全部商品' },
            { id: 'functional', name: '功能道具' },
            { id: 'theme', name: '主题皮肤' },
            { id: 'limited', name: '限定物品' }
        ];
    }
    
    getProductsByCategory(categoryId) {
        const all = this.getAllProducts();
        if (categoryId === 'all') return all;
        if (categoryId === 'functional') {
            return all.filter(p => p.type === 'consumable' || p.type === 'permanent');
        }
        return all.filter(p => p.type === categoryId);
    }
    
    hasTheme(themeName) {
        const productId = Object.keys(this.products).find(key => {
            const p = this.products[key];
            return p.type === 'theme' && p.themeName === themeName;
        });
        return productId && this.purchased.themes.has(productId);
    }
    
    // 【新增】重置商店（调试用）
    reset() {
        this.purchased = {
            permanent: new Set(),
            themes: new Set(['default']),
            consumables: {},
            limited: new Set()
        };
        this._safeSet('factorization_shop_history', null);
        this._safeSet('unlocked_themes', null);
        if (this.game) {
            this.game.unlockedThemes = ['default'];
            this.game.items = { skipCard: 0, doubleCard: 0, hintLevel: 1 };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Shop;
}