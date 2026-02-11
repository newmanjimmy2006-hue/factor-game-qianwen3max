// app.js - 修正版（修复主题切换类名覆盖 + 实现疲劳度系统）

// 全局变量
let game = null;
let shop = null;
let badgeSystem = null;
let scratchpad = null;
let audioInitialized = false;
let recentBadges = [];
let currentThemeId = 'default';

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('current_theme') || 'default';
    currentThemeId = savedTheme;
    applyTheme(savedTheme);
}

// 【关键修复】应用主题 - 不再覆盖所有className
function applyTheme(themeId) {
    const theme = CONFIG.THEMES[themeId];
    if (!theme) return;
    
    // 移除所有主题类（保留其他功能性类名）
    const bodyClasses = document.body.className.split(' ').filter(cls => {
        // 保留非主题类（不以theme-开头，且不是主题相关类）
        return !cls.startsWith('theme-') && cls !== '' && cls !== 'default';
    });
    
    // 添加新主题类（如果有）
    if (theme.class && theme.class !== '') {
        bodyClasses.push(theme.class);
    }
    
    // 重新设置className（保留原有功能性类）
    document.body.className = bodyClasses.join(' ');
    
    currentThemeId = themeId;
    localStorage.setItem('current_theme', themeId);
    
    // 设置CSS变量
    const root = document.documentElement;
    if (themeId !== 'default') {
        const themeColors = getThemeColors(themeId);
        root.style.setProperty('--theme-primary', themeColors.primary);
        root.style.setProperty('--theme-bg', themeColors.bg);
    } else {
        // 恢复默认变量
        root.style.setProperty('--theme-primary', '#007AFF');
        root.style.setProperty('--theme-bg', 'linear-gradient(180deg, #F5F5F7 0%, #E8E8ED 100%)');
    }
    
    console.log(`主题已切换：${theme.name}`);
}

function getThemeColors(themeId) {
    const colors = {
        yanzhi: { primary: '#9D2933', bg: 'linear-gradient(180deg, #FDF2F2 0%, #FCE7E7 100%)' },
        ningyezi: { primary: '#4A2C6A', bg: 'linear-gradient(180deg, #F3F0F7 0%, #E8E3F0 100%)' },
        zhuozhuo: { primary: '#E86F8A', bg: 'linear-gradient(180deg, #FDF2F5 0%, #FCE8EE 100%)' },
        lvyi: { primary: '#2D5A4A', bg: 'linear-gradient(180deg, #F0F7F4 0%, #E3F0EA 100%)' },
        qingqing: { primary: '#2B4A6F', bg: 'linear-gradient(180deg, #F2F5F8 0%, #E5EBF2 100%)' },
        danxin: { primary: '#C41E3A', bg: 'linear-gradient(180deg, #FDF5F5 0%, #FCE8EB 100%)' },
        jiangbi: { primary: '#1E4A5A', bg: 'linear-gradient(180deg, #F0F6F7 0%, #E3EEF0 100%)' },
        yejing: { primary: '#2D2D3A', bg: 'linear-gradient(180deg, #E8E8EB 0%, #D8D8DD 100%)' },
        zhuque: { primary: '#B7410E', bg: 'linear-gradient(180deg, #FDF8F5 0%, #FCEEE8 100%)' }
    };
    return colors[themeId] || { primary: '#007AFF', bg: 'linear-gradient(180deg, #F5F5F7 0%, #E8E8ED 100%)' };
}

