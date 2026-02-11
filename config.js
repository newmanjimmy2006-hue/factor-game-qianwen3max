// config.js - 重构版：支持三级难度架构与六类高级题型配置

const CONFIG = {
    QUESTIONS_PER_LEVEL: 20,
    
    // 疲劳度配置（保持不变）
    FATIGUE: {
        initial: 1.0,
        decayPerRound: 0.15,
        minMultiplier: 0.2,
        recoveryTime: 30 * 60 * 1000,
        thresholds: {
            high: 0.8,
            medium: 0.5
        }
    },
    
    // 重构后：三级难度架构
    LEVELS: {
        easy: { 
            name: '初级', 
            baseScore: 10, 
            desc: '系数为1的基础分解',
            unlockRequirement: 0,
            aRange: [1, 1],
            bRange: [-20, 20],
            cRange: [-36, 36]
        },
        medium: { 
            name: '中级', 
            baseScore: 20, 
            desc: '系数大于1的标准十字相乘',
            unlockRequirement: 100,  // 累计100分解锁
            aRange: [2, 6],
            bRange: [-50, 50],
            cRange: [-100, 100]
        },
        hard: { 
            name: '高级', 
            baseScore: 30, 
            desc: '复杂构造与特殊技巧',
            unlockRequirement: 300,  // 累计300分解锁
            aRange: [2, 19],  // 涵盖Type 1-6的各种可能
            bRange: [-60, 60],
            cRange: [-150, 150]
        },
        random: { 
            name: '随机', 
            baseScore: 25, 
            desc: '动态难度，中级起步',
            unlockRequirement: 200,
            note: '第1-4题强制中级，动态向高级过渡'
        }
    },
    
    // 随机模式双轨制配置
    RANDOM_MODE: {
        EVAL_UNIT_SIZE: 2,
        INITIAL_DISTRIBUTION: { medium: 100, hard: 0 },
        TARGET_DISTRIBUTION: {
            crush:   { medium: 30, hard: 70 },   // 2对且<5秒
            good:    { medium: 50, hard: 50 },   // 2对
            average: { medium: 70, hard: 30 },   // 1对
            struggle:{ medium: 100, hard: 0 }    // 0对（难度地板）
        },
        MAX_CHANGE_PER_STEP: 20,  // 单次调整≤20%
        HARD_MAX: 70,             // 高级上限70%
        HARD_MIN: 0,              // 高级下限0%（不回初级）
        BOSS_QUESTIONS: [16, 20]  // 强制高级题号
    },
    
    // 高级题型（Hard）六类配置
    HARD_TYPES: {
        TYPE_1_LARGE_COEFF: {
            id: 1,
            name: '大系数复杂型',
            desc: 'a∈[7,12]，多分解路径',
            aRange: [7, 12],
            eRange: [-15, 15],      // 内部系数范围
            weight: 25,             // 占比25%
            method: 'type1_large'
        },
        TYPE_2_NEGATIVE: {
            id: 2,
            name: '符号迷宫型',
            desc: '首项为负或b,c异号干扰',
            features: ['leading_negative', 'sign_mismatch'],
            weight: 15,
            method: 'type2_negative'
        },
        TYPE_3_NEAR_PERFECT: {
            id: 3,
            name: '近完全平方型',
            desc: 'b²≈4ac（差值1-5）',
            discriminantOffset: [1, 5],  // Δ与4ac的差值范围
            weight: 15,
            method: 'type3_near_perfect'
        },
        TYPE_4_PRIME: {
            id: 4,
            name: '质数困境型',
            desc: 'a为质数，分解唯一',
            primes: [11, 13, 17, 19],
            eRange: [-12, 12],
            weight: 15,
            method: 'type4_prime'
        },
        TYPE_5_SUBSTITUTION: {
            id: 5,
            name: '双换元结构型',
            desc: '含(x+k)换元结构',
            innerKRange: [1, 5],     // 换元中的k值
            aRange: [1, 4],
            weight: 10,
            method: 'type5_substitution'
        },
        TYPE_6_GCD: {
            id: 6,
            name: 'GCD提取型',
            desc: '先提公因数再分解',
            gcdRange: [2, 6],        // 公因数范围
            baseLevel: ['easy', 'medium'],  // 基础题型来源
            weight: 20,              // 占比20-25%
            method: 'type6_gcd',
            // GCD型特殊配置
            generation: {
                schemes: ['A', 'B'],  // 单轨分配方案
                trapTypes: ['dup', 'neg', 'dist1', 'dist2'],  // 陷阱类型
                verifyRules: [
                    'naked_x_dup != original',      // 裸×同提GCD ≠ 原式
                    'naked_x_neg != original',      // 裸×负GCD ≠ 原式
                    'gcd_x_dupgcd != original',     // 双GCD ≠ 原式（防k²倍）
                    'with_dist != original'         // 含干扰项 ≠ 原式
                ]
            }
        }
    },
    
    // 防重复与相似性控制
    ANTI_REPEAT: {
        HARD_TYPE_ROTATION: 3,    // 连续3题不得同类型
        SOFT_SIMILARITY: {
            bThreshold: 0,        // |b|相同即视为相似
            cThreshold: 0,        // |c|相同即视为相似
            aConsecutiveMax: 3    // 同一a值连续出现上限
        },
        MAX_ATTEMPTS: 100         // 生成尝试次数上限
    },
    
    // 分数加成配置
    BONUSES: {
        difficulty: { 
            easy: 1, 
            medium: 2, 
            hard: 3, 
            random: 2.5 
        },
        speed: { 
            3: 0.5,    // <3秒 +50%
            5: 0.3,    // <5秒 +30%
            8: 0.15,   // <8秒 +15%
            10: 0.05   // <10秒 +5%
        },
        noHint: 0.2,
        firstTry: 0.1,
        randomMode: 0.15,
        maxTotal: 0.5
    },
    
    STREAK_BONUS: {
        3: 0.05,
        5: 0.15,
        10: 0.3,
        20: 0.5,
        50: 1.0
    },
    
    // 重构后：初级静态题库（原Easy + 原Medium合并，|b|≤20，|c|≤36）
    PRESETS: {
        easy: [
            // 原Easy部分（简单正数）
            { a: 1, b: 3, c: 2, factors: [[1, 1], [1, 2]], method: 'positive' },
            { a: 1, b: 5, c: 6, factors: [[1, 2], [1, 3]], method: 'positive' },
            { a: 1, b: 6, c: 5, factors: [[1, 1], [1, 5]], method: 'positive' },
            { a: 1, b: 4, c: 4, factors: [[1, 2], [1, 2]], method: 'perfect_square' },
            { a: 1, b: 2, c: 1, factors: [[1, 1], [1, 1]], method: 'perfect_square' },
            { a: 1, b: 7, c: 12, factors: [[1, 3], [1, 4]], method: 'positive' },
            { a: 1, b: 8, c: 7, factors: [[1, 1], [1, 7]], method: 'positive' },
            
            // 符号变化类（原Easy负号类）
            { a: 1, b: -5, c: 6, factors: [[1, -2], [1, -3]], method: 'negative_both' },
            { a: 1, b: 5, c: -6, factors: [[1, 6], [1, -1]], method: 'negative_c' },
            { a: 1, b: -5, c: -6, factors: [[1, -6], [1, 1]], method: 'mixed' },
            { a: 1, b: -6, c: 5, factors: [[1, -1], [1, -5]], method: 'negative_both' },
            { a: 1, b: 6, c: -7, factors: [[1, 7], [1, -1]], method: 'negative_c' },
            { a: 1, b: -2, c: 1, factors: [[1, -1], [1, -1]], method: 'perfect_square' },
            
            // 原Medium合并入初级（中等系数，|b|≤20，|c|≤36）
            { a: 1, b: 13, c: 12, factors: [[1, 1], [1, 12]], method: 'positive' },
            { a: 1, b: -13, c: 12, factors: [[1, -1], [1, -12]], method: 'negative_both' },
            { a: 1, b: 13, c: -14, factors: [[1, 14], [1, -1]], method: 'negative_c' },
            { a: 1, b: 15, c: 36, factors: [[1, 3], [1, 12]], method: 'positive' },
            { a: 1, b: -15, c: 36, factors: [[1, -3], [1, -12]], method: 'negative_both' },
            { a: 1, b: 15, c: -16, factors: [[1, 16], [1, -1]], method: 'negative_c' },
            { a: 1, b: 16, c: 15, factors: [[1, 1], [1, 15]], method: 'positive' },
            { a: 1, b: -16, c: 15, factors: [[1, -1], [1, -15]], method: 'negative_both' },
            { a: 1, b: 17, c: 30, factors: [[1, 2], [1, 15]], method: 'positive' },
            { a: 1, b: -17, c: 30, factors: [[1, -2], [1, -15]], method: 'negative_both' },
            { a: 1, b: 17, c: -18, factors: [[1, 18], [1, -1]], method: 'negative_c' },
            { a: 1, b: 19, c: 18, factors: [[1, 1], [1, 18]], method: 'positive' },
            { a: 1, b: -19, c: 18, factors: [[1, -1], [1, -18]], method: 'negative_both' },
            { a: 1, b: 19, c: -20, factors: [[1, 20], [1, -1]], method: 'negative_c' }
        ],
        
        // 中级：原Hard内容（a∈[2,6]）
        medium: [
            { a: 2, b: 5, c: 3, factors: [[2, 3], [1, 1]], method: 'standard_cross' },
            { a: 2, b: -5, c: 3, factors: [[2, -3], [1, -1]], method: 'standard_cross' },
            { a: 3, b: 10, c: 3, factors: [[3, 1], [1, 3]], method: 'standard_cross' },
            { a: 3, b: -10, c: 3, factors: [[3, -1], [1, -3]], method: 'standard_cross' },
            { a: 4, b: 8, c: 3, factors: [[2, 1], [2, 3]], method: 'standard_cross' },
            { a: 4, b: -8, c: 3, factors: [[2, -1], [2, -3]], method: 'standard_cross' },
            { a: 6, b: 5, c: -6, factors: [[3, 3], [2, -2]], method: 'standard_cross_mixed' },
            { a: 6, b: -5, c: -6, factors: [[3, -3], [2, 2]], method: 'standard_cross_mixed' },
            { a: 2, b: 7, c: 6, factors: [[2, 3], [1, 2]], method: 'standard_cross' },
            { a: 2, b: -7, c: 6, factors: [[2, -3], [1, -2]], method: 'standard_cross' },
            { a: 2, b: 9, c: 10, factors: [[2, 5], [1, 2]], method: 'standard_cross' },
            { a: 2, b: -9, c: 10, factors: [[2, -5], [1, -2]], method: 'standard_cross' },
            { a: 3, b: 8, c: 5, factors: [[3, 5], [1, 1]], method: 'standard_cross' },
            { a: 3, b: -8, c: 5, factors: [[3, -5], [1, -1]], method: 'standard_cross' },
            { a: 4, b: 12, c: 9, factors: [[2, 3], [2, 3]], method: 'perfect_square_a' },
            { a: 4, b: -12, c: 9, factors: [[2, -3], [2, -3]], method: 'perfect_square_a' },
            { a: 5, b: 6, c: 1, factors: [[5, 1], [1, 1]], method: 'standard_cross' },
            { a: 5, b: -6, c: 1, factors: [[5, -1], [1, -1]], method: 'standard_cross' },
            { a: 6, b: 7, c: 2, factors: [[3, 2], [2, 1]], method: 'standard_cross' },
            { a: 6, b: -7, c: 2, factors: [[3, -2], [2, -1]], method: 'standard_cross' }
        ],
        
        // 高级：静态题库为空或仅保留示例，主要依赖实时生成
        hard: []
    },
    
    // 徽章配置（保持不变，但可扩展高级题型相关徽章）
    BADGES: {
        basic: [
            { id: 'beginner', name: '初学者', icon: '🌱', desc: '完成第1题', condition: { type: 'count', target: 1 } },
            { id: 'streak_3', name: '连胜新手', icon: '🌿', desc: '3连击', condition: { type: 'streak', target: 3 } },
            { id: 'streak_10', name: '连胜高手', icon: '🔥', desc: '10连击', condition: { type: 'streak', target: 10 } },
            { id: 'streak_50', name: '连胜大师', icon: '⚡', desc: '50连击', condition: { type: 'streak', target: 50 } },
            { id: 'speed_5s', name: '闪电侠', icon: '⏱️', desc: '5秒内答对一题', condition: { type: 'speed', target: 5 } },
            { id: 'speed_3s', name: '极速传说', icon: '🚀', desc: '3秒内答对一题', condition: { type: 'speed', target: 3 } },
            { id: 'perfect_easy', name: '初级完美', icon: '🥉', desc: '初级累计20题无错误', condition: { type: 'perfect_count', target: { level: 'easy', count: 20 } } },
            // 【修复】将 type 从 'perfect' 改为 'perfect_count'，与 Badge.js 中的 case 分支匹配
            { id: 'perfect_medium', name: '中级完美', icon: '🥈', desc: '中级累计20题无错误', condition: { type: 'perfect_count', target: { level: 'medium', count: 20 } } },
            { id: 'perfect_hard', name: '高级完美', icon: '🥇', desc: '高级累计20题无错误', condition: { type: 'perfect_count', target: { level: 'hard', count: 20 } } },
            { id: 'graduate_easy', name: '初级大师', icon: '📗', desc: '完成初级难度', condition: { type: 'complete_any', target: 'easy' } },
            { id: 'graduate_medium', name: '中级大师', icon: '📘', desc: '完成中级难度', condition: { type: 'complete_any', target: 'medium' } },
            { id: 'graduate_hard', name: '高级大师', icon: '📕', desc: '完成高级难度', condition: { type: 'complete_any', target: 'hard' } },
            { id: 'solver_100', name: '解题机器 Lv.1', icon: '🤖', desc: '累计100题', condition: { type: 'total_count', target: 100 }, levelable: true },
            { id: 'score_1000', name: '积分富豪 Lv.1', icon: '💰', desc: '累计1000分', condition: { type: 'total_score', target: 1000 }, levelable: true },
            { id: 'speed_king', name: '速度之王 Lv.1', icon: '🏎️', desc: '平均用时<10秒', condition: { type: 'avg_speed', target: 10 }, levelable: true }
        ],
        
        advanced: [
            { id: 'method_master', name: '方法大师', icon: '🧠', desc: '连续5题不同方法类型', condition: { type: 'method_variety', target: 5 } },
            { id: 'no_hint_10', name: '独立思考者', icon: '🧊', desc: '连续10题无提示', condition: { type: 'no_hint_streak', target: 10 } },
            { id: 'random_master', name: '盲盒大师', icon: '🎁', desc: '随机模式10连击', condition: { type: 'random_streak', target: 10 } },
            { id: 'frenzy_master', name: '狂热大师', icon: '💥', desc: '触发狂热状态5次', condition: { type: 'frenzy_count', target: 5 } },
            { id: 'shopaholic', name: '购物达人', icon: '🛍️', desc: '购买5件商品', condition: { type: 'shop_count', target: 5 } },
            { id: 'collector', name: '徽章收藏家', icon: '🏆', desc: '获得20个不同徽章', condition: { type: 'badge_count', target: 20 } },
            // 新增：高级题型专家徽章
            { id: 'gcd_expert', name: '因式提取专家', icon: '🔍', desc: '正确解答10道GCD型题目', condition: { type: 'hard_type_count', target: { type: 6, count: 10 } } },
            { id: 'prime_hunter', name: '质数猎手', icon: '🔢', desc: '正确解答5道质数困境型题目', condition: { type: 'hard_type_count', target: { type: 4, count: 5 } } },
            { id: 'large_tamer', name: '大系数驯服者', icon: '🎚️', desc: '正确解答10道大系数复杂型题目', condition: { type: 'hard_type_count', target: { type: 1, count: 10 } } }
        ],
        
        // 24节气徽章（保持不变）
        solar: [
            { id: 'lichun', name: '春回大地', icon: '🌸', desc: '立春期间答对5题', term: '立春', month: 2, day: 4, duration: 15 },
            { id: 'yushui', name: '润物无声', icon: '💧', desc: '雨水期间无提示5题', term: '雨水', month: 2, day: 19, duration: 15 },
            { id: 'jingzhe', name: '春雷乍动', icon: '🐞', desc: '惊蛰期间3秒答对3题', term: '惊蛰', month: 3, day: 6, duration: 15 },
            { id: 'chunfen', name: '昼夜均分', icon: '⚖️', desc: '春分期间答对完全平方题', term: '春分', month: 3, day: 21, duration: 15 },
            { id: 'qingming', name: '清明时节', icon: '🎋', desc: '清明期间累计10题', term: '清明', month: 4, day: 5, duration: 15 },
            { id: 'guyu', name: '雨生百谷', icon: '🌾', desc: '谷雨期间答对高级题5题', term: '谷雨', month: 4, day: 20, duration: 15 },
            { id: 'lixia', name: '夏日初临', icon: '🌺', desc: '立夏期间答对5题', term: '立夏', month: 5, day: 5, duration: 15 },
            { id: 'xiaoman', name: '小得盈满', icon: '🌻', desc: '小满期间连续3题正确', term: '小满', month: 5, day: 21, duration: 15 },
            { id: 'mangzhong', name: '忙种时节', icon: '🌽', desc: '芒种期间答对10题', term: '芒种', month: 6, day: 6, duration: 15 },
            { id: 'xiazhi', name: '日长之至', icon: '☀️', desc: '夏至期间5秒内答对3题', term: '夏至', month: 6, day: 21, duration: 15 },
            { id: 'xiaoshu', name: '小暑清和', icon: '🍃', desc: '小暑期间累计15题', term: '小暑', month: 7, day: 7, duration: 15 },
            { id: 'dashu', name: '大暑炎炎', icon: '🔥', desc: '大暑期间达到10连击', term: '大暑', month: 7, day: 23, duration: 15 },
            { id: 'liqiu', name: '秋风送爽', icon: '🍂', desc: '立秋期间答对5题', term: '立秋', month: 8, day: 7, duration: 15 },
            { id: 'chushu', name: '处暑转凉', icon: '🍁', desc: '处暑期间无提示5题', term: '处暑', month: 8, day: 23, duration: 15 },
            { id: 'bailu', name: '白露为霜', icon: '💧', desc: '白露期间答对中级题5题', term: '白露', month: 9, day: 7, duration: 15 },
            { id: 'qiufen', name: '秋分平分', icon: '🌓', desc: '秋分期间答对完全平方题', term: '秋分', month: 9, day: 23, duration: 15 },
            { id: 'hanlu', name: '寒露凝霜', icon: '❄️', desc: '寒露期间累计10题', term: '寒露', month: 10, day: 8, duration: 15 },
            { id: 'shuangjiang', name: '霜降叶落', icon: '🍂', desc: '霜降期间答对高级题3题', term: '霜降', month: 10, day: 23, duration: 15 },
            { id: 'lidong', name: '立冬藏冬', icon: '❄️', desc: '立冬期间答对5题', term: '立冬', month: 11, day: 7, duration: 15 },
            { id: 'xiaoxue', name: '小雪纷飞', icon: '🌨️', desc: '小雪期间连续5题正确', term: '小雪', month: 11, day: 22, duration: 15 },
            { id: 'daxue', name: '大雪封门', icon: '☃️', desc: '大雪期间答对10题', term: '大雪', month: 12, day: 7, duration: 15 },
            { id: 'dongzhi', name: '冬至阳生', icon: '🌅', desc: '冬至期间5秒内答对3题', term: '冬至', month: 12, day: 22, duration: 15 },
            { id: 'xiaohan', name: '小寒料峭', icon: '🧣', desc: '小寒期间累计15题', term: '小寒', month: 1, day: 6, duration: 15 },
            { id: 'dahan', name: '大寒迎春', icon: '🌸', desc: '大寒期间达到10连击', term: '大寒', month: 1, day: 20, duration: 15 }
        ],
        
        // 5A景区徽章（保持不变）
        scenic: [
            { id: 'forbidden_city', name: '紫禁之巅', icon: '🐉', desc: '累计答对100题', condition: { type: 'total_count', target: 100 } },
            { id: 'great_wall', name: '万里长城', icon: '🧱', desc: '最高连击达到50', condition: { type: 'streak', target: 50 } },
            { id: 'terracotta', name: '地下军团', icon: '⚔️', desc: '答对3道完全平方题', condition: { type: 'perfect_square_count', target: 3 } },
            { id: 'west_lake', name: '断桥残雪', icon: '🌉', desc: '答对判别式<5的题3道', condition: { type: 'near_perfect', target: 3 } },
            { id: 'yellow_mountain', name: '云海奇松', icon: '🌲', desc: '清晨5-7点完成3题', condition: { type: 'time_range', target: { start: 5, end: 7, count: 3 } } },
            { id: 'zhangjiajie', name: '阿凡达仙境', icon: '🏔️', desc: '答对系数较大的题5道（|b|或|c|>10）', condition: { type: 'large_number', target: 5 } },
            { id: 'jiuzhaigou', name: '五彩池', icon: '💎', desc: '连续5题答案含不同数字', condition: { type: 'variety_numbers', target: 5 } },
            { id: 'lijiang', name: '月夜丽江', icon: '🌙', desc: '晚上答题正确率>80%', condition: { type: 'night_accuracy', target: 0.8 } },
            { id: 'guilin', name: '水墨丹青', icon: '🖌️', desc: '答对比例和谐题3道（系数比1.4-2.0）', condition: { type: 'golden_ratio', target: 3 } },
            { id: 'mount_tai', name: '五岳独尊', icon: '⛰️', desc: '获得其他9个景区徽章', condition: { type: 'collection', targets: ['forbidden_city', 'great_wall', 'terracotta', 'west_lake', 'yellow_mountain', 'zhangjiajie', 'jiuzhaigou', 'lijiang', 'guilin'] } }
        ]
    },
    
    // 中国传统色彩主题（保持不变）
    THEMES: {
        default: {
            id: 'default',
            name: '默认',
            desc: '系统默认外观',
            class: '',
            preview: '#007AFF',
            price: 0
        },
        yanzhi: {
            id: 'yanzhi',
            name: '胭脂',
            desc: '胭脂泪，相留醉',
            class: 'theme-yanzhi',
            preview: '#9D2933',
            price: 800
        },
        ningyezi: {
            id: 'ningyezi',
            name: '凝夜紫',
            desc: '塞上燕脂凝夜紫',
            class: 'theme-ningyezi',
            preview: '#4A2C6A',
            price: 800
        },
        zhuozhuo: {
            id: 'zhuozhuo',
            name: '灼灼',
            desc: '桃夭灼灼其华',
            class: 'theme-zhuozhuo',
            preview: '#E86F8A',
            price: 1000
        },
        lvyi: {
            id: 'lvyi',
            name: '绿衣',
            desc: '绿衣黄裳',
            class: 'theme-lvyi',
            preview: '#2D5A4A',
            price: 800
        },
        qingqing: {
            id: 'qingqing',
            name: '子衿',
            desc: '青青子衿',
            class: 'theme-qingqing',
            preview: '#2B4A6F',
            price: 800
        },
        danxin: {
            id: 'danxin',
            name: '丹心',
            desc: '留取丹心照汗青',
            class: 'theme-danxin',
            preview: '#C41E3A',
            price: 1200
        },
        jiangbi: {
            id: 'jiangbi',
            name: '江碧',
            desc: '江碧鸟逾白',
            class: 'theme-jiangbi',
            preview: '#1E4A5A',
            price: 1000
        },
        yejing: {
            id: 'yejing',
            name: '野径',
            desc: '野径云俱黑',
            class: 'theme-yejing',
            preview: '#2D2D3A',
            price: 1000
        },
        zhuque: {
            id: 'zhuque',
            name: '朱雀',
            desc: '南方朱雀',
            class: 'theme-zhuque',
            preview: '#B7410E',
            price: 1500
        }
    },
    
    // 商店商品配置（保持不变）
    SHOP_ITEMS: {
        functional: [
            { id: 'skip_card', name: '跳过卡 ×3', icon: '⏭️', desc: '遇到难题？跳过它！不中断连击', price: 150, limit: 'daily', limitCount: 3 },
            { id: 'double_card', name: '双倍积分卡', icon: '💎', desc: '下一题得分翻倍！', price: 200, limit: 'daily', limitCount: 1 },
            { id: 'hint_upgrade', name: '提示升级 Lv.2', icon: '💡', desc: '永久解锁高级提示，显示部分答案', price: 500, type: 'permanent' },
            { id: 'hint_upgrade_3', name: '提示升级 Lv.3', icon: '🔍', desc: '永久解锁步骤分解', price: 1500, type: 'permanent', requires: 'hint_upgrade' }
        ],
        theme: [],  // 动态从THEMES生成
        limited: [
            { id: 'solar_catchup', name: '节气补签卡', icon: '📅', desc: '补领错过节气', price: 300, limit: 'per_term' },
            { id: 'scenic_preview', name: '景区预约券', icon: '🎫', desc: '提前解锁下批景区', price: 500, limit: 'monthly', limitCount: 2 }
        ]
    },
    
    METHOD_TYPES: ['positive', 'negative_both', 'negative_c', 'mixed', 'perfect_square', 'perfect_square_a', 'standard_cross', 'standard_cross_mixed', 'type1_large', 'type2_negative', 'type3_near_perfect', 'type4_prime', 'type5_substitution', 'type6_gcd']
};

