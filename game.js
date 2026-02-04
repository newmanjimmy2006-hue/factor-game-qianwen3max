// game.js - 带彩带动画的完整版

let currentDifficulty = 'beginner';
let currentProblem = null;
let selected = [null, null];

// ========== 彩带动画系统 ==========
function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  
  // 设置画布尺寸为窗口大小
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const particles = [];
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'];

  class Particle {
    constructor() {
      this.x = canvas.width / 2;
      this.y = canvas.height / 2;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.radius = Math.random() * 3 + 1;
      this.velocity = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10 - 6 // 向上偏一点
      };
      this.alpha = 1;
      this.decay = Math.random() * 0.03 + 0.015;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    update() {
      this.x += this.velocity.x;
      this.y += this.velocity.y;
      this.alpha -= this.decay;
      this.draw();
      return this.alpha > 0;
    }
  }

  // 创建 150 个粒子
  for (let i = 0; i < 150; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update()) {
        particles.splice(i, 1);
      }
    }
    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      canvas.style.display = 'none';
    }
  }

  animate();
}

// ========== 原有功能 ==========
function formatPoly(a, b, c) {
  let s = '';
  if (a !== 0) {
    if (a === 1) s += 'x²';
    else if (a === -1) s += '-x²';
    else s += a + 'x²';
  }
  if (b !== 0) {
    if (s && b > 0) s += '+';
    if (b === 1) s += 'x';
    else if (b === -1) s += '-x';
    else s += b + 'x';
  }
  if (c !== 0) {
    if (s && c > 0) s += '+';
    s += c;
  }
  return s || '0';
}

function formatFactor(d, e) {
  let str = '';
  if (d === 1) str = 'x';
  else if (d === -1) str = '-x';
  else str = d + 'x';
  
  if (e > 0) str += '+' + e;
  else if (e < 0) str += e;
  
  return '(' + str + ')';
}

function parseFactor(str) {
  str = str.replace(/[()]/g, '');
  let d = 1, e = 0;
  if (str.includes('x')) {
    const idx = str.indexOf('x');
    const coef = str.substring(0, idx);
    const rest = str.substring(idx + 1);
    
    if (coef === '' || coef === '+') d = 1;
    else if (coef === '-') d = -1;
    else d = parseInt(coef) || 1;
    
    if (rest === '') e = 0;
    else if (rest === '+') e = 1;
    else if (rest === '-') e = -1;
    else e = parseInt(rest) || 0;
  } else {
    d = 0;
    e = parseInt(str) || 0;
  }
  return { d, e };
}

function multiply(f1, f2) {
  const a = f1.d * f2.d;
  const b = f1.d * f2.e + f1.e * f2.d;
  const c = f1.e * f2.e;
  return { a, b, c };
}