// 显示浮动文字
function showFloatText(text, color) {
    const popup = document.createElement('div');
    popup.textContent = text;
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 36px;
        font-weight: bold;
        color: ${color || 'var(--theme-primary)'};
        pointer-events: none;
        z-index: 9999;
        animation: floatUp 0.8s ease-out forwards;
    `;
    document.body.appendChild(popup);
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 800);
}

// 重置选项UI
function resetOptionsUI() {
    document.querySelectorAll('.slot').forEach(slot => {
        slot.innerHTML = '<span class="slot-placeholder">?</span>';
        slot.classList.remove('filled', 'correct', 'wrong');
        slot.style.borderColor = '';
        slot.style.background = '';
    });
    
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'filled');
        opt.removeAttribute('data-selected');
        opt.style.background = '';
        opt.style.borderColor = '';
        opt.disabled = false;
        opt.style.pointerEvents = '';
        opt.style.opacity = '';
    });
}

// 显示徽章通知
function showBadgeNotification(badge) {
    const modal = document.createElement('div');
    modal.className = 'badge-modal';
    modal.innerHTML = `
        <div class="badge-content" style="
            background: white;
            border: 2px solid var(--theme-primary);
            border-radius: 16px;
            padding: 24px 32px;
            text-align: center;
            box-shadow: 0 0 30px var(--theme-glow);
            animation: badgePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ">
            <div class="badge-icon" style="font-size: 48px; margin-bottom: 8px;">${badge.icon || '🏆'}</div>
            <div class="badge-name" style="
                font-size: 18px; 
                font-weight: bold; 
                color: var(--theme-primary);
                margin-bottom: 4px;
            ">解锁徽章：${badge.name}</div>
            <div class="badge-desc" style="
                font-size: 13px; 
                color: var(--theme-text-secondary);
            ">${badge.description || badge.desc || ''}</div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }, 2500);
    
    modal.addEventListener('click', () => modal.remove());
}

// 更新最近获得徽章
function updateRecentBadges(badge) {
    const exists = recentBadges.find(b => b.id === badge.id);
    if (exists) return;
    
    recentBadges.unshift(badge);
    if (recentBadges.length > 3) recentBadges.pop();
    
    renderRecentBadges();
}

