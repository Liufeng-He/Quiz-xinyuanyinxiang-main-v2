import { ARCHETYPES, buildPrivateReply, calculateResult } from "./scoring.js";

const $ = (selector, root = document) => root.querySelector(selector);
const screens = {
  landing: $("#landing"), quiz: $("#quiz"), loading: $("#loading"), result: $("#result")
};
const mount = $("#questionMount");
const validation = $("#validationMessage");
const state = {};
let currentId = "basic";
let history = [];
let submittedResponse = false;

// Source: 北京大学官网“学部与院系”（按官网分组，2026-08 核对）。
const PKU_DEPARTMENTS = [
  ["理学部", ["数学科学学院", "物理学院", "化学与分子工程学院", "生命科学学院", "城市与环境学院", "地球与空间科学学院", "心理与认知科学学院", "建筑与景观设计学院"]],
  ["信息科学与技术学部", ["信息科学技术学院", "计算机学院", "电子学院", "集成电路学院", "智能学院", "王选计算机研究所", "软件与微电子学院", "软件工程国家工程研究中心"]],
  ["工学部", ["工学院", "力学与工程科学学院", "先进制造与机器人学院", "材料科学与工程学院", "未来技术学院", "环境科学与工程学院"]],
  ["人文学部", ["中国语言文学系", "历史学系", "考古文博学院", "哲学系（宗教学系）", "外国语学院", "艺术学院", "对外汉语教育学院", "歌剧研究院"]],
  ["社会科学学部", ["国际关系学院", "法学院", "信息管理系", "社会学系", "政府管理学院", "马克思主义学院", "教育学院", "新闻与传播学院", "体育教研部"]],
  ["经济与管理学部", ["经济学院", "光华管理学院", "人口研究所", "国家发展研究院"]],
  ["医学部", ["基础医学院", "药学院", "公共卫生学院", "护理学院", "医学人文学院", "医学继续教育学院"]],
  ["跨学科类", ["元培学院", "燕京学堂", "区域与国别研究院", "人工智能研究院", "碳中和研究院", "前沿交叉学科研究院", "北京国际数学研究中心", "现代农学院"]],
  ["深圳研究生院", ["信息工程学院", "化学生物学与生物技术学院", "环境与能源学院", "城市规划与设计学院", "新材料学院", "科学智能学院", "汇丰商学院", "国际法学院", "人文社会科学学院"]]
];