function generateProblem(difficulty) {
  let d1, d2, e1, e2;

  if (difficulty === 'beginner') {
    d1 = 1; d2 = 1;
    e1 = Math.floor(Math.random() * 21) - 10;
    e2 = Math.floor(Math.random() * 21) - 10;
  } 
  else if (difficulty === 'intermediate') {
    d1 = 1; d2 = 1;
    e1 = Math.floor(Math.random() * 41) - 20;
    e2 = Math.floor(Math.random() * 41) - 20;
  } 
  else if (difficulty === 'advanced') {
    d1 = Math.floor(Math.random() * 4) + 2;
    d2 = Math.floor(Math.random() * 3) + 1;
    e1 = Math.floor(Math.random() * 21) - 10;
    e2 = Math.floor(Math.random() * 21) - 10;
  }

  const a = d1 * d2;
  const b = d1 * e2 + e1 * d2;
  const c = e1 * e2;

  const correct1 = formatFactor(d1, e1);
  const correct2 = formatFactor(d2, e2);

  // 正确答案可能相同（如完全平方），所以先放入两个
  const correctAnswers = [correct1, correct2];
  const options = [...correctAnswers]; // 复制正确答案（保留重复）

  // 用 Set 记录已有的选项，避免干扰项重复
  const existing = new Set(correctAnswers);

  // 补充到至少 6 个选项（如果正确答案相同，初始只有1个，需补5个；不同则补4个）
  while (options.length < 6) {
    let d, e;
    if (difficulty === 'advanced') {
      d = Math.floor(Math.random() * 4) + 1;
      e = Math.floor(Math.random() * 21) - 10;
    } else {
      d = 1;
      e = Math.floor(Math.random() * 41) - 20;
    }
    const candidate = formatFactor(d, e);
    if (!existing.has(candidate)) {
      options.push(candidate);
      existing.add(candidate);
    }
  }

  // 打乱顺序
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    a, b, c,
    correct: correctAnswers,
    options: options
  };
}
function render() {
  currentProblem = generateProblem(currentDifficulty);
  document.getElementById('problem').textContent = formatPoly(currentProblem.a, currentProblem.b, currentProblem.c);
  
  const opts = [...currentProblem.options].sort(() => Math.random() - 0.5);
  const optEl = document.getElementById('options');
  optEl.innerHTML = '';
// 先清空 selected 标记
const optionElements = [];

opts.forEach(opt => {
  const div = document.createElement('div');
  div.className = 'option';
  div.textContent = opt;
  div.dataset.value = opt; // ← 存储因式值，用于匹配
  div.onclick = () => {
    selectOption(opt);
    updateOptionHighlight(); // ← 点完后更新高亮
  };
  optEl.appendChild(div);
  optionElements.push(div);
});

// 保存到全局（或闭包），供 updateOptionHighlight 使用
window._currentOptionElements = optionElements;
  selected = [null, null];
  updateSlotDisplay();
  document.getElementById('feedback').textContent = '';
}

function updateSlotDisplay() {
  const slot1 = document.getElementById('slot1');
  const slot2 = document.getElementById('slot2');
  
  slot1.textContent = selected[0] || '';
  slot2.textContent = selected[1] || '';
  
  slot1.className = selected[0] ? 'slot filled' : 'slot';
  slot2.className = selected[1] ? 'slot filled' : 'slot';
  updateOptionHighlight();
}