// 渲染最近获得徽章
function renderRecentBadges() {
    const container = document.getElementById('recent-badges');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (recentBadges.length === 0) {
        container.innerHTML = `
            <div style="width: 100%; text-align: center; color: var(--theme-text-secondary); font-size: 11px; padding: 8px;">
                还没有获得徽章，开始挑战吧！
            </div>
        `;
        return;
    }
    
    recentBadges.forEach((badge, index) => {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'badge-item unlocked';
        badgeEl.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            cursor: pointer;
            animation: slideIn 0.3s ease ${index * 0.1}s both;
        `;
        badgeEl.textContent = badge.icon || '🏆';
        badgeEl.title = `${badge.name}: ${badge.description || badge.desc || '暂无描述'}`;
        badgeEl.addEventListener('click', () => showBadgeDetail(badge));
        container.appendChild(badgeEl);
    });
}

function showBadgeDetail(badge) {
    showToast(`${badge.icon} ${badge.name}: ${badge.description || badge.desc || '暂无描述'}`, 'info');
}

// 渲染徽章墙
function renderBadgesWall(categories) {
    const container = document.getElementById('wall-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 计算统计数据
    let totalBadges = 0;
    let unlockedBadges = 0;
    categories.forEach(cat => {
        totalBadges += cat.badges.length;
        unlockedBadges += cat.badges.filter(b => b.unlocked).length;
    });
    
    // 添加统计信息
    const statsDiv = document.createElement('div');
    statsDiv.className = 'wall-stats';
    statsDiv.innerHTML = `
        <div class="wall-stat">
            <span class="wall-stat-value">${unlockedBadges}</span>
            <span class="wall-stat-label">已解锁</span>
        </div>
        <div class="wall-stat">
            <span class="wall-stat-value">${totalBadges}</span>
            <span class="wall-stat-label">总数</span>
        </div>
        <div class="wall-stat">
            <span class="wall-stat-value">${Math.round(unlockedBadges / totalBadges * 100)}%</span>
            <span class="wall-stat-label">完成度</span>
        </div>
    `;
    container.appendChild(statsDiv);
    
    // 渲染徽章分类
    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = `wall-category ${cat.class}`;
        section.innerHTML = `<h4>${cat.icon || '📦'} ${cat.name}</h4>`;
        
        const grid = document.createElement('div');
        grid.className = 'wall-grid';
        
        cat.badges.forEach(badge => {
            const badgeEl = document.createElement('div');
            badgeEl.className = `wall-badge ${badge.unlocked ? 'unlocked' : ''}`;
            badgeEl.innerHTML = `
                <div class="wall-badge-icon">${badge.icon}</div>
                <div class="wall-badge-name">${badge.name}</div>
                ${badge.level > 1 ? `<span class="badge-level">Lv.${badge.level}</span>` : ''}
            `;
            const desc = badge.description || badge.desc || '暂无描述';
            badgeEl.title = badge.unlocked ? `${badge.name}: ${desc}` : `🔒 未解锁：${desc}`;
            
            // 点击已解锁徽章显示详情
            if (badge.unlocked) {
                badgeEl.addEventListener('click', () => {
                    showToast(`${badge.icon} ${badge.name}: ${desc}`, 'info');
                });
            }
            
            grid.appendChild(badgeEl);
        });
        
        section.appendChild(grid);
        container.appendChild(section);
    });
}

// 更新消耗品数量
function updateItemCounts() {
    if (!game) return;
    const items = game.getItems();
    const skipEl = document.getElementById('skip-count');
    const doubleEl = document.getElementById('double-count');
    const skipBtn = document.getElementById('btn-use-skip');
    const doubleBtn = document.getElementById('btn-use-double');
    
    if (skipEl) {
        skipEl.textContent = items.skipCard || 0;
        skipEl.style.display = (items.skipCard || 0) > 0 ? 'block' : 'none';
    }
    if (doubleEl) {
        doubleEl.textContent = items.doubleCard || 0;
        doubleEl.style.display = (items.doubleCard || 0) > 0 ? 'block' : 'none';
    }
    
    if (skipBtn) skipBtn.disabled = (items.skipCard || 0) <= 0;
    if (doubleBtn) doubleBtn.disabled = (items.doubleCard || 0) <= 0;
}

// 初始化商店UI
function initShopUI() {
    const shopToggle = document.getElementById('shop-toggle');
    const shopPanel = document.getElementById('shop-panel');
    if (!shopToggle || !shopPanel) return;
    
    shopToggle.addEventListener('click', () => {
        const isHidden = shopPanel.hidden;
        if (isHidden) {
            // 显示商店
            shopPanel.hidden = false;
            shopPanel.classList.remove('hiding');
            shopPanel.classList.add('showing');
            renderShop();
        } else {
            // 隐藏商店
            shopPanel.classList.remove('showing');
            shopPanel.classList.add('hiding');
            setTimeout(() => {
                shopPanel.hidden = true;
                shopPanel.classList.remove('hiding');
            }, 300);
        }
    });
    
    shopPanel.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            shopPanel.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderShop();
        });
    });
    
    document.addEventListener('click', (e) => {
        if (!shopPanel.hidden && !shopPanel.contains(e.target) && !shopToggle.contains(e.target)) {
            shopPanel.classList.remove('showing');
            shopPanel.classList.add('hiding');
            setTimeout(() => {
                shopPanel.hidden = true;
                shopPanel.classList.remove('hiding');
            }, 300);
        }
    });
    
    const closeBtn = document.getElementById('shop-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            shopPanel.classList.remove('showing');
            shopPanel.classList.add('hiding');
            setTimeout(() => {
                shopPanel.hidden = true;
                shopPanel.classList.remove('hiding');
            }, 300);
        });
    }
}

// 渲染商店
function renderShop() {
    const shopPanel = document.getElementById('shop-panel');
    if (!shop || !shopPanel) return;
    
    const activeTab = shopPanel.querySelector('.shop-tab.active')?.dataset.tab || 'functional';
    const currentScore = shop.getCurrentScore ? shop.getCurrentScore() : 0;
    
    const pointsDisplay = document.getElementById('shop-points');
    if (pointsDisplay) pointsDisplay.textContent = currentScore;
    
    const contentContainer = document.getElementById('shop-content');
    if (!contentContainer) return;
    contentContainer.innerHTML = '';
    
    let allProducts = shop.getAllProducts ? shop.getAllProducts() : [];
    
    const filteredProducts = allProducts.filter(p => {
        if (activeTab === 'functional') return ['functional', 'consumable', 'permanent'].includes(p.type);
        if (activeTab === 'theme') return p.type === 'theme';
        if (activeTab === 'limited') return p.type === 'limited';
        return true;
    });
    
    const groups = {
        'theme': { title: '主题皮肤', icon: '🎨' },
        'functional': { title: '功能道具', icon: '⚡' },
        'limited': { title: '限定物品', icon: '💎' },
        'consumable': { title: '消耗品', icon: '🎫' },
        'permanent': { title: '永久升级', icon: '⬆️' }
    };
    
    const productsByType = {};
    filteredProducts.forEach(p => {
        const type = p.type;
        if (!productsByType[type]) productsByType[type] = [];
        productsByType[type].push(p);
    });
    
    Object.keys(productsByType).forEach((type) => {
        const products = productsByType[type];
        const group = groups[type] || { title: type, icon: '📦' };
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'ios-section-header';
        sectionHeader.textContent = `${group.icon} ${group.title}`;
        contentContainer.appendChild(sectionHeader);
        
        const listGroup = document.createElement('div');
        listGroup.className = 'ios-list-group';
        
        products.forEach(product => {
            listGroup.appendChild(createProductRow(product, currentScore));
        });
        
        contentContainer.appendChild(listGroup);
    });
    
    if (filteredProducts.length === 0) {
        contentContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--theme-text-secondary);">
                暂无商品
            </div>
        `;
    }
}

// 创建商品行
function createProductRow(product, currentScore) {
    const canAfford = currentScore >= product.price;
    const currentThemeId = localStorage.getItem('current_theme') || 'default';
    
    const li = document.createElement('div');
    li.className = 'ios-list-item';
    
    if (product.type === 'theme' && product.isPurchased && product.id === currentThemeId) {
        li.classList.add('ios-item-active');
    } else if (product.isPurchased) {
        li.classList.add('ios-item-owned');
    } else if (!canAfford) {
        li.classList.add('ios-item-locked');
    }
    
    let previewHtml = '';
    if (product.type === 'theme' && product.previewColor) {
        previewHtml = `<div class="ios-item-icon" style="background: ${product.previewColor};"></div>`;
    } else {
        previewHtml = `<div class="ios-item-icon ios-icon-default"><span>${product.icon || '📦'}</span></div>`;
    }
    
    let actionHtml = '';
    
    if (product.type === 'theme') {
        if (product.id === currentThemeId) {
            actionHtml = `<div class="ios-status-badge ios-status-active"><span class="ios-checkmark">✓</span><span>使用中</span></div>`;
        } else if (product.isPurchased) {
            actionHtml = `<button class="ios-text-btn ios-btn-primary" data-action="apply" data-product="${product.id}">应用</button>`;
        } else if (!canAfford) {
            actionHtml = `<div class="ios-price ios-price-insufficient">${product.price}分</div><button class="ios-text-btn ios-btn-disabled" disabled>积分不足</button>`;
        } else {
            actionHtml = `<div class="ios-price">${product.price}分</div><button class="ios-btn ios-btn-buy" data-action="buy" data-product="${product.id}">购买</button>`;
        }
    } else {
        if (product.isPurchased) {
            actionHtml = `<div class="ios-status-badge">已购</div>`;
        } else if (!canAfford) {
            actionHtml = `<div class="ios-price ios-price-insufficient">${product.price}分</div><button class="ios-text-btn ios-btn-disabled" disabled>积分不足</button>`;
        } else {
            actionHtml = `<div class="ios-price">${product.price}分</div><button class="ios-btn ios-btn-buy" data-action="buy" data-product="${product.id}">购买</button>`;
        }
    }
    
    li.innerHTML = `
        ${previewHtml}
        <div class="ios-item-content">
            <div class="ios-item-title">${product.name}</div>
            <div class="ios-item-subtitle">${product.description}</div>
        </div>
        <div class="ios-item-action">${actionHtml}</div>
    `;
    
    const btn = li.querySelector('[data-action]');
    
    if (btn && !btn.disabled) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const productId = btn.dataset.product;
            
            if (action === 'apply') {
                applyTheme(productId);
                showToast(`已切换到：${product.name}`, 'success');
                renderShop();
            } else if (action === 'buy') {
                handleBuy(productId);
            }
        });
    }
    
    return li;
}

