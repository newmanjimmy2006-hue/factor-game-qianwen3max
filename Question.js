// Question.js - 修正版（修复递归溢出 + 添加兜底机制 + 增强parseFactor健壮性）

class Question {
    constructor(data) {
        this.a = data.a;
        this.b = data.b;
        this.c = data.c;
        this.factors = data.factors;
        this.baseFactors = data.baseFactors;
        this.gcd = data.gcd;
        this.scheme = data.scheme;
        this.method = data.method || 'normal';
        this.level = data.level || 'easy';
        this.hardType = data.hardType;
        this.yFactors = data.yFactors; // Type 5 专用
        this.substitution = data.substitution; // Type 5 专用
    }

    get expression() {
        return Utils.formatExpression(this.a, this.b, this.c);
    }

    get expressionLatex() {
        return Utils.formatExpression(this.a, this.b, this.c);
    }

    static formatFactor(factor) {
        const [d, e] = factor;
        let xPart = '';
        if (d === 1) xPart = 'x';
        else if (d === -1) xPart = '-x';
        else xPart = `${d}x`;
        
        if (e === 0) return xPart;
        return e > 0 ? `${xPart} + ${e}` : `${xPart} - ${Math.abs(e)}`;
    }

    static formatFactorLatex(d, e) {
        let latex = '';
        if (d === 1) latex += 'x';
        else if (d === -1) latex += '-x';
        else latex += `${d}x`;
        
        if (e > 0) latex += ` + ${e}`;
        else if (e < 0) latex += ` - ${Math.abs(e)}`;
        return `(${latex})`;
    }

    get factorStrings() {
        return this.factors.map(f => Question.formatFactor(f));
    }

    get factorLatex() {
        return this.factors.map(f => {
            const [d, e] = f;
            return Question.formatFactorLatex(d, e);
        });
    }

    // 【修复】增强解析健壮性，添加输入验证和NaN检查
    parseFactor(str) {
        if (!str || typeof str !== 'string') return [1, 0];
        
        str = str.replace(/\s+/g, '');
        
        // 匹配 GCD 格式：k(dx+e) 如 "3(2x+4)"
        const gcdMatch = str.match(/^(-?\d+)\((-?\d*)x([+-]\d+)\)$/);
        if (gcdMatch) {
            const k = parseInt(gcdMatch[1]);
            const d = gcdMatch[2] === '' || gcdMatch[2] === '-' ? 
                     (gcdMatch[2] === '-' ? -1 : 1) : parseInt(gcdMatch[2]);
            const e = parseInt(gcdMatch[3]);
            // 验证数值有效性
            if (isNaN(k) || isNaN(d) || isNaN(e)) return [1, 0];
            return [k * d, k * e];
        }
        
        // 匹配标准格式：dx+e 或 dx-e 或 x+e 或 -x+e
        const match = str.match(/^(-?\d*)x([+-]\d+)?$/);
        if (!match) {
            // 尝试匹配纯常数（如 "+6" 或 "-3" 或 "5"）
            const numMatch = str.match(/^([+-]?\d+)$/);
            if (numMatch) {
                const num = parseInt(numMatch[1]);
                return [0, isNaN(num) ? 0 : num];
            }
            return [1, 0];  // 默认返回 x
        }
        
        let d = 1;
        if (match[1]) {
            if (match[1] === '-') d = -1;
            else if (match[1] !== '') d = parseInt(match[1]);
        }
        let e = match[2] ? parseInt(match[2]) : 0;
        
        // 验证解析结果
        if (isNaN(d) || isNaN(e)) return [1, 0];
        
        return [d, e];
    }

    checkAnswer(selectedTexts) {
        if (!selectedTexts || selectedTexts.length !== 2) return false;
        
        const parsed = selectedTexts.map(text => this.parseFactor(text));
        const [[d1, e1], [d2, e2]] = parsed;
        
        // 检查解析是否失败（返回默认值）
        if (!parsed.every(p => Array.isArray(p) && p.length === 2)) return false;
        
        const expandedA = d1 * d2;
        const expandedB = d1 * e2 + d2 * e1;
        const expandedC = e1 * e2;
        
        if (expandedA === this.a && expandedB === this.b && expandedC === this.c) {
            return true;
        }
        
        if (this.method === 'type6_gcd') {
            if (expandedA === -this.a && expandedB === -this.b && expandedC === -this.c) {
                return false;
            }
            if (this.gcd && Math.abs(expandedA) === Math.abs(this.a * this.gcd)) {
                return false;
            }
        }
        
        return false;
    }