const optionSets = {
  identity: [["major", "🧠 心理学主修"], ["double", "📚 心理学双学位"], ["external", "🌍 外院系同学"]],
  recommendation: [
    ["5", "🌟 很愿意推荐", "会主动推荐给朋友"],
    ["4", "👍 值得一试", "有比较明确的吸引点"],
    ["3", "🙂 看情况", "还需要更多信息"],
    ["2", "🤔 谨慎推荐", "可能只适合部分人"],
    ["1", "🙅 不推荐", "目前没有足够理由推荐"]
  ],
  highReasons: [
    ["teacher", "🎬 老师讲得有画面感"], ["interest", "🎮 体验有趣，感觉没上够"],
    ["useful", "🧰 传授很多生活小妙招，非常实用"], ["workload_match", "🎒 适量的作业带来超量的收获"],
    ["challenge_gain", "✨ 意料之外，体感不赖"], ["science", "🧠 结课后还在脑子里刷存在感"]
  ],
  midReasons: [
    ["info_limited", "🔍 了解得还不够，推荐键暂时按不下去"], ["course_varies", "🎲 课程各有脾气，得看老师和内容"],
    ["difficulty_concern", "📈 担心基础跟不上，开局就进入困难模式"], ["workload_concern", "⏳ 作业和考核看起来有点占用人生"],
    ["fit_varies", "🧭 内容可能有用，但不一定人人对上频道"], ["mixed", "🌗 一半让人上头，一半让人冷静"]
  ],
  lowReasons: [
    ["difficulty_high", "🏔️ 难度比预期高，爬到一半开始怀疑人生"], ["workload_bad", "⚖️ 作业不少，收获暂时没有同步到账"],
    ["expectation_gap", "🛤️ 内容或节奏和期待走上了不同路线"], ["low_use", "🫥 知识进了脑子，实际用途还没现身"],
    ["teaching_bad", "🌧️ 课堂体验没有成功让我入戏"], ["info_only", "🔍 目前了解有限，不想隔空打分"]
  ],
  misconception: [
    ["mindread", "🔮 那你猜猜我现在在想什么？）", "认知"],
    ["hypnosis", "🌀 你会催眠吗，顺便能帮我解个梦吗？", "认知 / 临床"],
    ["development", "👶 发展心理学就是研究小孩怎么长大的吗？", "发展"],
    ["counseling", "💬 没病为什么要做心理咨询？", "临床与咨询"],
    ["lie", "🕵️ 你是不是一眼就能看出谁在撒谎？", "社会与人格"],
    ["brain", "🧠 心理学就是看脑电、核磁？", "脑与神经"],
    ["freud", "🛋️ 你们天天研究弗洛伊德吗？", "临床与咨询"]
  ],
  merch: [["0", "☁️ 0 件（目前处于云吸吉祥物阶段）", "还在云吸吉祥物"], ["1-5", "🌱 1–5 件（刚入坑）", "刚刚入坑"], ["6-10", "🌿 6–10 件（稳定扩充中）", "稳定扩充中"], ["11+", "🌳 11 件及以上（周边收藏家）", "周边收藏家"]],
  merchPreferences: [
    ["comic", "📖 漫画"], ["stickers", "😆 表情包"], ["animation", "🎬 动画短片"], ["wallpaper", "🖼️ 壁纸"],
    ["pendant", "🔑 挂件"], ["clothing", "👕 服饰"], ["acrylic", "🪧 亚克力立牌"], ["plush", "🧸 毛绒玩偶"],
    ["figure", "🗿 小模型 / 手办"], ["other", "✍️ 其他"]
  ],
  primaryFocus: [
    ["courses", "🎓 课程、讲座与知识分享", "探索"], ["research", "🔬 学术研究、实验与实验招募", "探索"],
    ["training", "🧭 人才培养、专业发展与就业去向", "探索"], ["service", "💚 心理服务与心理健康信息", "陪伴"],
    ["activities", "🎪 学生活动与校园氛围", "陪伴"], ["culture", "🧸 吉祥物、文创与视觉形象", "陪伴"]
  ],
  future: [
    ["popularize", "💡 把知识讲得好懂又好玩（趣味科普活动）", "趣味科普"], ["workshop", "🧰 学完马上能用（面向全校的实用工作坊）", "全校实用工作坊"],
    ["mascot", "🧸 让吉祥物多出来营业（吉祥物 / 文创）", "吉祥物 / 文创"], ["openlab", "🔬 推开实验室的门看看（实验室开放日）", "实验室开放日"],
    ["service_info", "🧭 求助信息不再像寻宝（心理服务信息更好找）", "心理服务信息更好找"], ["cross", "🤝 组队打破院系墙（跨学院合作活动）", "跨学院合作活动"]
  ],
  lifeCourses: [
    ["debunk_mindread", "🔮 面对“你猜猜我现在在想什么？”，熟练回答：“真猜不到。”"],
    ["evidence", "📊 看见任何现象，先在心里问一句：“样本量多大？统计量多大？显不显著？”"],
    ["no_diagnose", "🩺 不随便给身边的人下诊断（避免非专业情境下随意贴标签）"], ["refuse_free", "🛑 礼貌拒绝以朋友身份提供心理咨询，明确朋友关系与专业服务的边界"],
    ["allow_emotion", "🌊 允许自己有情绪，不强迫自己快速消化"], ["understand_self", "🔍 试着用学到的知识解构自己的行为、情绪和想法"],
    ["deadline", "⏰ 与拖延、焦虑和 DDL 保持复杂但稳定的关系"], ["pseudoscience", "🕵️ 识别伪心理学，并审慎看待“测完就贴标签”的网络测试（区分娱乐测试与规范心理测量）"],
    ["jargon", "🎭 突然冒出专业名词唬住一起讨论八卦的朋友们"]
  ],
  lifeUses: [
    ["regulate", "🌤️ 以前情绪上头，现在理智能让我延迟发疯"], ["communicate", "🤝 人际交往从“鸡同鸭讲”进化到“有效沟通”"],
    ["why_me", "🪞 终于知道自己为什么“又这样了”"], ["relationship", "🫶 谈恋爱少点猜谜，家庭群里不再宫斗"],
    ["behavior_no_diagnosis", "🔍 看懂迷惑行为，忍住不隔空诊断，理解行为不等于能够作出临床诊断"], ["habit_change", "🧭 坏习惯还在，只是现在犯得明明白白"],
    ["everywhere", "🌈 哪哪都用上了，润物细无声"], ["no_change", "📚 知识进入了脑子，生活暂时没有变化"]
  ],
  experimentYes: [
    ["curious_result", "🐱 好奇心得到满足，甚至有点想知道实验结果"], ["game", "🎮 像在完成小游戏，只是每一次点击都可能成为数据"],
    ["rigorous", "🔬 比想象中严谨，对心理学的科学性有了新的认识"], ["normal", "😇 全程努力“表现正常”，后来又怀疑：这份努力会不会也算一种反应"],
    ["hidden_goal", "🕶️ 做完依旧猜不到实验目的，神秘感保持到了最后"], ["compensation", "💰 既对科学好奇，也不拒绝一份合理的参与报酬"],
    ["reflect", "🤔 结束后短暂思考：刚才那些反应，到底说明了什么"], ["calm", "🌊 体验比较平静，没有发生预想中的“被看穿”"],
    ["mismatch", "⚠️ 流程、耗时或体验与预期不太一致"]
  ],
  experimentNo: [
    ["closed", "🏃 每次看到招募信息时，报名已经结束了"], ["no_link", "🧭 报名入口与我之间似乎还缺一点缘分"],
    ["busy", "📚 课程、作业和 DDL 已经把日程塞满"], ["learn_first", "❓ 对实验流程了解不多，想先看明白再决定"],
    ["privacy", "🔐 对个人信息和隐私问题略有保留"], ["discomfort", "🌧️ 担心实验过程带来不适或压力"],
    ["science_busy", "🗓️ 有兴趣，但招募时段总和我的空闲时间对不上"], ["science_pay", "💰 对科学有热情，也会认真看看参与报酬是否合适"],
    ["no_interest", "💤 目前对参加心理学实验兴趣不大"]
  ]
};

function steps() {
  const list = ["basic", "recommendation"];
  if (Number(state.recommendation) >= 4) list.push("recommendedCourse");
  list.push("reasons", "misconception", "mascotKnown");
  if (state.mascotKnown === "yes") list.push("mascotMatch", "merch", "merchPreferences");
  return [...list, "presence", "primaryFocus", "future", "lifeCourses", "lifeUses", "experimentJoined", "experimentReasons", "keywords", "private"];
}