// 处理购买
function handleBuy(productId) {
    if (!shop || typeof shop.buy !== 'function') {
        showToast('商店系统未准备好', 'error');
        return;
    }
    
    const result = shop.buy(productId);
    if (result.success) {
        Utils.audio.play('success');
        showToast(result.message, 'success');
        renderShop();
        
        if (result.item === 'skipCard' || result.item === 'doubleCard') {
            updateItemCounts();
        }
        
        if (game && game.callbacks.onScoreUpdate) {
            game.callbacks.onScoreUpdate({
                score: game.state.score,
                totalScore: game.state.totalScore,
                streak: game.state.streak
            });
        }
    } else {
        showToast(result.message, 'error');
    }
}

// 显示Toast
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 初始化草稿板
function initScratchpad() {
    const canvas = document.getElementById('scratchpad-canvas');
    if (!canvas) return;
    
    scratchpad = new Utils.Scratchpad('scratchpad-canvas');
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            scratchpad.setTool(btn.dataset.tool);
        });
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            scratchpad.setColor(btn.dataset.color);
        });
    });
    
    const clearBtn = document.getElementById('scratchpad-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => scratchpad.clear());
    }
}

// 初始化设置面板
function initSettings() {
    const settingsBtn = document.getElementById('btn-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsClose = document.getElementById('settings-close');
    
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.hidden = !settingsPanel.hidden;
        });
    }
    
    if (settingsClose && settingsPanel) {
        settingsClose.addEventListener('click', () => settingsPanel.hidden = true);
    }
    
    const soundToggle = document.getElementById('setting-sound');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            Utils.audio.setEnabled(e.target.checked);
        });
    }
    
    const scratchpadToggle = document.getElementById('setting-scratchpad');
    const scratchpadEl = document.getElementById('scratchpad');
    if (scratchpadToggle && scratchpadEl) {
        scratchpadToggle.addEventListener('change', (e) => {
            scratchpadEl.style.display = e.target.checked ? 'block' : 'none';
        });
    }
    
    const changeThemeBtn = document.getElementById('btn-change-theme');
    const themePicker = document.getElementById('theme-picker');
    
    if (changeThemeBtn && themePicker) {
        changeThemeBtn.addEventListener('click', () => {
            settingsPanel.hidden = true;
            themePicker.hidden = false;
            renderThemePicker();
        });
    }
    
    const themePickerClose = document.getElementById('theme-picker-close');
    if (themePickerClose && themePicker) {
        themePickerClose.addEventListener('click', () => themePicker.hidden = true);
    }
}