    generateOptions(level) {
        if (this.method === 'type6_gcd') {
            return this._generateGCDOptions(0);
        }
        return this._generateStandardOptions(level);
    }

    _generateGCDOptions(recursionDepth = 0) {
        const MAX_RETRIES = 5;
        
        if (recursionDepth > MAX_RETRIES) {
            console.warn(`GCD选项生成验证失败超过${MAX_RETRIES}次，使用兜底方案`);
            return this._generateGCDFallbackOptions();
        }
        
        const k = this.gcd;
        const [baseF1, baseF2] = this.baseFactors;
        const scheme = this.scheme;
        
        let nakedFactor, gcdFactor, otherBase;
        
        if (scheme === 'A') {
            nakedFactor = [...baseF1];
            gcdFactor = [baseF2[0] * k, baseF2[1] * k];
            otherBase = baseF2;
        } else {
            gcdFactor = [baseF1[0] * k, baseF1[1] * k];
            nakedFactor = [...baseF2];
            otherBase = baseF1;
        }
        
        const cards = [];
        
        cards.push(this._createOption(nakedFactor, 'naked', true, 1));
        cards.push(this._createOption(gcdFactor, 'gcd', true, 1));
        
        const gcdOnNaked = [nakedFactor[0] * k, nakedFactor[1] * k];
        cards.push(this._createOption(gcdOnNaked, 'trap_dup', false, 0));
        
        const negativeGCD = [-gcdFactor[0], -gcdFactor[1]];
        cards.push(this._createOption(negativeGCD, 'trap_neg', false, 0));
        
        const dist1 = [...otherBase];
        dist1[1] += Math.random() < 0.5 ? 1 : -1;
        cards.push(this._createOption(dist1, 'dist1', false, 0));
        
        const dist2 = [...baseF1];
        dist2[1] = -dist2[1];
        cards.push(this._createOption(dist2, 'dist2', false, 0));
        
        const shuffled = Utils.shuffle(cards);
        
        if (!this._verifyGCDUniqueness(shuffled, nakedFactor, gcdFactor, k)) {
            return this._generateGCDOptions(recursionDepth + 1);
        }
        
        return shuffled;
    }

    _generateGCDFallbackOptions() {
        const k = this.gcd;
        const [baseF1, baseF2] = this.baseFactors;
        const scheme = this.scheme;
        
        let nakedFactor, gcdFactor;
        if (scheme === 'A') {
            nakedFactor = [...baseF1];
            gcdFactor = [baseF2[0] * k, baseF2[1] * k];
        } else {
            gcdFactor = [baseF1[0] * k, baseF1[1] * k];
            nakedFactor = [...baseF2];
        }
        
        const makeDistractor = (base, modifier) => {
            const f = [...base];
            if (modifier === 'sign_e') f[1] = -f[1];
            else if (modifier === 'plus1') f[1] += 1;
            else if (modifier === 'minus1') f[1] -= 1;
            else if (modifier === 'swap') [f[0], f[1]] = [f[1], f[0]];
            return f;
        };
        
        const options = [
            this._createOption(nakedFactor, 'naked', true, 1),
            this._createOption(gcdFactor, 'gcd', true, 1),
            this._createOption(makeDistractor(nakedFactor, 'sign_e'), 'd1', false, 0),
            this._createOption(makeDistractor(gcdFactor, 'plus1'), 'd2', false, 0),
            this._createOption(makeDistractor(nakedFactor, 'plus1'), 'd3', false, 0),
            this._createOption(makeDistractor(baseF1, 'minus1'), 'd4', false, 0)
        ];
        
        return Utils.shuffle(options);
    }