// 生成打乱的问题（适配新架构）
CONFIG.getShuffledQuestions = function(level) {
    const presets = this.PRESETS[level];
    if (!presets || presets.length === 0) return [];
    
    let shuffled = Utils.shuffle([...presets]);
    
    // 确保相邻题目不会太相似（基础去重）
    for (let i = 1; i < shuffled.length; i++) {
        const prev = shuffled[i - 1];
        const curr = shuffled[i];
        
        const similar = (
            Math.abs(prev.b) === Math.abs(curr.b) ||
            Math.abs(prev.c) === Math.abs(curr.c) ||
            (prev.b === -curr.b && prev.c === curr.c)
        );
        
        if (similar) {
            for (let j = i + 1; j < shuffled.length; j++) {
                const candidate = shuffled[j];
                const stillSimilar = (
                    Math.abs(prev.b) === Math.abs(candidate.b) ||
                    Math.abs(prev.c) === Math.abs(candidate.c)
                );
                
                if (!stillSimilar) {
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    break;
                }
            }
        }
    }
    
    return shuffled;
};

// 获取难度配置（新增辅助方法）
CONFIG.getLevelConfig = function(level) {
    return this.LEVELS[level] || this.LEVELS.easy;
};

// 获取高级题型配置
CONFIG.getHardTypeConfig = function(typeId) {
    const types = Object.values(this.HARD_TYPES);
    return types.find(t => t.id === typeId) || types[0];
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}