// 渲染主题选择器 - 单列无分类版本
function renderThemePicker() {
    const themeList = document.getElementById('theme-list');
    if (!themeList) return;
    
    themeList.innerHTML = '';
    
    // 获取所有主题并排序：默认主题在前，其他按价格排序
    const allThemes = Object.values(CONFIG.THEMES).sort((a, b) => {
        if (a.id === 'default') return -1;
        if (b.id === 'default') return 1;
        return a.price - b.price;
    });
    
    // 直接渲染所有主题，不再分组
    allThemes.forEach(theme => {
        themeList.appendChild(createThemeItem(theme));
    });
}

// 创建主题项 - 单列布局，每个主题一行
function createThemeItem(theme) {
    const isUnlocked = theme.id === 'default' || 
                      (game && game.unlockedThemes && game.unlockedThemes.includes(theme.id)) ||
                      (shop && shop.hasTheme && shop.hasTheme(theme.id));
    
    const isActive = theme.id === currentThemeId;
    
    const item = document.createElement('div');
    item.className = `theme-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : 'unlocked'}`;
    
    // 价格显示逻辑：免费显示"免费"，未解锁显示"XX分"，已解锁显示"已购"
    let priceHtml = '';
    if (theme.price === 0) {
        priceHtml = '<div class="theme-free">免费</div>';
    } else if (!isUnlocked) {
        priceHtml = `<div class="theme-price">${theme.price}分</div>`;
    } else {
        priceHtml = `<div class="theme-price" style="color: #86868b;">已购</div>`;
    }
    
    // 锁定图标前缀
    const lockIcon = !isUnlocked ? '🔒 ' : '';
    
    item.innerHTML = `
        <div class="theme-preview" style="background: ${theme.preview};"></div>
        <div class="theme-info">
            <div class="theme-name">${lockIcon}${theme.name}</div>
            <div class="theme-desc">${theme.desc}</div>
        </div>
        ${priceHtml}
    `;
    
    item.addEventListener('click', () => {
        if (!isUnlocked) {
            showToast(`🔒 ${theme.name}需要${theme.price}分购买`, 'error');
            document.getElementById('theme-picker').hidden = true;
            
            // 自动打开商店的主题标签页
            const shopPanel = document.getElementById('shop-panel');
            if (shopPanel) {
                shopPanel.hidden = false;
                shopPanel.classList.remove('hiding');
                shopPanel.classList.add('showing');
                
                setTimeout(() => {
                    const themeTabs = shopPanel.querySelectorAll('.shop-tab');
                    themeTabs.forEach(tab => {
                        if (tab.dataset.tab === 'theme') {
                            tab.click();
                        }
                    });
                }, 100);
            }
            return;
        }
        
        applyTheme(theme.id);
        
        // 更新UI：移除其他active，添加当前active
        document.querySelectorAll('.theme-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');
        
        setTimeout(() => {
            document.getElementById('theme-picker').hidden = true;
            showToast(`✓ 已切换到${theme.name}`, 'success');
        }, 200);
    });
    
    return item;
}

