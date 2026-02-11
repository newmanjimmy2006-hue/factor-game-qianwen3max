// Option.js - 选项管理器（LaTeX渲染版）

class OptionManager {
    constructor(container, onSelect) {
        this.container = container;
        this.onSelect = onSelect;
        this.options = [];
        this.elements = [];
        this.selectedSlots = [null, null];
        this.enabled = true;
    }
    
    // 渲染选项
    render(options) {
        this.options = options;
        this.selectedSlots = [null, null];
        this.elements = [];
        this.container.innerHTML = '';
        this.enabled = true;
        
        options.forEach((opt, index) => {
            const el = document.createElement('div');
            el.className = 'option';
            el.dataset.index = index;
            el.dataset.id = opt.id;
            
            // 创建LaTeX渲染容器
            const latexSpan = document.createElement('span');
            latexSpan.className = 'option-latex';
            el.appendChild(latexSpan);
            
            // 渲染LaTeX
            if (opt.latex) {
                Utils.renderLatex(latexSpan, opt.latex);
            } else {
                latexSpan.textContent = opt.text;
            }
            
            el.addEventListener('click', () => this.handleClick(index));
            
            this.container.appendChild(el);
            this.elements.push(el);
        });
    }
    
    // 处理点击
    handleClick(clickedIndex) {
        if (!this.enabled) return;
        
        const clickedOption = this.options[clickedIndex];
        
        const selections = [];
        this.selectedSlots.forEach((slotIdx, slotPos) => {
            if (slotIdx === clickedIndex) {
                selections.push(slotPos);
            }
        });
        
        const currentCount = selections.length;
        const emptySlotPos = this.selectedSlots.findIndex(idx => idx === null);
        
        if (currentCount >= 2) {
            const lastPos = selections[selections.length - 1];
            this.selectedSlots[lastPos] = null;
        } else if (currentCount === 1) {
            if (emptySlotPos !== -1) {
                this.selectedSlots[emptySlotPos] = clickedIndex;
            } else {
                this.selectedSlots[selections[0]] = null;
            }
        } else {
            if (emptySlotPos !== -1) {
                this.selectedSlots[emptySlotPos] = clickedIndex;
            }
        }
        
        this.updateVisuals();
        this.onSelect(this.getSelectedTexts());
    }
    
    // 获取已选中的文本
    getSelectedTexts() {
        return this.selectedSlots
            .map(idx => idx !== null ? this.options[idx].text : null)
            .filter(text => text !== null);
    }
    
    // 获取已选中的完整数据
    getSelectedData() {
        return this.selectedSlots
            .map(idx => idx !== null ? this.options[idx] : null)
            .filter(data => data !== null);
    }
    
    // 更新视觉效果
    updateVisuals() {
        this.elements.forEach(el => {
            el.dataset.selected = '0';
            const badge = el.querySelector('.option-count');
            if (badge) badge.remove();
        });
        
        const countMap = {};
        this.selectedSlots.forEach(idx => {
            if (idx !== null) {
                countMap[idx] = (countMap[idx] || 0) + 1;
            }
        });
        
        Object.entries(countMap).forEach(([index, count]) => {
            const el = this.elements[parseInt(index)];
            if (el) {
                el.dataset.selected = count.toString();
                
                if (count > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'option-count';
                    badge.textContent = count;
                    el.appendChild(badge);
                }
            }
        });
    }
    
    // 重置选择
    reset() {
        this.selectedSlots = [null, null];
        this.updateVisuals();
        this.enabled = true;
    }
    
    // 禁用点击
    disable() {
        this.enabled = false;
        this.elements.forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });
    }
    
    // 启用点击
    enable() {
        this.enabled = true;
        this.elements.forEach(el => {
            el.style.pointerEvents = '';
            el.style.opacity = '';
        });
    }
    
    // 获取当前选择状态
    getState() {
        return {
            selected: this.selectedSlots,
            texts: this.getSelectedTexts(),
            count: this.selectedSlots.filter(idx => idx !== null).length
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptionManager;
}