    _verifyGCDUniqueness(options, nakedFactor, gcdFactor, k) {
        const findCard = (id) => options.find(o => o.id === id);
        const naked = findCard('naked');
        const gcd = findCard('gcd');
        const trapDup = findCard('trap_dup');
        const trapNeg = findCard('trap_neg');
        const dist1 = findCard('dist1');
        const dist2 = findCard('dist2');
        
        if (!naked || !gcd) return false;
        
        if (trapDup) {
            const check1 = this._expandAndCompare(nakedFactor, [nakedFactor[0]*k, nakedFactor[1]*k]);
            if (check1.matches) return false;
        }
        
        if (trapNeg) {
            const check2 = this._expandAndCompare(nakedFactor, [-gcdFactor[0], -gcdFactor[1]]);
            if (check2.matches) return false;
        }
        
        const check3 = this._expandAndCompare(gcdFactor, [nakedFactor[0]*k, nakedFactor[1]*k]);
        if (check3.matches) return false;
        
        const dists = [dist1, dist2].filter(Boolean);
        for (let dist of dists) {
            const parsed = this.parseFactor(dist.text);
            for (let other of options) {
                if (other === dist || !other.factor) continue;
                const check = this._expandAndCompare(parsed, other.factor);
                if (check.matches) return false;
            }
        }
        
        return true;
    }

    _expandAndCompare(f1, f2) {
        const [d1, e1] = f1;
        const [d2, e2] = f2;
        const a = d1 * d2;
        const b = d1 * e2 + d2 * e1;
        const c = e1 * e2;
        return {
            a, b, c,
            matches: a === this.a && b === this.b && c === this.c
        };
    }

    _generateStandardOptions(level) {
        const correctFactors = this.factors;
        const isPerfectSquare = correctFactors[0][0] === correctFactors[1][0] && 
                               correctFactors[0][1] === correctFactors[1][1];
        
        const slots = new Array(6).fill(null);
        const correctPositions = this._selectTwoDistinctPositions(6);
        
        if (isPerfectSquare) {
            slots[correctPositions[0]] = this._createOption(correctFactors[0], 'c0', true, 1);
            slots[correctPositions[1]] = this._createOption(correctFactors[0], 'c1', true, 2);
        } else {
            const factors = Math.random() > 0.5 ? correctFactors : [correctFactors[1], correctFactors[0]];
            slots[correctPositions[0]] = this._createOption(factors[0], 'c0', true, 1);
            slots[correctPositions[1]] = this._createOption(factors[1], 'c1', true, 1);
        }
        
        const distractors = this._generateDistractors(4, level);
        this._fillDistractors(slots, distractors);
        
        return slots;
    }

    _generateDistractors(count, level) {
        const [f1, f2] = this.factors;
        const distractors = new Set();
        const strategies = [
            () => [f1[0], -f1[1]],
            () => [f2[0], -f2[1]],
            () => [f1[0], f1[1] + 1],
            () => [f2[0], f2[1] + 1],
            () => [f1[0], f1[1] - 1],
            () => [f2[0], f2[1] - 1],
            () => [-f1[0], f1[1]],
            () => [-f2[0], f2[1]],
            () => [f1[1], f1[0]],
            () => [f2[1], f2[0]]
        ];
        
        if (this.a !== 1) {
            strategies.push(
                () => [Utils.randomInt(1, 4), Utils.randomInt(-8, 8)],
                () => [Utils.randomInt(1, 5), Utils.randomInt(-10, 10)]
            );
        }
        
        let attempts = 0;
        const correctStrings = this.factorStrings.map(f => Question.formatFactor(f));
        
        while (distractors.size < count && attempts < 50) {
            const strategy = strategies[Utils.randomInt(0, strategies.length - 1)];
            let fake = strategy();
            
            if (this.a === 1 && Math.abs(fake[0]) !== 1) {
                fake[0] = Math.random() < 0.5 ? 1 : -1;
            }
            
            const fakeStr = Question.formatFactor(fake);
            if (!correctStrings.includes(fakeStr) && fakeStr !== '0') {
                distractors.add(fakeStr);
            }
            attempts++;
        }
        
        while (distractors.size < count) {
            let d = this.a === 1 ? (Math.random() < 0.5 ? 1 : -1) : Utils.randomInt(1, 5);
            let e = Utils.randomInt(-12, 12);
            const fakeStr = Question.formatFactor([d, e]);
            if (!correctStrings.includes(fakeStr)) {
                distractors.add(fakeStr);
            }
        }
        
        return Array.from(distractors).slice(0, count);
    }