const sections = {
  basic: "关于你", recommendation: "课程印象", recommendedCourse: "课程印象", reasons: "课程印象",
  misconception: "印象拼图", mascotKnown: "印象拼图", mascotMatch: "印象拼图", merch: "印象拼图", merchPreferences: "印象拼图",
  presence: "校园观察", primaryFocus: "校园观察", future: "校园观察",
  lifeCourses: "心理学与生活", lifeUses: "心理学与生活", experimentJoined: "实验经历", experimentReasons: "实验经历",
  keywords: "三个词", private: "最后一句"
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function show(name) {
  for (const [key, screen] of Object.entries(screens)) screen.hidden = key !== name;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function optionHtml(name, options, { multi = false } = {}) {
  const values = multi ? (state[name] ?? []) : [String(state[name] ?? "")];
  return `<div class="option-list">${options.map(([value, title]) => `
    <label class="option-card" data-kind="${multi ? "checkbox" : "radio"}">
      <input type="${multi ? "checkbox" : "radio"}" name="${name}" value="${value}" ${values.includes(String(value)) ? "checked" : ""}>
      <span class="option-body"><span class="option-mark"></span><span><span class="option-title">${title}</span></span>
    </label>`).join("")}</div>`;
}

function questionFrame(index, title, note, body) {
  return `<div class="question-index">${index}</div><h2>${title}</h2>${note ? `<p class="question-note">${note}</p>` : ""}${body}`;
}

function departmentOptions() {
  const groups = PKU_DEPARTMENTS.map(([group, departments]) => `<optgroup label="${group}">${departments.map((department) => `<option value="${department}" ${state.college === department ? "selected" : ""}>${department}</option>`).join("")}</optgroup>`).join("");
  return `<option value="">请选择院系</option>${groups}`;
}

function renderBasic() {
  return questionFrame("Q1", "先告诉我们一点基本信息", "请按实际情况填写。", `
    <label class="field-label" for="college">院系</label>
    <select id="college" class="select-input" data-field="college">${departmentOptions()}</select>
    <label class="field-label" for="grade">年级</label>
    <select id="grade" class="select-input" data-field="grade"><option value="">请选择</option>${["大一","大二","大三","大四及以上","研究生"].map(v => `<option ${state.grade === v ? "selected" : ""}>${v}</option>`).join("")}</select>
    <span class="field-label">身份</span>${optionHtml("identity", optionSets.identity)}
    <span class="field-label">是否修读过心院课程</span>${optionHtml("courseTaken", [["yes","✅ 是"],["no","❌ 否"]])}`);
}

function renderRecommendation() {
  return questionFrame("Q2.1", "如果朋友想选一门心院课程，你会多大程度推荐？", "可依据亲身体验或目前印象。", optionHtml("recommendation", optionSets.recommendation));
}

function renderRecommendedCourse() {
  return questionFrame("Q2.2-A", "如果你愿意推荐，最想推荐哪门心院课程？", "只填一个课程名。", `
    <label class="field-label" for="recommendedCourse">课程名</label>
    <input id="recommendedCourse" class="text-input" data-field="recommendedCourse" maxlength="30" value="${escapeHtml(state.recommendedCourse)}" placeholder="输入一门课程">`);
}

function renderReasons() {
  const rec = Number(state.recommendation);
  const options = rec >= 4 ? optionSets.highReasons : rec === 3 ? optionSets.midReasons : optionSets.lowReasons;
  const title = rec >= 4 ? "你愿意推荐这门课，主要因为什么？" : rec === 3 ? "你还在观望，主要卡在哪里？" : "你不太愿意推荐，主要因为什么？";
  return questionFrame(rec >= 4 ? "Q2.3-A" : "Q2.2", title, "可多选，最多选择 3 项。", optionHtml("reasons", options, { multi: true }));
}

function renderMisconception() {
  return questionFrame("Q3.1", "你觉得其他院系同学对心理学最常见的误解是哪一种？", "请选择你觉得最常见的一项。", optionHtml("misconception", optionSets.misconception));
}

function renderMascotKnown() {
  return questionFrame("Q3.2", "你知道心院的吉祥物长什么样吗？", "请选择最符合实际情况的一项。", optionHtml("mascotKnown", [["yes","👀 知道"],["no","🙈 不知道"]]));
}

function renderMascotMatch() {
  return questionFrame("Q3.3", "你能把吉祥物的颜色和名字一一对上吗？", "请选择最符合实际情况的一项。", optionHtml("mascotMatch", [["yes","🎯 能，颜色和名字都成功对号入座"],["no","😮 不能，原来还有名字吗！？"]]));
}

function renderMerch() {
  return questionFrame("Q3.4", "你目前有几件印有吉祥物的心院周边？", "请选择最接近的一项。", optionHtml("merchCount", optionSets.merch));
}

function renderMerchPreferences() {
  const showOther = (state.merchPreferences ?? []).includes("other");
  return questionFrame("Q3.5", "如果心院继续开发吉祥物内容或周边，你最希望看到哪些形式？", "可多选，最多选择 3 项。", `
    ${optionHtml("merchPreferences", optionSets.merchPreferences, { multi: true })}
    <div id="merchOtherWrap" ${showOther ? "" : "hidden"}>
      <label class="field-label" for="merchPreferenceOther">其他形式</label>
      <input id="merchPreferenceOther" class="text-input" data-field="merchPreferenceOther" maxlength="60" value="${escapeHtml(state.merchPreferenceOther)}" placeholder="写下你期待的周边形式">
    </div>`);
}

function scaleHtml(name, value, low, high) {
  const labels = ["几乎隐身", "偶尔捕捉到信号", "时不时刷到", "经常进入视野", "校园存在感拉满"];
  const moods = ["🫥", "🌫️", "👀", "📣", "🌟"];
  return `<div class="scale-row">${[1,2,3,4,5].map(v => `<label class="scale-option"><input type="radio" name="${name}" value="${v}" ${Number(value) === v ? "checked" : ""}><span class="scale-body">${v}<small>${moods[v - 1]}</small></span><span class="scale-caption">${labels[v - 1]}</span></label>`).join("")}</div><div class="scale-labels"><span>${low}</span><span>${high}</span></div>`;
}

function renderPresence() {
  return questionFrame("Q4.1", "心院在学校里是“低调潜行”，还是“存在感在线”？", "按你的真实感受打分。", scaleHtml("presenceRating", state.presenceRating, "几乎隐身", "存在感拉满"));
}

function renderPrimaryFocus() {
  return questionFrame("Q4.2", "你更关注心院的哪个方面？", "请选择一项。", optionHtml("primaryFocus", optionSets.primaryFocus));
}

function renderFuture() {
  return questionFrame("Q4.3", "你希望心院以后在哪些方面更常出现在大家视野里？", "可多选。", optionHtml("futureVisibility", optionSets.future, { multi: true }));
}

function renderLifeCourses() {
  return questionFrame("Q5", "你认为，心院学生的人生必修课有哪些？", "可多选。", optionHtml("lifeCourses", optionSets.lifeCourses, { multi: true }));
}

function renderLifeUses() {
  return questionFrame("Q6", "心理学在生活中最可能在哪些方面悄悄派上用场？", "可多选。", optionHtml("lifeUses", optionSets.lifeUses, { multi: true }));
}

function renderExperimentJoined() {
  return questionFrame("Q7", "你参加过心理学实验吗？", "放心，这一题本身不是实验。", optionHtml("experimentJoined", [["yes","🧪 参加过"],["no","👋 没参加过"]]));
}

function renderExperimentReasons() {
  const joined = state.experimentJoined === "yes";
  return questionFrame(joined ? "Q7-A" : "Q7-B", joined ? "哪些描述更接近你的实验体验？" : "主要是什么让你和心理学实验暂时没有碰面？", "可多选。", optionHtml("experimentReasons", joined ? optionSets.experimentYes : optionSets.experimentNo, { multi: true }));
}

function renderKeywords() {
  const words = state.keywords ?? ["", "", ""];
  const consent = state.publicCloudConsent !== false;
  const suggestions = [['情绪', '🌤️ 情绪'], ['认知', '🧠 认知'], ['行为', '👣 行为'], ['人际关系', '🤝 人际关系'], ['发展', '🌱 发展'], ['大脑', '🧬 大脑'], ['学习', '📚 学习'], ['幸福感', '☀️ 幸福感'], ['压力', '🌋 压力'], ['梦', '🌙 梦']];
  const suggestionHtml = suggestions.map(([word, label]) => 
    `<span class="suggestion-tag" onclick="fillKeyword('${word}')">${label}</span>`
  ).join('');

  return questionFrame("Q8", "请用三个词描述：心理学主要在研究什么？", "自由填词，不提供词库。", `
    <div class="word-grid">
      ${words.map((word, i) => `
        <input class="text-input" data-word-index="${i}" maxlength="16" value="${escapeHtml(word)}" placeholder="第 ${i + 1} 个词">
      `).join("")}
    </div>
    <div class="suggestion-container">
      <span>灵感提示：</span>
      <div class="suggestion-tags">
        ${suggestionHtml}
      </div>
    </div>
    <label class="consent-row">
      <input type="checkbox" data-field="publicCloudConsent" ${consent ? "checked" : ""}>
      <span>同意将三个词以匿名、归并后的形式计入公共词云。私人定制文字不会上传。</span>
    </label>
  `);
}
window.fillKeyword = function(word) {
  const inputs = document.querySelectorAll('.word-grid .text-input');
  
  for (const input of inputs) {
    if (input.value.trim() === '') {
      input.value = word;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
  }
  const lastInput = inputs[inputs.length - 1];
  if (lastInput) {
    lastInput.value = word;
    lastInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

function renderPrivate() {
  return questionFrame("Q9", "最后，你最想对心院说的一句心里话是？", "可选填。想说什么就写什么。", `
    <label class="field-label" for="privateText">写下一句话 <span class="counter">可跳过</span></label>
    <textarea id="privateText" class="text-area heart-textarea" data-field="privateText" maxlength="180" placeholder="想说什么就写什么，不必深刻，也不用押韵。">${escapeHtml(state.privateText)}</textarea>
    <p class="private-note"><span>♥</span> 这句话会匿名收集，供心院后续汇总；不进入公共词云，也不影响人格结果。</p>`);
}

const renderers = {
  basic: renderBasic, recommendation: renderRecommendation, recommendedCourse: renderRecommendedCourse, reasons: renderReasons,
  misconception: renderMisconception, mascotKnown: renderMascotKnown, mascotMatch: renderMascotMatch, merch: renderMerch, merchPreferences: renderMerchPreferences,
  presence: renderPresence, primaryFocus: renderPrimaryFocus, future: renderFuture,
  lifeCourses: renderLifeCourses, lifeUses: renderLifeUses, experimentJoined: renderExperimentJoined,
  experimentReasons: renderExperimentReasons, keywords: renderKeywords, private: renderPrivate
};

function bindInputs() {
  mount.querySelectorAll("[data-field]").forEach((input) => {
    const update = () => { state[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value; };
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });
  mount.querySelectorAll("[data-word-index]").forEach((input) => input.addEventListener("input", () => {
    state.keywords ??= ["", "", ""];
    state.keywords[Number(input.dataset.wordIndex)] = input.value;
  }));
  mount.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener("change", () => {
    const previous = state[input.name];
    state[input.name] = input.value;
    if (input.name === "recommendation" && previous !== input.value) {
      state.reasons = [];
      if (Number(input.value) < 4) delete state.recommendedCourse;
    }
    if (input.name === "mascotKnown" && previous !== input.value && input.value === "no") {
      delete state.mascotMatch;
      delete state.merchCount;
      delete state.merchPreferences;
      delete state.merchPreferenceOther;
    }
    if (input.name === "experimentJoined" && previous !== input.value) state.experimentReasons = [];
    validation.textContent = "";
  }));
  mount.querySelectorAll('input[type="checkbox"]:not([data-field])').forEach((input) => input.addEventListener("change", () => {
    const name = input.name;
    const max = name === "reasons" || name === "merchPreferences" ? 3 : Infinity;
    const normalized = [...mount.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);
    if (normalized.length > max) {
      input.checked = false;
      validation.textContent = `最多选择 ${max} 项。`;
    } else {
      state[name] = normalized;
      if (name === "merchPreferences") {
        const otherSelected = normalized.includes("other");
        const otherWrap = $("#merchOtherWrap", mount);
        if (otherWrap) otherWrap.hidden = !otherSelected;
        if (!otherSelected) {
          delete state.merchPreferenceOther;
          const otherInput = $("#merchPreferenceOther", mount);
          if (otherInput) otherInput.value = "";
        }
      }
      validation.textContent = "";
    }
  }));
}

function renderStep() {
  const list = steps();
  if (!list.includes(currentId)) currentId = list[Math.max(0, list.length - 1)];
  const index = list.indexOf(currentId);
  const progress = Math.round(((index + 1) / list.length) * 100);
  $("#sectionLabel").textContent = sections[currentId];
  $("#progressText").textContent = `${progress}%`;
  $("#progressBar").style.width = `${progress}%`;
  $("#backBtn").style.visibility = history.length ? "visible" : "hidden";
  $("#nextBtn").innerHTML = currentId === "private" ? "查看我的心院画像 <span>→</span>" : "下一题 <span>→</span>";
  mount.innerHTML = renderers[currentId]();
  validation.textContent = "";
  bindInputs();
  const card = document.querySelector(".question-card");
  card.classList.remove("step-enter");
  void card.offsetWidth;
  card.classList.add("step-enter");
  const autofocus = mount.querySelector("input.text-input, select");
  if (currentId === "recommendedCourse") setTimeout(() => autofocus?.focus(), 120);
}

function validateStep() {
  const requiredMulti = (key) => (state[key] ?? []).length > 0;
  const messages = {
    basic: () => state.college?.trim() && state.grade && state.identity && state.courseTaken ? "" : "请完整填写学院、年级、身份和修课经历。",
    recommendation: () => state.recommendation ? "" : "请选择推荐程度。",
    recommendedCourse: () => state.recommendedCourse?.trim() ? "" : "请填一门你最想推荐的课程。",
    reasons: () => requiredMulti("reasons") ? "" : "请至少选择一个原因。",
    misconception: () => state.misconception ? "" : "请选择一种常见误解。",
    mascotKnown: () => state.mascotKnown ? "" : "请选择是否认识吉祥物。",
    mascotMatch: () => state.mascotMatch ? "" : "请选择是否能对上名字和颜色。",
    merch: () => state.merchCount ? "" : "请选择周边数量。",
    merchPreferences: () => !requiredMulti("merchPreferences")
      ? "请至少选择一种期待的周边形式。"
      : (state.merchPreferences.includes("other") && !state.merchPreferenceOther?.trim() ? "请填写其他周边形式。" : ""),
    presence: () => state.presenceRating ? "" : "请给校园存在感打分。",
    primaryFocus: () => state.primaryFocus ? "" : "请选择一个最想先看的方面。",
    future: () => requiredMulti("futureVisibility") ? "" : "请至少选择一个未来期待。",
    lifeCourses: () => requiredMulti("lifeCourses") ? "" : "请至少选择一项。",
    lifeUses: () => requiredMulti("lifeUses") ? "" : "请至少选择一项。",
    experimentJoined: () => state.experimentJoined ? "" : "请选择是否参加过心理学实验。",
    experimentReasons: () => requiredMulti("experimentReasons") ? "" : "请至少选择一项。",
    keywords: () => (state.keywords ?? []).length === 3 && state.keywords.every((word) => word.trim()) ? "" : "请填写三个关键词。",
    private: () => ""
  };
  return messages[currentId]?.() ?? "";
}

function next() {
  const message = validateStep();
  if (message) {
    validation.textContent = message;
    validation.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (currentId === "private") return finish();
  const list = steps();
  const index = list.indexOf(currentId);
  history.push(currentId);
  currentId = list[index + 1];
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function back() {
  if (!history.length) return;
  currentId = history.pop();
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function portraitSvg(type, code) {
  return `<img src="/personas/${code}.png" alt="${type.nickname}人物画像" width="720" height="1200">`;
  /* Legacy SVG remains below as a no-network fallback reference; production uses the reviewed portrait assets. */
  const [a, b, c] = type.palette;
  const dark = "#302A49";
  const isExplore = code.endsWith("E");
  const isVisible = code.includes("V");
  const isAffinity = code.startsWith("A");
  const symbols = {
    scope: `<g transform="translate(248 64) rotate(-25)"><path d="M0 20H77L88 34H0Z" fill="#F7F2E8" stroke="${dark}" stroke-width="6"/><path d="M60 18V37M18 36L4 76M46 36L61 76" fill="none" stroke="${dark}" stroke-width="7"/></g>`,
    lamp: `<g transform="translate(255 54)"><path d="M0 49L17 0H57L74 49Z" fill="${c}" stroke="${dark}" stroke-width="6"/><path d="M37 49V103M15 103H59" fill="none" stroke="${dark}" stroke-width="7"/></g>`,
    lens: `<g transform="translate(259 62)"><path d="M7 8L55 4L60 53L12 58Z" fill="#F7F2E8" stroke="${dark}" stroke-width="7"/><path d="M51 50L80 82" stroke="${dark}" stroke-width="10"/></g>`,
    umbrella: `<g transform="translate(245 55)"><path d="M0 51L36 0L77 51Z" fill="${c}" stroke="${dark}" stroke-width="7"/><path d="M38 51V111Q38 129 56 121" fill="none" stroke="${dark}" stroke-width="7"/></g>`,
    console: `<g transform="translate(244 57)"><path d="M0 0H92V72H0Z" fill="#F7F2E8" stroke="${dark}" stroke-width="7"/><path d="M14 53L35 31L51 43L78 16" fill="none" stroke="${b}" stroke-width="7" stroke-linejoin="miter"/></g>`,
    window: `<g transform="translate(254 49)"><path d="M0 0H78V91H0Z" fill="#F7F2E8" stroke="${dark}" stroke-width="7"/><path d="M39 2V89M2 45H76" stroke="${dark}" stroke-width="6"/></g>`,
    fog: `<g transform="translate(234 64)" fill="#F7F2E8" stroke="${dark}" stroke-width="5"><path d="M0 0H93V18H0Z"/><path d="M17 30H102V48H17Z"/><path d="M-7 60H82V78H-7Z"/></g>`,
    hello: `<g transform="translate(242 52)"><path d="M0 0H96V66H53L26 88L31 66H0Z" fill="#F7F2E8" stroke="${dark}" stroke-width="7"/><path d="M21 33H31M43 33H53M65 33H75" stroke="${a}" stroke-width="7"/></g>`
  };
  const backdrop = isVisible
    ? `<path d="M46 270L76 37L148 67L205 18L265 66L351 37L375 270Z" fill="#fff" opacity=".11"/><path d="M54 244L99 75M369 242L330 72M210 35V8" stroke="#fff" stroke-width="5" opacity=".18"/>`
    : `<path d="M58 270V77L107 37H313L360 77V270Z" fill="#fff" opacity=".08" stroke="#fff" stroke-width="5"/><path d="M95 270V104H326V270" fill="none" stroke="#fff" stroke-width="5" opacity=".16"/>`;
  const clothing = isExplore
    ? `<path d="M92 294L111 229L176 204L211 252L246 204L311 229L332 294Z" fill="${c}" stroke="${dark}" stroke-width="8"/><path d="M176 204L211 252L246 204L257 294H165Z" fill="#F7F2E8" stroke="${dark}" stroke-width="6"/><path d="M211 252V294" stroke="${dark}" stroke-width="6"/>`
    : `<path d="M89 294L111 230L177 204L211 233L245 204L311 230L334 294Z" fill="${c}" stroke="${dark}" stroke-width="8"/><path d="M169 210L211 249L253 210L265 238L211 274L157 238Z" fill="#F7F2E8" stroke="${dark}" stroke-width="6"/>`;
  const mouth = isAffinity
    ? `<path d="M192 178L211 190L233 176" fill="none" stroke="#9A4D52" stroke-width="6" stroke-linejoin="miter"/>`
    : `<path d="M194 183H231" stroke="#9A4D52" stroke-width="6"/>`;
  return `<svg viewBox="0 0 420 300" role="img" aria-label="${type.nickname}：${type.name}的几何人物画像" shape-rendering="geometricPrecision">
    ${backdrop}
    <path d="M28 282L65 252L93 269L124 241L151 264L183 239L213 264L247 238L278 262L314 237L350 264L390 239V300H28Z" fill="#fff" opacity=".12"/>
    ${clothing}
    <path d="M189 190H239V224L213 243L189 224Z" fill="#F2CDB6" stroke="${dark}" stroke-width="7"/>
    <path d="M151 82L180 50L247 43L284 75L294 136L281 184L244 216L193 216L156 188L141 133Z" fill="#F4D1BA" stroke="${dark}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M143 125L151 77L183 48L247 41L282 67L298 118L260 105L239 72L221 106L186 127Z" fill="${a}" stroke="${dark}" stroke-width="8" stroke-linejoin="miter"/>
    <path d="M162 132L183 122L202 130M229 130L248 121L269 131" fill="none" stroke="${dark}" stroke-width="6" stroke-linejoin="miter"/>
    <path d="M186 145H198V159H186ZM238 145H250V159H238Z" fill="${dark}"/>
    <path d="M218 151L210 170H224" fill="none" stroke="${dark}" stroke-width="5" stroke-linejoin="miter"/>
    ${mouth}
    ${symbols[type.symbol]}
    <path d="M56 66H82V92H56Z" fill="${c}" stroke="${dark}" stroke-width="5" transform="rotate(-12 69 79)"/><path d="M67 58V101M47 79H89" stroke="#fff" stroke-width="4"/>
  </svg>`;
}

async function submitResponse() {
  if (submittedResponse) return;
  submittedResponse = true;
  try {
    const response = await fetch("/api/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: state })
    });
    if (!response.ok) throw new Error("response_not_saved");
  } catch {
    const local = JSON.parse(localStorage.getItem("xinyuan-keywords") || "{}");
    if (state.publicCloudConsent !== false) {
      for (const word of state.keywords ?? []) local[word.trim()] = (local[word.trim()] ?? 0) + 1;
      localStorage.setItem("xinyuan-keywords", JSON.stringify(local));
    }
  }
}

function layoutCloud(words, { width = 680, height = 390, mobile = false } = {}) {
  const max = Math.max(...words.map((word) => word.count));
  const min = Math.min(...words.map((word) => word.count));

  const palette = ["#4e3b82", "#7657a8", "#b25172", "#2f756f", "#9a653f"];
  const candidates = [];
  const gridStep = mobile ? 6 : 10;
  const edgeX = mobile ? 18 : 40;
  for (let y = mobile ? 32 : 44; y <= height - (mobile ? 18 : 24); y += gridStep) {
    for (let x = edgeX; x <= width - edgeX; x += gridStep) {
      const hx = (x / width - .5) / .43;
      const hy = -(y / height - .49) / .43;
      const equation = (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3;
      if (equation <= 0) {
        const radius = Math.hypot(hx * .9, hy);
        candidates.push({ x, y, radius, depth: radius < .32 ? "core" : radius < .62 ? "near" : radius < .86 ? "mid" : "far" });
      }
    }
  }
  candidates.sort((a, b) => a.radius - b.radius || Math.abs(a.y - height * .46) - Math.abs(b.y - height * .46));

  const placed = [];
  const items = words.slice(0, mobile ? 24 : 40).map((word, index) => {
    const ratio = max === min ? .56 : Math.sqrt((word.count - min + 1) / (max - min + 1));
    const length = Math.max(1, [...word.canonical].length);
    const baseSize = Math.round((mobile ? 9 : 12) + ratio * (mobile ? 16 : 27));
    const fontSize = Math.max(mobile ? 9 : 12, Math.min(baseSize, (mobile ? 104 : 172) / (length * 1.02)));
    const itemWidth = Math.max(fontSize * 1.25, length * fontSize * 1.02);

    return {
      ...word,
      index,
      fontSize,
      itemWidth,
      itemHeight: fontSize * 1.14,
      color: palette[index % palette.length]
    };
  });

  items.forEach((item) => {
    const position = candidates.find((candidate) => {
      const gapX = mobile ? 4 : (item.fontSize > 26 ? 11 : 7);
      const gapY = mobile ? 3 : (item.fontSize > 26 ? 7 : 4);
      const box = { left: candidate.x - item.itemWidth / 2 - gapX, right: candidate.x + item.itemWidth / 2 + gapX, top: candidate.y - item.itemHeight / 2 - gapY, bottom: candidate.y + item.itemHeight / 2 + gapY };
      const safeX = mobile ? 10 : 22;
      const safeTop = mobile ? 16 : 24;
      const safeBottom = mobile ? 10 : 18;
      const inside = box.left > safeX && box.right < width - safeX && box.top > safeTop && box.bottom < height - safeBottom;
      const overlaps = placed.some((other) => !(box.right < other.left || box.left > other.right || box.bottom < other.top || box.top > other.bottom));
      if (inside && !overlaps) {
        Object.assign(item, { left: candidate.x / width * 100, top: candidate.y / height * 100, depth: candidate.depth, box });
        return true;
      }
      return false;
    });
    if (position) placed.push(item.box);
  });

  return items.filter((item) => item.depth);
}

async function loadCloud() {
  const cloud = $("#wordCloud");
  const meta = $("#cloudMeta");
  cloud.innerHTML = `<span class="cloud-empty">正在读取匿名词频…</span>`;
  let words = [];
  let total = 0;
  try {
    const response = await fetch("/api/v1/psychology-keywords/cloud?minCount=1&limit=40");
    const data = await response.json();
    words = data.words ?? [];
    total = data.totalResponses ?? 0;
  } catch {
    const local = JSON.parse(localStorage.getItem("xinyuan-keywords") || "{}");
    words = Object.entries(local).map(([canonical, count]) => ({ canonical, count })).sort((a, b) => b.count - a.count);
  }
  if (!words.length) {
    cloud.innerHTML = `<div class="cloud-empty"><span>♡</span><strong>心形正在等待词语</strong><small>收集到回答后，会按频率自动长成一片星云。</small></div>`;
    meta.textContent = "还没有可展示的匿名词频。";
    return;
  }
  const layout = layoutCloud(words);
  const mobileLayout = new Map(layoutCloud(words, { width: 340, height: 330, mobile: true }).map((word) => [word.canonical, word]));
  cloud.innerHTML = layout.map((word, index) => {
    const rank = index < 3 ? "high" : index < 10 ? "medium" : "normal";
    const mobileWord = mobileLayout.get(word.canonical);
    const mobileStyle = mobileWord ? `--cloud-mobile-left:${mobileWord.left.toFixed(2)}%;--cloud-mobile-top:${mobileWord.top.toFixed(2)}%;--cloud-mobile-size:${mobileWord.fontSize}px;` : "";
    return `<span class="cloud-word" data-rank="${rank}" data-depth="${word.depth}" title="${word.count} 次" style="left:${word.left.toFixed(2)}%;top:${word.top.toFixed(2)}%;--cloud-size:${word.fontSize}px;${mobileStyle}--word-color:${word.color};--cloud-delay:${Math.min(index * 24, 520)}ms">${escapeHtml(word.canonical)}</span>`;
  }).join("");
  meta.textContent = total ? `已汇总 ${total} 份匿名回答；相近词按规则归并。` : "本机离线词频；启动服务后将使用公共聚合接口。";
}

function axisRow(label, value, left, right, display = `${value} / 100`) {
  return `<div class="axis-item"><div class="axis-head"><span>${label}</span><span>${display}</span></div><div class="axis-track"><i style="width:${Math.max(4, value)}%"></i></div><div class="axis-foot"><span>${left}</span><span>${right}</span></div></div>`;
}

function renderResult(result) {
  const template = $("#resultTemplate").content.cloneNode(true);
  screens.result.style.setProperty("--type-a", result.archetype.palette[0]);
  screens.result.style.setProperty("--type-b", result.archetype.palette[1]);
  $("#resultCode", template).textContent = `${result.code} · ${result.archetype.short}`;
  $("#confidenceBadge", template).textContent = result.confidence;
  $("#portraitMount", template).innerHTML = portraitSvg(result.archetype, result.code);
  $("#resultName", template).textContent = result.archetype.nickname;
  $("#resultTagline", template).textContent = result.archetype.tagline;
  $("#shortCode", template).textContent = result.archetype.short;
  $("#resultSummary", template).textContent = result.archetype.summary;
  $("#axisMount", template).innerHTML = [
    axisRow("好感度", result.affinity, "W · 观望", "A · 亲近"),
    axisRow("存在感", result.presence, "L · 潜行", "V · 鲜明"),
    axisRow("关注朝向", result.orientation === "E" ? 82 : 28, "C · 陪伴", "E · 探索", result.orientationLabel)
  ].join("");
  $("#basisTag", template).textContent = result.courseBasis;
  $("#misconceptionTag", template).textContent = `误解标签 · ${result.misconceptionTag}`;
  $("#experimentTag", template).textContent = `实验气质 · ${result.experimentTags.join(" / ") || "尚未形成"}`;
  $("#cpNumber", template).textContent = result.cp;
  $("#cpTitle", template).textContent = result.cpTitle;
  $("#cpText", template).textContent = result.cpText;
  $("#innerTags", template).innerHTML = (result.innerTags.length ? result.innerTags : ["定位发展中"]).map(tag => `<span>${tag}</span>`).join("");
  const heartMessage = String(state.privateText ?? "").trim();
  const adviceCard = $("#resultAdvice", template).closest(".advice-card");
  if (heartMessage) $("#resultAdvice", template).textContent = `“${heartMessage}”`;
  else adviceCard.hidden = true;
  const reply = buildPrivateReply(state, result);
  if (reply) {
    $("#privateCard", template).hidden = false;
    $("#privateReply", template).textContent = `“${reply}”`;
  }
  $("#resultMount").replaceChildren(template);

  $("#toggleCloud").addEventListener("click", async (event) => {
    const panel = $("#cloudPanel");
    panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
    event.currentTarget.textContent = panel.hidden ? "展开词云" : "收起词云";
    if (!panel.hidden && !panel.dataset.loaded) {
      panel.dataset.loaded = "true";
      await loadCloud();
    }
  });
  $("#copyResult").addEventListener("click", async (event) => {
    const text = `我的心院印象是「${result.archetype.nickname}」（${result.archetype.short}）\n好感度 ${result.affinity}，存在感 ${result.presence}，更偏向${result.orientationLabel}。\nCP 感 ${result.cp}：${result.cpTitle}。\n${result.archetype.tagline}`;
    try {
      await navigator.clipboard.writeText(text);
      event.currentTarget.textContent = "已复制 ✓";
    } catch {
      window.prompt("复制下面的结果文案：", text);
    }
  });
  $("#printResult").addEventListener("click", () => window.print());
  $("#restartQuiz").addEventListener("click", () => {
    for (const key of Object.keys(state)) delete state[key];
    history = [];
    currentId = "basic";
    submittedResponse = false;
    show("landing");
  });
}

async function finish() {
  show("loading");
  const captions = ["先计算好感度与存在感……", "再把关注朝向放进画像……", "最后看看你们有没有 CP 感……"];
  let index = 0;
  const ticker = setInterval(() => { $("#loadingCaption").textContent = captions[Math.min(++index, captions.length - 1)]; }, 380);
  await submitResponse();
  await new Promise((resolve) => setTimeout(resolve, 1050));
  clearInterval(ticker);
  const result = calculateResult(state);
  renderResult(result);
  show("result");
}

$("#startBtn").addEventListener("click", () => {
  show("quiz");
  currentId = "basic";
  history = [];
  renderStep();
});
$("#nextBtn").addEventListener("click", next);
$("#backBtn").addEventListener("click", back);

// Handy for manual QA in the browser console without exposing private text.
window.__xinyuan = { calculateResult, archetypes: ARCHETYPES };