function updateOptionHighlight() {
  const elements = window._currentOptionElements || [];
  const [s1, s2] = selected;

  elements.forEach(el => {
    const val = el.dataset.value;
    if (val === s1 || val === s2) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
}

function selectOption(opt) {
  if (selected[0] !== null && selected[1] !== null) {
    selected = [null, null];
  }

  if (selected[0] === null) {
    selected[0] = opt;
  } else if (selected[1] === null) {
    selected[1] = opt;
  } else {
    selected = [opt, null];
  }

  updateSlotDisplay();
}

function checkAnswer() {
  if (!selected[0] || !selected[1]) {
    document.getElementById('feedback').innerHTML = '<span class="incorrect">请选择两个因式！</span>';
    return;
  }

  const startTime = performance.now(); // 记录开始判题时间（近似答题时间）

  try {
    const f1 = parseFactor(selected[0]);
    const f2 = parseFactor(selected[1]);
    const result = multiply(f1, f2);
    const orig = currentProblem;

    const endTime = performance.now();
    const timeUsed = (endTime - startTime) / 1000; // 秒

    if (result.a === orig.a && result.b === orig.b && result.c === orig.c) {
      document.getElementById('feedback').innerHTML = '<span class="correct">✅ 正确！</span>';
      
      // 🎉 触发彩带
      startConfetti();
      
      // 🏅 更新成就（答对）
      window.updateAchievementsOnCorrect(timeUsed, currentDifficulty);
      
      setTimeout(render, 1500);
    } else {
      document.getElementById('feedback').innerHTML = '<span class="incorrect">❌ 错误！再试试。</span>';
      
      // 🏅 更新成就（答错）
      window.updateAchievementsOnError();
    }
  } catch (e) {
    document.getElementById('feedback').innerHTML = '<span class="incorrect">解析出错，请重试。</span>';
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const difficultySelect = document.getElementById('difficulty');
  const submitBtn = document.getElementById('submit');

  render();

  difficultySelect.addEventListener('change', () => {
    currentDifficulty = difficultySelect.value;
    render();
  });

  submitBtn.addEventListener('click', checkAnswer);

  document.getElementById('slot1').addEventListener('click', () => {
    if (selected[0]) {
      selected[0] = null;
      updateSlotDisplay();
    }
  });
  document.getElementById('slot2').addEventListener('click', () => {
    if (selected[1]) {
      selected[1] = null;
      updateSlotDisplay();
    }
  });
});
// ========== 徽章与成就系统 ==========

// 初始化成就数据
function initAchievements() {
  const today = new Date().toDateString();
  let data = JSON.parse(localStorage.getItem('mathGameAchievements')) || {};

  // 如果是新的一天，重置今日数据
  if (data.lastPlayed !== today) {
    data = {
      lastPlayed: today,
      todayCorrect: 0,
      todayErrors: 0,
      todayStreak: 0,
      bestStreakToday: 0,
      todayFastest: null,
      // 历史徽章（永久）
      totalBeginner: 0,
      totalIntermediate: 0,
      totalAdvanced: 0,
      everPlayed: true,
      badges: data.badges || {}
    };
  }

  // 确保徽章记录存在
  const allBadges = [
    'firstPlay', 'beginnerMaster', 'intermediateWarrior', 'advancedKing',
    'newbie', 'fiveCorrect', 'perfectDay', 'speedster'
  ];
  allBadges.forEach(b => {
    if (data.badges[b] === undefined) data.badges[b] = false;
  });

  localStorage.setItem('mathGameAchievements', JSON.stringify(data));
  return data;
}

// 保存成就数据
function saveAchievements(data) {
  localStorage.setItem('mathGameAchievements', JSON.stringify(data));
}

// 检查并解锁徽章
function checkAndUnlockBadges(data) {
  const unlocked = [];

  // 历史徽章
  if (!data.badges.firstPlay) {
    data.badges.firstPlay = true;
    unlocked.push('【数学启航】首次玩游戏！');
  }
  if (data.totalBeginner >= 20 && !data.badges.beginnerMaster) {
    data.badges.beginnerMaster = true;
    unlocked.push('【初级大师】在初级难度答对20题！');
  }
  if (data.totalIntermediate >= 15 && !data.badges.intermediateWarrior) {
    data.badges.intermediateWarrior = true;
    unlocked.push('【中级勇士】在中级难度答对15题！');
  }
  if (data.totalAdvanced >= 10 && !data.badges.advancedKing) {
    data.badges.advancedKing = true;
    unlocked.push('【因式王者】在高级难度答对10题！');
  }

  // 今日成就
  if (data.todayCorrect >= 1 && !data.badges.newbie) {
    data.badges.newbie = true;
    unlocked.push('【新手上路】今日答对第1题！');
  }
  if (data.todayCorrect >= 5 && !data.badges.fiveCorrect) {
    data.badges.fiveCorrect = true;
    unlocked.push('【小试牛刀】今日答对5题！');
  }
  if (data.todayCorrect >= 5 && data.todayErrors === 0 && !data.badges.perfectDay) {
    data.badges.perfectDay = true;
    unlocked.push('【百发百中】今日0错误完成5题以上！');
  }
  if (data.todayFastest !== null && data.todayFastest <= 8 && !data.badges.speedster) {
    data.badges.speedster = true;
    unlocked.push('【闪电手】单题答题快于8秒！');
  }

  if (unlocked.length > 0) {
    saveAchievements(data);
    showBadgePopup(unlocked);
  }
}

// 弹出徽章提示
function showBadgePopup(messages) {
  let html = '<div style="text-align:center; padding:15px; background:#fff8e1; border-radius:8px; margin-bottom:10px;">';
  messages.forEach(msg => {
    html += `<div>🎉 ${msg}</div>`;
  });
  html += '</div>';
  
  const feedback = document.getElementById('feedback');
  feedback.innerHTML = html + feedback.innerHTML;
  
  // 3秒后自动移除
  setTimeout(() => {
    if (feedback.innerHTML.includes('🎉')) {
      feedback.innerHTML = feedback.innerHTML.replace(/<div[^>]*>🎉.*?<\/div>/g, '');
    }
  }, 3000);
}

// 显示成就面板
function renderAchievementsPanel() {
  const data = JSON.parse(localStorage.getItem('mathGameAchievements')) || initAchievements();
  const today = new Date().toDateString();
  
  // 如果数据不是今天的，重新初始化
  if (data.lastPlayed !== today) {
    initAchievements();
    return renderAchievementsPanel();
  }

  let html = `<p><strong>日期：</strong>${new Date().toLocaleDateString('zh-CN')}</p>`;
  
  // 今日已获得
  html += '<h4>✅ 已获得</h4><ul>';
  const todayBadges = [
    { key: 'newbie', name: '【新手上路】答对1题' },
    { key: 'fiveCorrect', name: '【小试牛刀】答对5题' },
    { key: 'perfectDay', name: '【百发百中】0错误（≥5题）' },
    { key: 'speedster', name: '【闪电手】单题≤8秒' }
  ];
  let hasToday = false;
  todayBadges.forEach(b => {
    if (data.badges[b.key]) {
      html += `<li>${b.name}</li>`;
      hasToday = true;
    }
  });
  if (!hasToday) html += '<li>暂无</li>';
  html += '</ul>';

  // 进行中
  html += '<h4>⏳ 进行中</h4><ul>';
  html += `<li>今日答对：${data.todayCorrect} 题</li>`;
  html += `<li>今日错误：${data.todayErrors} 次</li>`;
  html += `<li>当前连对：${data.todayStreak} 题（今日最高：${data.bestStreakToday}）</li>`;
  if (data.todayFastest !== null) {
    html += `<li>最快答题：${data.todayFastest.toFixed(1)} 秒</li>`;
  } else {
    html += `<li>最快答题：-</li>`;
  }
  html += '</ul>';

  // 历史徽章
  html += '<h4>🎖️ 历史徽章</h4><ul>';
  const historyBadges = [
    { key: 'firstPlay', name: '【数学启航】首次玩游戏' },
    { key: 'beginnerMaster', name: '【初级大师】初级答对20题' },
    { key: 'intermediateWarrior', name: '【中级勇士】中级答对15题' },
    { key: 'advancedKing', name: '【因式王者】高级答对10题' }
  ];
  let hasHistory = false;
  historyBadges.forEach(b => {
    if (data.badges[b.key]) {
      html += `<li>${b.name}</li>`;
      hasHistory = true;
    }
  });
  if (!hasHistory) html += '<li>再接再厉！</li>';
  html += '</ul>';

  document.getElementById('achievements-content').innerHTML = html;
}

// 绑定成就按钮
document.addEventListener('DOMContentLoaded', () => {
  const showBtn = document.getElementById('show-achievements');
  const closeBtn = document.getElementById('close-achievements');
  const overlay = document.getElementById('overlay');

  if (showBtn) {
    showBtn.onclick = () => {
      renderAchievementsPanel();
      document.getElementById('achievements-panel').style.display = 'block';
      overlay.style.display = 'block';
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById('achievements-panel').style.display = 'none';
      overlay.style.display = 'none';
    };
  }

  if (overlay) {
    overlay.onclick = () => {
      document.getElementById('achievements-panel').style.display = 'none';
      overlay.style.display = 'none';
    };
  }
});

// 在答对时调用（稍后集成到 checkAnswer）
window.updateAchievementsOnCorrect = function(timeUsed, difficulty) {
  let data = JSON.parse(localStorage.getItem('mathGameAchievements')) || initAchievements();
  
  // 更新今日数据
  data.todayCorrect++;
  data.todayStreak++;
  if (data.todayStreak > data.bestStreakToday) {
    data.bestStreakToday = data.todayStreak;
  }
  
  // 记录最快时间
  if (timeUsed !== null) {
    if (data.todayFastest === null || timeUsed < data.todayFastest) {
      data.todayFastest = timeUsed;
    }
  }
  
  // 累计历史题数
  if (difficulty === 'beginner') data.totalBeginner++;
  else if (difficulty === 'intermediate') data.totalIntermediate++;
  else if (difficulty === 'advanced') data.totalAdvanced++;
  
  saveAchievements(data);
  checkAndUnlockBadges(data);
};

// 答错时调用
window.updateAchievementsOnError = function() {
  let data = JSON.parse(localStorage.getItem('mathGameAchievements')) || initAchievements();
  data.todayErrors++;
  data.todayStreak = 0; // 连对中断
  saveAchievements(data);
};