// 初始化徽章墙
function initBadgesWall() {
    const badgesBtn = document.getElementById('btn-badges-wall');
    const badgesWall = document.getElementById('badges-wall');
    const wallClose = document.getElementById('wall-close');
    const viewAll = document.getElementById('view-all-badges');
    
    const openWall = () => {
        if (badgeSystem) {
            const wallData = badgeSystem.getWallData();
            renderBadgesWall(wallData);
        }
        badgesWall.hidden = false;
    };
    
    if (badgesBtn) badgesBtn.addEventListener('click', openWall);
    if (viewAll) viewAll.addEventListener('click', openWall);
    
    if (wallClose && badgesWall) {
        wallClose.addEventListener('click', () => badgesWall.hidden = true);
    }
}

// 更新时间
function updateMenuTime() {
    const timeEl = document.getElementById('menu-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
}

// 初始化音频
function initAudioOnFirstInteraction() {
    if (!audioInitialized && typeof Utils !== 'undefined' && Utils.audio) {
        Utils.audio.init();
        audioInitialized = true;
    }
}

// 【新增】疲劳度系统实现
function updateFatigueDisplay() {
    if (!game || !game.state) return;
    
    const fatigueEl = document.getElementById('fatigue-level');
    const fatigueBox = document.getElementById('fatigue-box');
    if (!fatigueEl || !fatigueBox) return;
    
    // 计算疲劳度（基于连续答题时间和错误率）
    const sessionDuration = (Date.now() - game.startTime) / 1000 / 60; // 分钟
    const wrongRate = game.state.totalAnswered > 0 ? 
        game.state.wrongCount / game.state.totalAnswered : 0;
    
    // 疲劳度公式：基础100%，随时间下降，错误率高时下降更快
    let fatigue = 100 - (sessionDuration * 2) - (wrongRate * 30);
    fatigue = Math.max(20, Math.min(100, fatigue)); // 限制在20-100%
    
    // 根据疲劳度更新颜色
    fatigueEl.textContent = Math.round(fatigue) + '%';
    fatigueBox.classList.remove('fatigue-high', 'fatigue-medium', 'fatigue-low');
    
    if (fatigue >= 80) {
        fatigueBox.classList.add('fatigue-high');
        fatigueEl.style.color = 'var(--fatigue-high)';
    } else if (fatigue >= 50) {
        fatigueBox.classList.add('fatigue-medium');
        fatigueEl.style.color = 'var(--fatigue-medium)';
    } else {
        fatigueBox.classList.add('fatigue-low');
        fatigueEl.style.color = 'var(--fatigue-low)';
    }
    
    // 如果疲劳度过低，显示警告
    if (fatigue < 30 && game.state.totalAnswered % 5 === 0) {
        showToast('疲劳度过低，建议休息片刻', 'warning');
    }
}

// 检查并更新难度解锁状态
function checkUnlockStatus() {
    const totalScore = game ? game.state.totalScore : 0;
    
    ['medium', 'hard', 'random'].forEach(level => {
        const levelConfig = CONFIG.LEVELS[level];
        const isUnlocked = totalScore >= levelConfig.unlockRequirement;
        const btn = document.querySelector(`[data-level="${level}"]`);
        
        if (btn) {
            btn.disabled = !isUnlocked;
            if (isUnlocked) {
                btn.title = `${levelConfig.name} - 已解锁`;
            } else {
                btn.title = `${levelConfig.name} - 需${levelConfig.unlockRequirement}分解锁`;
            }
        }
    });
}

// 主程序入口
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 因式分解游戏启动中...');
    
    initTheme();
    updateMenuTime();
    setInterval(updateMenuTime, 60000);
    
    // 【新增】定期更新疲劳度显示
    setInterval(updateFatigueDisplay, 30000); // 每30秒更新一次
    
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG 未加载');
        return;
    }
    
    if (typeof BadgeSystem !== 'undefined') {
        badgeSystem = new BadgeSystem();
    }
    
    game = new Game();
    
    if (typeof Shop !== 'undefined') {
        shop = new Shop(game);
        game.shop = shop;
    }
    
    game.init(badgeSystem, shop);
    renderRecentBadges();
    updateItemCounts();
    checkUnlockStatus();
    
    initScratchpad();
    initShopUI();
    initSettings();
    initBadgesWall();
    
    // 选项管理器
    const optionsContainer = document.getElementById('options');
    const optionManager = new OptionManager(optionsContainer, (selectedTexts) => {
        const slots = document.querySelectorAll('.slot');
        slots.forEach((slot, i) => {
            if (selectedTexts[i]) {
                slot.innerHTML = `<span class="slot-content">${selectedTexts[i]}</span>`;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '<span class="slot-placeholder">?</span>';
                slot.classList.remove('filled');
            }
        });
    });
    
    // 游戏回调
        game.callbacks = {
        onQuestionUpdate: function(data) {
            const expressionEl = document.getElementById('expression');
            if (expressionEl && data.question) {
                if (typeof katex !== 'undefined') {
                    katex.render(data.question.expressionLatex, expressionEl, {
                        throwOnError: false,
                        displayMode: false
                    });
                } else {
                    expressionEl.textContent = data.question.expression;
                }
            }
            
            const progressText = document.getElementById('progress-text');
            const progressBar = document.getElementById('progress-bar');
            if (progressText && data.progress) progressText.textContent = `${data.progress.current} / ${data.progress.total}`;
            if (progressBar && data.progress) {
                progressBar.style.width = `${(data.progress.current / data.progress.total) * 100}%`;
            }
            
            if (data.options && data.options.length > 0) optionManager.render(data.options);
            
            resetOptionsUI();
            
            // 重置按钮状态（新题目初始化）
            document.getElementById('btn-submit').hidden = false;
            document.getElementById('btn-next').hidden = true;      // 始终隐藏"下一题"按钮（macOS风格自动切题）
            document.getElementById('btn-answer').hidden = true;    // 隐藏查看答案
            
            // 【关键】重置提交按钮的点击权限（答对后设置了 pointerEvents: none，这里要恢复）
            document.getElementById('btn-submit').style.pointerEvents = '';
            
            const feedback = document.getElementById('feedback');
            if (feedback) feedback.hidden = true;
            const hintPanel = document.getElementById('hint-panel');
            if (hintPanel) hintPanel.hidden = true;
            
            if (scratchpad) scratchpad.clear();
                
            updateFatigueDisplay();
        },
        
        onBadgeUnlock: function(badge) {
            Utils.audio.play('badge');
            showBadgeNotification(badge);
            updateRecentBadges(badge);
        },
        
        onScoreUpdate: function(data) {
            const currentScoreEl = document.getElementById('current-score');
            if (currentScoreEl) currentScoreEl.textContent = data.score;
            document.getElementById('total-score').textContent = data.totalScore;
            document.getElementById('streak').textContent = data.streak;
            
            checkUnlockStatus();
        },
        
        onTimeUpdate: function(data) {
            const currentTimeEl = document.getElementById('current-time');
            const gameTimeEl = document.getElementById('game-time');
            // 添加空值检查
            if (currentTimeEl && data.question !== undefined) {
                currentTimeEl.textContent = Utils.formatTime(data.question);
            }
            if (gameTimeEl && data.total !== undefined) {
                gameTimeEl.textContent = Utils.formatTime(data.total);
            }
        },
        
        // 【新增】双倍卡使用回调
        onDoubleCardUsed: function() {
            showFloatText('双倍积分！', '#FFD700');
        },
        
        onGameEnd: function(data) {
            let msg = `游戏结束！\n得分：${data.score}\n正确：${data.correct}/${data.correct + data.wrong}`;
            
            checkUnlockStatus();
            
            setTimeout(() => alert(msg), 500);
            setTimeout(() => game.startGame('easy', 'normal'), 2000);
        }
    };
    
    // 难度按钮事件
    document.querySelectorAll('.toolbar-btn[data-level]').forEach(btn => {
        btn.addEventListener('click', () => {
            initAudioOnFirstInteraction();
            const level = btn.dataset.level;
            
            const levelConfig = CONFIG.LEVELS[level];
            if (game.state.totalScore < levelConfig.unlockRequirement) {
                showToast(`需${levelConfig.unlockRequirement}分解锁${levelConfig.name}难度`, 'error');
                return;
            }
            
            document.querySelectorAll('.toolbar-btn[data-level]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            game.startGame(level, level === 'random' ? 'random' : 'normal');
        });
    });
    
    // 提交答案（macOS风格：正确自动下一题，错误保持可重试）
    document.getElementById('btn-submit')?.addEventListener('click', () => {
        initAudioOnFirstInteraction();
        const selected = optionManager.getSelectedTexts();
        if (selected.length !== 2) {
            showToast('请选择两个因式', 'error');
            return;
        }
    
        const result = game.handleAnswer(selected);
    
        if (result.correct) {
            // 成功路径：自动进入下一题
            Utils.audio.play('correct');
            showFloatText(`+${result.earned}`, '#34C759');
            optionManager.disable();
        
            const feedback = document.getElementById('feedback');
            feedback.className = 'feedback success';
            feedback.innerHTML = '<div class="feedback-icon">✓</div><div class="feedback-text">回答正确！</div>';
            feedback.removeAttribute('hidden');
        
            // macOS风格：答对后短暂延迟自动切题，无需点击"下一题"
            document.getElementById('btn-submit').style.pointerEvents = 'none';
        
            setTimeout(() => {
                feedback.setAttribute('hidden', '');
                document.getElementById('btn-submit').style.pointerEvents = '';
                game.nextQuestion();
            }, 1200);
        
        } else {
            // 错误路径：保持界面状态，允许重试
            Utils.audio.play('wrong');
        
            // 插槽抖动动画
            const slots = document.querySelectorAll('.slot');
            slots.forEach(slot => {
                slot.classList.add('wrong');
                slot.style.animation = 'none';
                slot.offsetHeight; // 触发重排
                slot.style.animation = 'shake 0.4s ease';
            });
            setTimeout(() => slots.forEach(slot => slot.classList.remove('wrong')), 400);
        
            // 显示错误反馈，但提交按钮保持可用
            const feedback = document.getElementById('feedback');
            feedback.className = 'feedback error';
            feedback.innerHTML = '<div class="feedback-icon">✗</div><div class="feedback-text">回答错误，请重试</div>';
            feedback.removeAttribute('hidden');
        
            // 错误时显示"查看答案"按钮，提交按钮保持可见
            document.getElementById('btn-answer').removeAttribute('hidden');
            // 注意：不隐藏 #btn-submit，用户可以重新选择后再次提交
        }
    
        updateItemCounts();
    });
    
    
    
    // 重置
    document.getElementById('btn-reset')?.addEventListener('click', () => {
        optionManager.reset();
        resetOptionsUI();
        document.getElementById('feedback').setAttribute('hidden', '');
        document.getElementById('btn-answer').setAttribute('hidden', ''); // 隐藏查看答案
        // 提交按钮保持可见，无需处理
    });
    
    // 提示
    document.getElementById('btn-hint')?.addEventListener('click', () => {
        const result = game.useHint();
        if (result.success) {
            const hintPanel = document.getElementById('hint-panel');
            // 根据等级显示不同详细程度的提示
            let hintContent = result.hint;
            if (result.detailedHint && result.level >= 2) {
                hintContent = result.detailedHint;
            }
            document.getElementById('hint-content').textContent = hintContent;
            hintPanel.hidden = false;
        } else {
            showToast(result.message, 'error');
        }
    });
    
    // 查看答案
    document.getElementById('btn-answer')?.addEventListener('click', () => {
        const modal = document.getElementById('modal');
        const q = game.state.currentQuestion;
        
        document.getElementById('modal-q').textContent = q.expression;
        
        const stepsEl = document.getElementById('modal-steps');
        stepsEl.innerHTML = q.steps.map(s => `<div class="step">${s}</div>`).join('');
        
        const answer = q.factorStrings.join(' × ');
        document.getElementById('modal-a').textContent = answer;
        
        modal.showModal();
    });
    
    // 关闭答案
    document.getElementById('btn-close')?.addEventListener('click', () => {
        document.getElementById('modal').close();
    });
    
    // 跳过卡
    document.getElementById('btn-use-skip')?.addEventListener('click', () => {
        const result = game.useSkip();
        if (result.success) {
            showToast(result.message, 'success');
            updateItemCounts();
        } else {
            showToast(result.message, 'error');
        }
    });
    
    // 双倍卡
    document.getElementById('btn-use-double')?.addEventListener('click', () => {
        const result = game.activateDoubleCard();
        if (result.success) {
            showToast(result.message, 'success');
            updateItemCounts();
        } else {
            showToast(result.message, 'error');
        }
    });
    
    // 启动游戏
    game.startGame('easy', 'normal');
    
    console.log('✅ 游戏初始化完成');
});