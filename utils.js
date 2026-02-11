/**
 * utils.js - 修正版（添加LocalStorage保护 + 疲劳度工具）
 */

const Utils = {
    // 随机整数 [min, max]
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // 打乱数组（Fisher-Yates算法）
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    // 格式化时间 mm:ss
    formatTime(seconds) {
        // 添加输入验证
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return '00:00';
        }
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },
    
    // 获取当前时间信息
    getTimeInfo() {
        const now = new Date();
        return {
            hour: now.getHours(),
            minute: now.getMinutes(),
            date: now.toDateString(),
            timestamp: now.getTime()
        };
    },
    
    // 检查是否在时间范围内
    isInTimeRange(startHour, endHour) {
        const hour = new Date().getHours();
        return hour >= startHour && hour < endHour;
    },
    
    // 【关键修复】存储操作（带错误处理）
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn(`Utils.storage.get failed for key "${key}":`, e);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn(`Utils.storage.set failed for key "${key}":`, e);
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn(`Utils.storage.remove failed for key "${key}":`, e);
                return false;
            }
        }
    },
    
    // 音效系统
    audio: {
        ctx: null,
        initialized: false,
        enabled: true,
        
        init() {
            if (!this.enabled) return null;
            if (!this.ctx) {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) {
                        this.ctx = new AudioContext();
                        this.initialized = true;
                    }
                } catch (e) {
                    console.warn('AudioContext init failed:', e);
                }
            }
            return this.ctx;
        },
        
        async resume() {
            if (!this.enabled) return false;
            if (this.ctx && this.ctx.state === 'suspended') {
                try {
                    await this.ctx.resume();
                    return true;
                } catch (e) {
                    return false;
                }
            }
            return true;
        },
        
        async ensureReady() {
            if (!this.enabled) return null;
            if (!this.ctx) return this.init();
            if (this.ctx.state === 'suspended') await this.resume();
            return this.ctx;
        },
        
        async play(type) {
            if (!this.enabled) return;
            const ctx = await this.ensureReady();
            if (!ctx) return;
            
            if (ctx.state === 'suspended') {
                const resumed = await this.resume();
                if (!resumed) return;
            }
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            const now = ctx.currentTime;
            
            switch(type) {
                case 'correct':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, now);
                    osc.frequency.setValueAtTime(659.25, now + 0.08);
                    osc.frequency.setValueAtTime(783.99, now + 0.16);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                    break;
                    
                case 'wrong':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, now);
                    osc.frequency.linearRampToValueAtTime(140, now + 0.25);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                    osc.start(now);
                    osc.stop(now + 0.25);
                    break;
                    
                case 'badge':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.setValueAtTime(1100, now + 0.08);
                    osc.frequency.setValueAtTime(1320, now + 0.16);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                    break;
                    
                case 'click':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(600, now);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                    osc.start(now);
                    osc.stop(now + 0.04);
                    break;
                    
                case 'success':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                    osc.start(now);
                    osc.stop(now + 0.25);
                    break;
            }
        },
        
        setEnabled(enabled) {
            this.enabled = enabled;
        }
    },
    
    // 草稿板类
    Scratchpad: class {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            
            this.ctx = this.canvas.getContext('2d');
            this.isDrawing = false;
            this.tool = 'pen';
            this.color = '#1a1a1a';
            this.lineWidth = 2;
            this.lastX = 0;
            this.lastY = 0;
            
            this.init();
        }
        
        init() {
            // 设置画布背景
            this.ctx.fillStyle = '#FEFDF8';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绑定事件
            this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
            this.canvas.addEventListener('mousemove', this.draw.bind(this));
            this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
            this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
            
            // 触摸支持
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.startDrawing({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    target: this.canvas
                });
            });
            
            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                this.draw({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    target: this.canvas
                });
            });
            
            this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        }
        
        startDrawing(e) {
            this.isDrawing = true;
            const rect = this.canvas.getBoundingClientRect();
            this.lastX = e.clientX - rect.left;
            this.lastY = e.clientY - rect.top;
        }
        
        draw(e) {
            if (!this.isDrawing) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(x, y);
            
            if (this.tool === 'eraser') {
                this.ctx.strokeStyle = '#FEFDF8';
                this.ctx.lineWidth = 15;
            } else {
                this.ctx.strokeStyle = this.color;
                this.ctx.lineWidth = this.lineWidth;
            }
            
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
            
            this.lastX = x;
            this.lastY = y;
        }
        
        stopDrawing() {
            this.isDrawing = false;
        }
        
        clear() {
            // 【新增】添加淡出动画效果
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#FEFDF8';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
            
            // 延迟完全清空，实现视觉过渡
            requestAnimationFrame(() => {
                this.ctx.globalAlpha = 1;
                this.ctx.fillStyle = '#FEFDF8';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            });
        }
        
        setTool(tool) {
            this.tool = tool;
        }
        
        setColor(color) {
            this.color = color;
        }
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // 深拷贝
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // 计算数组平均值
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    },
    
    // 生成唯一ID
    uuid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // 动画帧请求
    animate(callback) {
        const id = requestAnimationFrame(callback);
        return {
            cancel: () => cancelAnimationFrame(id)
        };
    },
    
    // 计算最大公约数
    gcd(a, b) {
        return b === 0 ? Math.abs(a) : this.gcd(b, a % b);
    },
    
    // 格式化数学表达式为LaTeX
    formatExpression(a, b, c) {
        let latex = '';
        
        // 二次项
        if (a === 1) latex += 'x^2';
        else if (a === -1) latex += '-x^2';
        else latex += `${a}x^2`;
        
        // 一次项
        if (b > 0) latex += ` + ${b === 1 ? '' : b}x`;
        else if (b < 0) latex += ` - ${Math.abs(b)}x`;
        
        // 常数项
        if (c > 0) latex += ` + ${c}`;
        else if (c < 0) latex += ` - ${Math.abs(c)}`;
        
        return latex;
    },
    
    // 格式化因式为LaTeX
    formatFactorLatex(d, e) {
        let latex = '';
        
        if (d === 1) latex += 'x';
        else if (d === -1) latex += '-x';
        else latex += `${d}x`;
        
        if (e > 0) latex += ` + ${e}`;
        else if (e < 0) latex += ` - ${Math.abs(e)}`;
        
        return `(${latex})`;
    },
    
    // 渲染LaTeX到元素
    renderLatex(element, latex) {
        if (typeof katex !== 'undefined') {
            try {
                katex.render(latex, element, {
                    throwOnError: false,
                    displayMode: false
                });
                return true;
            } catch (e) {
                console.warn('KaTeX render failed:', e);
            }
        }
        // 降级为纯文本
        element.textContent = latex.replace(/\^2/g, '²').replace(/\*/g, '×');
        return false;
    },
    
    // 【新增】疲劳度计算工具
    fatigue: {
        // 计算当前疲劳度 (0-100)
        calculate(sessionDurationMinutes, wrongRate, consecutiveRounds) {
            // 基础疲劳：随时间增加
            const timeFatigue = sessionDurationMinutes * 2;
            // 错误疲劳：错误率越高越疲劳
            const errorFatigue = wrongRate * 30;
            // 连击疲劳：连续答题过多也会疲劳
            const streakFatigue = consecutiveRounds > 10 ? (consecutiveRounds - 10) * 2 : 0;
            
            let fatigue = 100 - timeFatigue - errorFatigue - streakFatigue;
            return Math.max(20, Math.min(100, fatigue));
        },
        
        // 根据疲劳度获取颜色
        getColor(fatigue) {
            if (fatigue >= 80) return '#34C759'; // 绿色
            if (fatigue >= 50) return '#FF9500'; // 橙色
            return '#FF3B30'; // 红色
        },
        
        // 获取状态描述
        getStatus(fatigue) {
            if (fatigue >= 80) return { level: 'high', text: '精力充沛', class: 'fatigue-high' };
            if (fatigue >= 50) return { level: 'medium', text: '略有疲劳', class: 'fatigue-medium' };
            return { level: 'low', text: '需要休息', class: 'fatigue-low' };
        }
    },
    
    // 彩纸效果
    confetti(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        const colors = options.colors || ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'];
        const particleCount = options.count || 100;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20 - 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                gravity: 0.3,
                drag: 0.98
            });
        }
        
        let animationId;
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            let activeParticles = 0;
            
            particles.forEach(p => {
                if (p.y < canvas.height + 50) {
                    activeParticles++;
                    
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += p.gravity;
                    p.vx *= p.drag;
                    p.vy *= p.drag;
                    p.rotation += p.rotationSpeed;
                    
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                }
            });
            
            if (activeParticles > 0) {
                animationId = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        
        animate();
        
        return {
            stop: () => {
                if (animationId) cancelAnimationFrame(animationId);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    }
};