    _createOption(factor, id, isCorrect, instance) {
        const [d, e] = factor;
        const text = Question.formatFactor(factor);
        const hasGCD = Math.abs(d) > 6 || (Math.abs(d) > 1 && this.method === 'type6_gcd');
        
        return {
            text: text,
            latex: Question.formatFactorLatex(d, e),
            id: id,
            isCorrect: isCorrect,
            instance: instance,
            factor: factor
        };
    }

    _selectTwoDistinctPositions(total) {
        if (total < 2) return [0, 0];
        const pos1 = Utils.randomInt(0, total - 1);
        let pos2;
        let attempts = 0;
        do {
            pos2 = Utils.randomInt(0, total - 1);
            attempts++;
            if (attempts > 100) break;
        } while (pos2 === pos1);
        return [pos1, pos2].sort((a, b) => a - b);
    }

    _fillDistractors(slots, distractors) {
        let idx = 0;
        for (let i = 0; i < slots.length; i++) {
            if (slots[i] === null && idx < distractors.length) {
                const parsed = this.parseFactor(distractors[idx]);
                slots[i] = {
                    text: distractors[idx],
                    latex: Question.formatFactorLatex(parsed[0], parsed[1]),
                    id: `d${idx}`,
                    isCorrect: false,
                    instance: 0,
                    factor: parsed
                };
                idx++;
            }
        }
    }

    get steps() {
        if (this.method === 'type6_gcd') {
            const [f1, f2] = this.baseFactors;
            return [
                `观察原式 $${this.expressionLatex}$，各项有公因数 ${this.gcd}`,
                `提取公因数：$${this.gcd}(${this._formatBaseExpression()})$`,
                `对括号内因式分解：$(${Question.formatFactor(f1)})(${Question.formatFactor(f2)})$`,
                `∴ 原式 = $${this.factorLatex[0]} \\times ${this.factorLatex[1]}$`
            ];
        }
        
        const [f1, f2] = this.factors;
        const steps = [];
        
        if (this.a === 1) {
            steps.push(`对于 $x^2 ${this._sign(this.b)}x ${this._sign(this.c)}$：`);
            steps.push(`寻找两数 m、n，满足：m + n = ${this.b}，m × n = ${this.c}`);
            steps.push(`解得：m = ${f1[1]}, n = ${f2[1]}`);
            steps.push(`∴ 原式 = $(x ${this._sign(f1[1])})(x ${this._sign(f2[1])})$`);
        } else {
            steps.push(`对于 $${this.a}x^2 ${this._sign(this.b)}x ${this._sign(this.c)}$：`);
            steps.push(`使用十字相乘法：`);
            steps.push(`  ${f1[0]}    ${f1[1]}`);
            steps.push(`   ╲  ╱`);
            steps.push(`   ╱  ╲`);
            steps.push(`  ${f2[0]}    ${f2[1]}`);
            steps.push(`验证：${f1[0]}×${f2[1]} + ${f2[0]}×${f1[1]} = ${f1[0]*f2[1] + f2[0]*f1[1]} = ${this.b} ✓`);
            steps.push(`∴ 原式 = $(${Question.formatFactor(f1)})(${Question.formatFactor(f2)})$`);
        }
        return steps;
    }

    get hint() {
        if (this.method === 'type6_gcd') {
            return `先提取公因数 ${this.gcd}，再对剩余部分十字相乘`;
        }
        if (this.method === 'type5_substitution' && this.substitution) {
            return `尝试令 $y = x ${this.substitution.k > 0 ? '+' : ''}${this.substitution.k}$，观察是否能化为关于 $y$ 的完全平方或简单十字相乘`;
        }
        if (this.a === 1) {
            return `寻找两数，和为${this.b}，积为${this.c}`;
        }
        return `十字相乘：${this.a}分解为${this.factors[0][0]}×${this.factors[1][0]}，常数项分解后交叉相乘再相加应等于${this.b}`;
    }

    _sign(n) {
        return n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`;
    }

    _formatBaseExpression() {
        const baseA = this.a / this.gcd;
        const baseB = this.b / this.gcd;
        const baseC = this.c / this.gcd;
        return Utils.formatExpression(baseA, baseB, baseC);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Question;
}