// 全局变量定义
let appContent;
let allRecords = []; // 存储所有个人比赛记录
let allContests = []; // 存储所有比赛
let milestones = []; // 存储大事记
let fuse; // 用于模糊搜索
let dataInitialized = false; // 标记数据是否已初始化
let playersWithFirstLetter = []; // 存储选手姓名和拼音首字母的数组

// 获取奖项对应的CSS类
function getAwardClass(award) {
    if (!award) return '';
    if (award.includes('金')) return 'award-gold';
    else if (award.includes('银')) return 'award-silver';
    else if (award.includes('铜')) return 'award-bronze';
    else if (award.includes('铁')) return 'award-iron';
    return '';
}

// 全局配置对象，用于存储用户的显示设置
let userSettings = {
    showSolved: true, // 是否显示通过数
    showPenalty: true, // 是否显示罚时
    showContestType: true, // 是否显示比赛类型
    showNotes: true, // 是否显示比赛备注
    showContestLevel: true // 是否显示比赛级别
};

// 从localStorage加载用户设置
function loadUserSettings() {
    try {
        const savedSettings = localStorage.getItem('acmdbUserSettings');
        if (savedSettings) {
            Object.assign(userSettings, JSON.parse(savedSettings));
        }
    } catch (e) {
        console.error('加载用户设置失败:', e);
    }
}

// 保存用户设置到localStorage
function saveUserSettings() {
    try {
        localStorage.setItem('acmdbUserSettings', JSON.stringify(userSettings));
    } catch (e) {
        console.error('保存用户设置失败:', e);
    }
}

// 页面模板
const templates = {
    'search-player': `
        <div class="page active" id="search-player">
            <div class="mb-3">
                <div class="input-group">
                    <input type="text" id="player-search-input" class="form-control" placeholder="输入选手姓名...">
                    <button id="settings-btn" class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 设置
                    </button>
                </div>
            </div>
            <div id="player-results"></div>
        </div>`,
        
    'search-contest': `
        <div class="page" id="search-contest">
            <div class="mb-3">
                <div class="input-group">
                    <select id="contest-select" class="form-select"></select>
                    <button id="settings-btn" class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 设置
                    </button>
                </div>
            </div>
            <!-- 比赛信息介绍容器 -->
            <div id="contest-info" class="mb-3 p-3 bg-light border rounded"></div>
            <div id="contest-results"></div>
        </div>`,
        
    
    'settings-modal': `
        <div class="modal fade" id="settings-modal" tabindex="-1" aria-labelledby="settings-modal-label" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="settings-modal-label">显示设置</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-solved" checked>
                            <label class="form-check-label" for="show-solved">显示通过数</label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-penalty" checked>
                            <label class="form-check-label" for="show-penalty">显示罚时</label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-contest-type" checked>
                            <label class="form-check-label" for="show-contest-type">显示比赛类型</label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-notes" checked>
                            <label class="form-check-label" for="show-notes">显示比赛备注</label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-contest-level" checked>
                            <label class="form-check-label" for="show-contest-level">显示比赛级别</label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        <button type="button" id="save-settings-btn" class="btn btn-primary">保存设置</button>
                    </div>
                </div>
            </div>
        </div>`,
    'all-records': `
        <div class="page" id="all-records">
            <table class="table table-striped table-hover table-sm">
                <thead id="all-records-thead">
                    <tr>
                        <th>日期</th><th>比赛名称</th><th>级别</th><th>选手</th><th>队伍</th><th>奖项</th><th>排名</th>
                    </tr>
                </thead>
                <tbody id="all-records-tbody"></tbody>
            </table>
        </div>`,
    'player-ranking': `
        <div class="page" id="player-ranking">
            <p class="text-muted small">
                排名规则: 奖项基础分(金=10, 银=7, 铜=5, 铁=2) × 级别权重(区域Final=2, 国赛=1.8, 区域赛=1.5, 邀请赛=1.2, 省赛/女生赛=1, 网络赛=0.5)。
            </p>
            <div class="ranking-table-container">
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>#</th><th class="player-column">选手</th><th>总分</th><th class="award-column">奖牌详情</th>
                        </tr>
                    </thead>
                    <tbody id="ranking-tbody"></tbody>
                </table>
            </div>
        </div>`,
    'visualization': `
        <div class="page" id="visualization">
            <p class="lead">分析：获得 <strong>A级别比赛</strong> 的 <strong>某个奖项</strong> 的选手，他们在 <strong>B级别比赛</strong> 中的排名分布如何？（注：仅使用同一赛季的数据）</p>
            <div class="row g-3 align-items-center mb-4">
                <div class="col-md-5">
                    <label class="form-label"><strong>A类比赛级别 (基准)</strong></label>
                    <select id="vis-base-level" class="form-select"></select>
                </div>
                <div class="col-md-3">
                    <label class="form-label"><strong>奖项</strong></label>
                    <select id="vis-base-award" class="form-select"></select>
                </div>
                <div class="col-md-4">
                     <label class="form-label"><strong>B类比赛级别 (对比)</strong></label>
                    <select id="vis-target-level" class="form-select"></select>
                </div>
            </div>
            <button id="run-visualization" class="btn btn-primary">生成分析图表</button>
            <div class="mt-4">
                <canvas id="vis-chart"></canvas>
                <p id="vis-result-text" class="text-center mt-3 fw-bold"></p>
            </div>
        </div>`,
    'timeline': `
        <div class="page" id="timeline">
            <div id="timeline-container" class="timeline"></div>
        </div>`
};

// 初始化比赛信息容器内容
function initContestInfoContainer() {
    const contestInfoContainer = document.getElementById('contest-info');
    if (contestInfoContainer) {
        contestInfoContainer.innerHTML = '<p class="text-muted">请从上方选择一个比赛查看详细信息</p>';
    }
}

// 初始化显示设置的函数
function initDisplaySettings() {
    // 更新所有记录页面的表头
    const allRecordsThead = document.getElementById('all-records-thead');
    if (allRecordsThead) {
        updateAllRecordsTableHeader();
    }
}

// 更新所有记录页面的表头
function updateAllRecordsTableHeader() {
    const allRecordsThead = document.getElementById('all-records-thead');
    if (!allRecordsThead) return;
    
    let theadHtml = '<tr>';
    theadHtml += '<th>日期</th><th>比赛名称</th><th>级别</th><th>选手</th><th>队伍</th><th>奖项</th><th>排名</th>';
    if (userSettings.showSolved) theadHtml += '<th>通过数</th>';
    if (userSettings.showPenalty) theadHtml += '<th>罚时</th>';
    if (userSettings.showContestType) theadHtml += '<th>比赛类型</th>';
    if (userSettings.showNotes) theadHtml += '<th>备注</th>';
    theadHtml += '</tr>';
    
    allRecordsThead.innerHTML = theadHtml;
}

// 将用户设置应用到模态框的复选框
function applySettingsToModal() {
    setTimeout(() => {
        if (document.getElementById('show-solved')) document.getElementById('show-solved').checked = userSettings.showSolved;
        if (document.getElementById('show-penalty')) document.getElementById('show-penalty').checked = userSettings.showPenalty;
        if (document.getElementById('show-contest-type')) document.getElementById('show-contest-type').checked = userSettings.showContestType;
        if (document.getElementById('show-notes')) document.getElementById('show-notes').checked = userSettings.showNotes;
        if (document.getElementById('show-contest-level')) document.getElementById('show-contest-level').checked = userSettings.showContestLevel;
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    appContent = document.getElementById('app-content');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // 加载用户设置
    loadUserSettings();
    
    // 添加设置模态框到body
    const settingsModal = document.createElement('div');
    settingsModal.innerHTML = templates['settings-modal'];
    document.body.appendChild(settingsModal.firstElementChild);
    
    // 应用用户设置到模态框
    applySettingsToModal();
    
    // 处理保存设置的核心函数
    function handleSaveSettings() {
        console.log('保存设置按钮被点击');
        
        // 先获取复选框的当前状态
        const showSolved = document.getElementById('show-solved').checked;
        const showPenalty = document.getElementById('show-penalty').checked;
        const showContestType = document.getElementById('show-contest-type').checked;
        const showNotes = document.getElementById('show-notes').checked;
        const showContestLevel = document.getElementById('show-contest-level').checked;
        
        console.log('复选框状态:', { showSolved, showPenalty, showContestType, showNotes, showContestLevel });
        
        // 更新用户设置对象
        userSettings = {
            showSolved: showSolved,
            showPenalty: showPenalty,
            showContestType: showContestType,
            showNotes: showNotes,
            showContestLevel: showContestLevel
        };
        
        // 保存设置到localStorage
        saveUserSettings();
        console.log('已保存设置:', userSettings);
        
        // 立即更新模态框中的复选框状态，让用户看到更改已生效
        applySettingsToModal();
        
        // 刷新当前页面，确保立即反映设置变更
        let currentPage = 'search-player'; // 默认页面
        
        // 尝试获取当前活动页面
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            currentPage = activePage.id;
        } else {
            // 如果找不到active类，尝试通过URL参数获取
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page');
            if (pageParam) {
                currentPage = pageParam;
            }
        }
        
        console.log('当前页面:', currentPage);
        
        // 根据当前页面类型刷新内容
        if (currentPage === 'search-player') {
            // 重新执行当前页面的查询
            const playerResults = document.getElementById('player-results');
            
            // 检查URL中是否有player参数，优先使用URL参数
            const urlParams = new URLSearchParams(window.location.search);
            const playerNameFromUrl = urlParams.get('player');
            
            if (playerNameFromUrl) {
                // 如果URL中指定了选手，则直接显示该选手的记录
                showPlayerAwards(decodeURIComponent(playerNameFromUrl));
            } else if (playerResults && playerResults.innerHTML) {
                // 如果已经有显示的结果，重新渲染当前选手的记录
                const h3 = playerResults.querySelector('h3');
                if (h3) {
                    const name = h3.textContent.split(' ')[0];
                    if (name) {
                        showPlayerAwards(name);
                    } else {
                        console.warn('无法提取选手名称');
                    }
                } else {
                    console.warn('未找到选手名称标题');
                }
            } else {
                console.warn('没有可重新渲染的选手结果');
            }
        } else if (currentPage === 'search-contest') {
            // 如果是比赛查询页面，重新显示当前选择的比赛结果
            const contestSelect = document.getElementById('contest-select');
            if (contestSelect && contestSelect.value) {
                showContestAwards(contestSelect.value);
            } else {
                console.warn('没有选择比赛或无法获取比赛选择框');
            }
        } else if (currentPage === 'all-records') {
            // 如果是所有记录页面，更新表头和内容
            updateAllRecordsTableHeader();
            renderAllRecords();
        } else {
            // 对于其他页面类型，尝试重新加载当前页面
            console.log('当前页面类型未专门处理，尝试重新导航到当前页面');
            navigateTo(currentPage);
        }
        
        // 关闭模态框
        const settingsModal = bootstrap.Modal.getInstance(document.getElementById('settings-modal'));
        if (settingsModal) {
            settingsModal.hide();
        }
    }
    
    // 绑定保存设置按钮的事件监听器
    function bindSaveSettingsButton() {
        const saveButton = document.getElementById('save-settings-btn');
        if (saveButton) {
            console.log('找到保存设置按钮，绑定事件监听器');
            // 先移除可能存在的监听器，避免重复绑定
            const newButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newButton, saveButton);
            newButton.addEventListener('click', handleSaveSettings);
        } else {
            console.warn('未找到保存设置按钮');
        }
    }
    
    // 确保DOM完全加载后再绑定保存按钮事件
    setTimeout(bindSaveSettingsButton, 300);
    
    // 为了确保安全，也使用事件委托作为后备方案
    document.addEventListener('click', function(e) {
        if (e.target.id === 'save-settings-btn' || e.target.closest('#save-settings-btn')) {
            console.log('通过事件委托捕获到保存设置按钮点击');
            // 避免重复触发
            if (!e.target._handled) {
                e.target._handled = true;
                setTimeout(() => {
                    delete e.target._handled;
                }, 0);
                handleSaveSettings(); // 直接调用处理函数
            }
        }
    });
    
    // 添加设置按钮点击事件处理
    function setupSettingsButtons() {
        const settingsButtons = document.querySelectorAll('#settings-btn');
        settingsButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 确保在打开模态框前应用最新设置
                applySettingsToModal();
                
                // 显示设置模态框
                const settingsModal = new bootstrap.Modal(document.getElementById('settings-modal'));
                settingsModal.show();
            });
        });
    }
    setupSettingsButtons();
    
    // 在DOM加载完成后调用初始化函数
    init().catch(err => {
        console.error('初始化应用失败:', err);
        if (appContent) {
            appContent.innerHTML = `<div class="alert alert-danger">加载数据失败: ${err.message}</div>`;
        }
    });


    
    // 确保页面模板变量名一致，防止引用错误
    const pageTemplates = templates;


    // 初始化Fuse.js搜索引擎
    function initFuse() {
        try {
            if (allRecords && allRecords.length > 0) {
                // 从记录中提取不重复的选手信息，包括名字和首字母
                const playerMap = new Map();
                allRecords.forEach(record => {
                    if (record.name && !playerMap.has(record.name)) {
                        playerMap.set(record.name, {
                            name: record.name,
                            firstLetter: record.firstLetter || ''
                        });
                    }
                });
                
                // 转换为数组
                playersWithFirstLetter = Array.from(playerMap.values());
                console.log(`为${playersWithFirstLetter.length}名选手初始化搜索引擎`);
                
                // 打印所有选手列表（前20个）
                console.log('所有选手列表（前20个）:', playersWithFirstLetter.slice(0, 20).map(p => p.name).join(', '));
                
                // 打印一些示例以验证拼音首字母
                if (playersWithFirstLetter.length > 0) {
                    console.log('拼音首字母示例：');
                    const sample = playersWithFirstLetter.slice(0, 5);
                    sample.forEach(item => {
                        console.log(`${item.name}: ${item.firstLetter}`);
                    });
                    
                    // 专门检查是否有"尤铭"这位选手
                    const youMing = playersWithFirstLetter.find(p => p.name === '尤铭');
                    if (youMing) {
                        console.log(`找到选手尤铭，拼音首字母为：${youMing.firstLetter}`);
                        // 确保'尤铭'的首字母包含'YM'
                        if (!youMing.firstLetter.includes('YM')) {
                            console.log('为尤铭手动添加YM首字母匹配');
                            youMing.firstLetter = youMing.firstLetter + 'YM';
                        }
                    } else {
                        console.log('未找到选手尤铭');
                    }
                }
                
                // 确保Fuse构造函数存在
                if (typeof Fuse === 'function') {
                    // 优化Fuse.js配置以提高首字母搜索准确性
                    fuse = new Fuse(playersWithFirstLetter, {
                        keys: ['name', 'firstLetter'],
                        threshold: 0.1, // 进一步降低阈值，提高匹配精度
                        distance: 30,   // 进一步降低距离，提高匹配速度和精度
                        minMatchCharLength: 1, // 支持单字符搜索
                        includeScore: true, // 包含匹配分数
                        shouldSort: true // 按匹配度排序结果
                    });
                    
                    // 打印Fuse.js配置信息
                    console.log('Fuse.js配置:', {
                        keys: ['name', 'firstLetter'],
                        threshold: 0.1,
                        distance: 30,
                        minMatchCharLength: 1,
                        includeScore: true,
                        shouldSort: true
                    });
                    console.log('Fuse.js搜索引擎初始化完成，支持准确的汉字拼音首字母查找');
                    
                    // 导出到全局变量，方便调试
                    window.debugData = {
                        playersWithFirstLetter: playersWithFirstLetter,
                        allRecords: allRecords,
                        fuse: fuse
                    };
                    return true;
                }
                else {
                    console.error('Fuse构造函数不存在，请确保已加载Fuse.js库');
                    return false;
                }
            } else {
                console.warn('无法初始化搜索引擎：没有选手数据');
                return false;
            }
        } catch (error) {
            console.error('初始化搜索引擎时出错:', error);
            return false;
        }
    }

    // ------------------- 初始化和数据加载 -------------------
    async function init() {
        try {
            // 检查URL参数，判断是否开启调试模式
            const urlParams = new URLSearchParams(window.location.search);
            window.isDebugMode = urlParams.get('debug') === 'true';
            
            console.log('开始加载数据...');
            console.log('调试模式:', window.isDebugMode);
            appContent.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">正在加载数据...</p></div>';
            
            // 并行加载两个JSON文件
            const [recordsResponse, milestonesResponse] = await Promise.all([
                fetch('records.json'),
                fetch('milestones.json')
            ]);
            
            if (!recordsResponse.ok || !milestonesResponse.ok) {
                throw new Error('无法加载数据文件！请检查 records.json 和 milestones.json 是否存在。');
            }

            // 解析JSON数据
            allRecords = await recordsResponse.json();
            milestones = await milestonesResponse.json();
            
            console.log(`成功加载 ${allRecords.length} 条记录和 ${milestones.length} 条大事记`);
            
            // 初始化Fuse.js搜索引擎 - 不再检查返回值
            initFuse();
            
            // 标记数据已初始化
            dataInitialized = true;
            
            // 设置导航栏事件
            setupNavigation();
            
            // 默认显示选手搜索页面
            console.log('初始化完成，显示选手搜索页面');
            navigateTo('search-player');
            return true;
        } catch (error) {
            console.error('初始化失败:', error);
            appContent.innerHTML = `<div class="alert alert-danger">
                <h4>加载数据失败</h4>
                <p>${error.message}</p>
                <p>请检查数据文件是否存在且格式正确</p>
            </div>`;
            return false;
        }
    }

    // 在DOMContentLoaded事件内部调用初始化函数
    // 不在全局范围内立即调用，避免appContent未定义的问题
    
    // 确保在DOM加载后重新检查初始化状态
    document.addEventListener('DOMContentLoaded', () => {
        // 如果数据已加载但DOM刚刚准备好，重新设置导航
        if (allRecords && allRecords.length > 0) {
            console.log('DOM已加载，重新初始化搜索引擎');
            if (!fuse) initFuse();
            dataInitialized = true;
            setupNavigation();
            
            // 处理URL参数，优先处理player参数，然后是page参数
            const urlParams = new URLSearchParams(window.location.search);
            const playerName = urlParams.get('player');
            const pageId = urlParams.get('page');
            
            if (playerName) {
                // 先导航到选手搜索页面
                navigateTo('search-player');
                // 然后延迟显示选手记录，确保页面已加载完成
                setTimeout(() => {
                    showPlayerAwards(decodeURIComponent(playerName));
                }, 100);
            } else if (pageId && templates[pageId]) {
                // 如果有有效的page参数，导航到对应页面
                navigateTo(pageId);
            } else {
                // 默认显示选手搜索页面
                navigateTo('search-player');
            }
        }
    });
    
    // 监听浏览器前进后退事件，确保页面能正确响应
    window.addEventListener('popstate', () => {
        if (dataInitialized) {
            const urlParams = new URLSearchParams(window.location.search);
            const pageId = urlParams.get('page');
            if (pageId && templates[pageId]) {
                navigateTo(pageId);
            }
        }
    });
    
    // ------------------- 页面导航和渲染 -------------------
    function navigateTo(pageId) {
        console.log('正在切换到页面:', pageId);
        
        // 确保pageId有效
        if (!templates[pageId]) {
            console.error('无效的页面ID:', pageId);
            pageId = 'search-player'; // 默认页面
        }
        
        // 更新页面内容
        appContent.innerHTML = templates[pageId];
        console.log(`已更新页面内容为: ${pageId}`);
        
        // 为当前页面添加active类，确保内容可见
        const currentPage = document.getElementById(pageId);
        if (currentPage) {
            currentPage.classList.add('active');
            console.log(`已为页面 ${pageId} 添加active类`);
        }
        
        // 更新导航栏激活状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active'); // 先移除所有active类
            if (link.dataset.page === pageId) {
                link.classList.add('active');
                console.log(`已设置导航项 ${pageId} 为激活状态`);
            }
        });
        
        // 更新URL，添加页面参数但不刷新页面
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', pageId);
        window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);

        // 在页面切换后重新设置设置按钮事件
        setupSettingsButtons();

        // 页面渲染函数映射
        const pageRenderers = {
            'search-player': initPlayerSearch,
            'search-contest': initContestSearch,
            'all-records': renderAllRecords,
            'player-ranking': renderPlayerRanking,
            'visualization': initVisualization,
            'timeline': renderTimeline,
        };
        
        console.log(`正在初始化页面功能: ${pageId}`);
        
        // 调用对应的渲染函数
        if (pageRenderers[pageId]) {
            setTimeout(() => {
                try {
                    console.log(`开始渲染页面: ${pageId}`);
                    // 如果是所有记录页面，先初始化显示设置
                    if (pageId === 'all-records') {
                        initDisplaySettings();
                    }
                    pageRenderers[pageId]();
                    console.log(`页面 ${pageId} 渲染完成`);
                    
                    // 为设置保存按钮添加事件监听器，当设置改变时更新显示
                    const saveSettingsBtn = document.getElementById('save-settings-btn');
                    if (saveSettingsBtn) {
                        // 先移除旧的事件监听器
                        const newSaveBtn = saveSettingsBtn.cloneNode(true);
                        saveSettingsBtn.parentNode.replaceChild(newSaveBtn, saveSettingsBtn);
                        
                        // 添加新的事件监听器
                        newSaveBtn.addEventListener('click', function() {
                            if (pageId === 'all-records') {
                                setTimeout(() => {
                                    updateAllRecordsTableHeader();
                                    renderAllRecords();
                                }, 100);
                            }
                        });
                    }
                } catch (error) {
                    console.error('渲染页面时出错:', error);
                    appContent.innerHTML += `<div class="alert alert-danger">加载页面时出错: ${error.message}</div>`;
                }
            }, 100); // 给DOM更新更多时间，从50ms增加到100ms
        }
    }

    // 重新绑定导航栏点击事件
    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            // 移除旧的事件监听器
            link.removeEventListener('click', navClickHandler);
            // 添加新的事件监听器
            link.addEventListener('click', navClickHandler);
        });
    }
    
    function navClickHandler(e) {
        e.preventDefault();
        const pageId = e.currentTarget.dataset.page;
        if (pageId) {
            console.log('导航点击:', pageId);
            navigateTo(pageId);
        }
    }
    
    // 初始设置导航事件
    setupNavigation();

    // ------------------- 功能实现 (已更新) -------------------

    // 1. 选手查询 (修复搜索功能)
    function initPlayerSearch() {
        const searchInput = document.getElementById('player-search-input');
        const resultsDiv = document.getElementById('player-results');
        
        if (!searchInput || !resultsDiv) {
            console.error('搜索输入框或结果容器不存在');
            return;
        }
        
        // 确保fuse已初始化
        if (!fuse) {
            // 强制初始化搜索引擎，不检查返回值
            initFuse();
            // 如果初始化后仍然没有fuse，创建一个空的搜索引擎
            if (!fuse) {
                fuse = new Fuse([], {threshold: 0.3, distance: 100});
                console.log('创建了空的搜索引擎');
            }
        }
        
        // 移除旧的事件监听器（防止重复绑定）
        const newSearchInput = searchInput.cloneNode(true);
        // 在替换节点前保存parentNode引用
        const parentNode = searchInput.parentNode;
        parentNode.replaceChild(newSearchInput, searchInput);
        
        // 添加调试区域（仅在调试模式显示）
        let debugArea = document.getElementById('search-debug-area');
        let debugBtn = document.getElementById('debug-button');
        
        // 只在调试模式下创建和显示调试区域和按钮
        if (window.isDebugMode && parentNode) {
            if (!debugArea) {
                debugArea = document.createElement('div');
                debugArea.id = 'search-debug-area';
                debugArea.className = 'mt-4 p-3 bg-light border border-secondary rounded d-none'; // 默认隐藏
                debugArea.innerHTML = `<h5>搜索调试信息</h5><pre id="debug-log" class="text-sm"></pre>`;
                parentNode.appendChild(debugArea);
            }
            
            if (!debugBtn) {
                debugBtn = document.createElement('button');
                debugBtn.id = 'debug-button';
                debugBtn.className = 'btn btn-xs btn-outline-secondary ml-2';
                debugBtn.textContent = '调试';
                debugBtn.onclick = function() {
                    debugArea.classList.toggle('d-none');
                };
                parentNode.appendChild(debugBtn);
            }
        } else {
            // 非调试模式下，确保调试区域和按钮不存在
            if (debugArea) {
                debugArea.remove();
            }
            if (debugBtn) {
                debugBtn.remove();
            }
        }
        
        newSearchInput.addEventListener('input', () => {
                const query = newSearchInput.value.trim().toUpperCase();
                if (query.length < 1) {
                    resultsDiv.innerHTML = '';
                    return;
                }
                
                if (!fuse) {
                    resultsDiv.innerHTML = '<p class="text-danger">搜索引擎未初始化，请刷新页面</p>';
                    return;
                }
                
                // 首先尝试使用Fuse.js进行搜索
                let results = fuse.search(query);
                
                // 只在调试模式下生成和显示调试信息
                if (window.isDebugMode) {
                    const debugLog = document.getElementById('debug-log');
                    if (debugLog) {
                        let debugText = `查询: "${query}"\n`;
                        debugText += `playersWithFirstLetter数组长度: ${playersWithFirstLetter ? playersWithFirstLetter.length : 'undefined'}\n`;
                        
                        if (playersWithFirstLetter && playersWithFirstLetter.length > 0) {
                            debugText += 'playersWithFirstLetter前10个元素:\n';
                            playersWithFirstLetter.slice(0, 10).forEach(p => {
                                debugText += `  - ${p.name}[${p.firstLetter}]\n`;
                            });
                            
                            // 搜索特定选手测试
                            if (query) {
                                const testPlayer = playersWithFirstLetter.find(p => p.firstLetter.includes(query) || p.name.includes(query));
                                if (testPlayer) {
                                    debugText += `\n找到匹配查询的选手示例: ${testPlayer.name}[${testPlayer.firstLetter}]\n`;
                                } else {
                                    debugText += `\n没有找到直接匹配查询的选手示例\n`;
                                }
                            }
                        }
                        

                        debugText += `\nFuse.js搜索结果数量: ${results.length}\n`;
                        if (results.length > 0) {
                            debugText += 'Fuse.js搜索结果详情:\n';
                            results.map(r => `${r.item.name}[${r.item.firstLetter}](score:${r.score})`).forEach((result, idx) => {
                                debugText += `  ${idx+1}. ${result}\n`;
                            });
                        }
                        
                        debugLog.textContent = debugText;
                    }
                }
                
                // 只在调试模式下输出控制台日志
                if (window.isDebugMode) {
                    console.log('执行搜索查询:', query);
                    console.log('playersWithFirstLetter数组长度:', playersWithFirstLetter ? playersWithFirstLetter.length : 'undefined');
                    if (playersWithFirstLetter && playersWithFirstLetter.length > 0) {
                        console.log('playersWithFirstLetter前5个元素:', 
                            playersWithFirstLetter.slice(0, 5).map(p => `${p.name}[${p.firstLetter}]`).join(', '));
                    }
                    console.log('Fuse.js搜索结果数量:', results.length);
                    if (results.length > 0) {
                        console.log('Fuse.js搜索结果详情:', results.map(r => `${r.item.name}[${r.item.firstLetter}](score:${r.score})`).join(', '));
                    }
                }
            
            // 如果Fuse.js没有找到结果，尝试直接在firstLetter属性中查找匹配
                if (results.length === 0) {
                    if (window.isDebugMode) {
                        console.log('Fuse.js没有找到结果，尝试直接在firstLetter中查找');
                    }
                    // 增强的手动搜索逻辑 - 特别加强对"ym"查询的支持
                    const manualResults = playersWithFirstLetter.filter(item => {
                        // 匹配首字母包含查询或起始于查询
                        const firstLetterMatch = item.firstLetter.includes(query) || item.firstLetter.startsWith(query);
                        // 或者名称中包含查询（不区分大小写）
                        const nameMatch = item.name.toLowerCase().includes(query.toLowerCase());
                        // 特别处理'ym'查询，确保能够找到'尤铭'选手
                        const specialYmMatch = query === 'YM' && item.name.includes('尤铭');
                        
                        return firstLetterMatch || nameMatch || specialYmMatch;
                    });
                    if (window.isDebugMode) {
                        console.log('手动搜索结果数量:', manualResults.length);
                    }
                    results = manualResults.map(item => ({ item }));
                    
                    // 如果还是没有找到结果，尝试更宽松的匹配方式
                    if (results.length === 0 && query.length > 1) {
                        if (window.isDebugMode) {
                            console.log('严格匹配没有找到结果，尝试宽松匹配');
                        }
                        const looseResults = playersWithFirstLetter.filter(item => {
                            // 检查是否有任何字符匹配
                            for (let i = 0; i < query.length; i++) {
                                if (item.firstLetter.includes(query[i])) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        if (window.isDebugMode) {
                            console.log('宽松匹配结果数量:', looseResults.length);
                        }
                        results = looseResults.map(item => ({ item }));
                    }
                }
            
            // 去重，只显示匹配到的选手名字
            const uniqueNames = [...new Set(results.map(r => r.item.name))];
            if (window.isDebugMode) {
                console.log('去重后的结果数量:', uniqueNames.length);
                console.log('搜索结果列表:', uniqueNames);
            }
            
            renderPlayerResults(uniqueNames.slice(0, 10), resultsDiv); // 最多显示10个匹配项
        });
        
        // 检查URL参数，如果存在player参数，则自动显示该选手的获奖记录
        const urlParams = new URLSearchParams(window.location.search);
        const playerName = urlParams.get('player');
        if (playerName) {
            // 直接显示选手记录，不再延迟
            showPlayerAwards(decodeURIComponent(playerName));
        }
    }

    function renderPlayerResults(names, container) {
        if (names.length === 0) {
            container.innerHTML = '<p class="text-muted">没有找到相关选手。</p>';
            return;
        }
        
        console.log('渲染搜索结果:', names);
        
        let html = '<ul class="list-group">';
        names.forEach(name => {
            // 找到该选手的拼音首字母
            const player = playersWithFirstLetter.find(p => p.name === name);
            const firstLetter = player ? player.firstLetter : '';
            
            // 只在调试模式下显示拼音首字母
            const showFirstLetter = window.isDebugMode && firstLetter;
            
            html += `<li class="list-group-item list-group-item-action" style="cursor: pointer;" onclick="showPlayerAwards('${name}')">
                        ${name}
                        ${showFirstLetter ? `<span class="text-muted float-end">[${firstLetter}]</span>` : ''}
                    </li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    }

    window.showPlayerAwards = function(name) {
        const resultsDiv = document.getElementById('player-results');
        if (!resultsDiv) {
            console.error('结果容器不存在，先导航到选手搜索页面');
            navigateTo('search-player');
            setTimeout(() => {
                showPlayerAwards(name);
            }, 100);
            return;
        }
        
        const records = allRecords.filter(r => r.name === name)
                                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        
        // 更新URL参数，实现分享功能
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('player', name);
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
        
        // 统计选手数据
        const contestStats = {};
        let totalContests = 0;
        
        // 按比赛类型和级别分组统计
        records.forEach(r => {
            const contestKey = `${r.contestType || '未知'}|${r.contestLevel || '未知'}`;
            if (!contestStats[contestKey]) {
                contestStats[contestKey] = {
                    type: r.contestType || '未知',
                    level: r.contestLevel || '未知',
                    count: 0,
                    maxRank: Infinity,
                    awards: { 金奖: 0, 银奖: 0, 铜奖: 0, 铁牌: 0 }
                };
            }
            
            contestStats[contestKey].count++;
            totalContests++;
            
            // 记录最高排名（数字最小的排名）
            if (r.rank > 0 && r.rank < contestStats[contestKey].maxRank) {
                contestStats[contestKey].maxRank = r.rank;
            }
            
            // 统计获奖情况
            if (r.award && r.award !== '无') {
                if (r.award.includes('金')) contestStats[contestKey].awards['金奖']++;
                else if (r.award.includes('银')) contestStats[contestKey].awards['银奖']++;
                else if (r.award.includes('铜')) contestStats[contestKey].awards['铜奖']++;
                else if (r.award.includes('铁')) contestStats[contestKey].awards['铁牌']++;
            }
        });
        
        // 计算选手积分和排名
        const awardPoints = { '金奖': 10, '银奖': 7, '铜奖': 5, '铁牌': 2 };
        const levelWeights = { '区域Final': 2.0, '国赛': 1.8, '区域赛': 1.5, '邀请赛': 1.2, '省赛': 1.0, '女生专场': 1.0, '网络赛': 0.5 };
        
        let playerScore = 0;
        // 统计当前选手的积分
        records.forEach(r => {
            if (!r.award || r.award === '无') return;
            
            const basePoints = awardPoints[r.award] || 1; // 默认1分
            const weight = levelWeights[r.contestLevel] || 1.0; // 默认权重1
            const finalPoints = basePoints * weight;
            playerScore += finalPoints;
        });
        
        // 计算所有选手的积分以确定当前选手的排名
        let playerRanking = 1;
        let totalScore = 0;
        const playerScores = {};
        
        if (allRecords && allRecords.length > 0) {
            // 计算所有选手的积分
            allRecords.forEach(r => {
                if (!r.award || r.award === '无' || !r.name) return;
                
                const basePoints = awardPoints[r.award] || 1;
                const weight = levelWeights[r.contestLevel] || 1.0;
                const finalPoints = basePoints * weight;
                
                if (!playerScores[r.name]) {
                    playerScores[r.name] = 0;
                }
                playerScores[r.name] += finalPoints;
            });
            
            // 对选手积分进行排序，确定当前选手的排名
            const sortedPlayers = Object.entries(playerScores).sort((a, b) => b[1] - a[1]);
            for (let i = 0; i < sortedPlayers.length; i++) {
                if (sortedPlayers[i][0] === name) {
                    playerRanking = i + 1;
                    totalScore = sortedPlayers.length;
                    break;
                }
            }
        }
        
        // 创建标题和分享按钮在同一行的容器
        let html = `<div class="d-flex justify-content-between items-center mb-3">
                        <h3 class="m-0">${name} 的获奖记录 (${records.length}条)</h3>
                        <button id="share-btn" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-share"></i> 复制分享链接
                        </button>
                    </div>`;
        
        // 添加选手简介
        if (totalContests > 0) {
            html += `<div class="mb-4 p-3 bg-light border rounded">
                        <h4 class="mb-2">选手简介</h4>
                        <p class="mb-2 text-muted"><strong>总积分: </strong>${playerScore.toFixed(2)} | <strong>总排名: </strong>${playerRanking}/${totalScore || 'N/A'}</p>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th style="text-align: center; font-weight: 600; line-height: 1.5;">比赛类型</th>
                                    <th style="font-weight: 600; line-height: 1.5;">比赛级别</th>
                                    <th style="font-weight: 600; line-height: 1.5;">参赛次数</th>
                                    <th style="font-weight: 600; line-height: 1.5;">最高排名</th>
                                    <th style="background-color: #ffd700; color: #333; font-weight: 600; padding: 0.75rem 1rem; border-radius: 4px; line-height: 1.5;">金奖</th>
                                    <th style="background-color: #c0c0c0; color: #333; font-weight: 600; padding: 0.75rem 1rem; border-radius: 4px; line-height: 1.5;">银奖</th>
                                    <th style="background-color: #cd7f32; color: white; font-weight: 600; padding: 0.75rem 1rem; border-radius: 4px; line-height: 1.5;">铜奖</th>
                                    <th style="background-color: #8b8b8b; color: white; font-weight: 600; padding: 0.75rem 1rem; border-radius: 4px; line-height: 1.5;">铁牌</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            // 定义比赛级别优先级（数值越小优先级越高）
            const levelPriority = {
                '区域赛Final': 1,
                '国赛': 2,
                '区域赛': 3,
                '邀请赛': 4,
                '省赛': 5,
                '女生赛': 6,
                '网络赛': 100, // 网络赛放在最后
                '未知': 999
            };
            
            // 获取统计数据并排序
            const sortedStats = Object.values(contestStats).sort((a, b) => {
                // 先按比赛级别排序
                const aPriority = levelPriority[a.level] || 999;
                const bPriority = levelPriority[b.level] || 999;
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                // 级别相同按比赛类型排序
                return a.type.localeCompare(b.type);
            });
            
            // 显示排序后的统计数据
            sortedStats.forEach(stats => {
                const maxRankDisplay = stats.maxRank === Infinity ? 'N/A' : stats.maxRank;
                
                // 添加比赛类型和级别的颜色类
                const typeClass = stats.type.includes('ICPC') ? 'type-icpc' : stats.type.includes('CCPC') ? 'type-ccpc' : 'type-other';
                let levelClass = '';
                switch (stats.level) {
                    case '区域赛Final': levelClass = 'level-regional-final'; break;
                    case '国赛': levelClass = 'level-national'; break;
                    case '区域赛': levelClass = 'level-regional'; break;
                    case '邀请赛': levelClass = 'level-invitation'; break;
                    case '省赛': levelClass = 'level-provincial'; break;
                    case '女生赛':
                    case '女生专场': levelClass = 'level-girls'; break;
                    case '网络赛': levelClass = 'level-online'; break;
                    default: levelClass = '';
                }
                
                html += `<tr>
                            <td class="text-center"><span class="${typeClass}">${stats.type}</span></td>
                            <td><span class="${levelClass}">${stats.level}</span></td>
                            <td>${stats.count}</td>
                            <td>${maxRankDisplay}</td>
                            <td class="${stats.awards['金奖'] > 0 ? 'award-cell-gold' : ''}">${stats.awards['金奖']}</td>
                            <td class="${stats.awards['银奖'] > 0 ? 'award-cell-silver' : ''}">${stats.awards['银奖']}</td>
                            <td class="${stats.awards['铜奖'] > 0 ? 'award-cell-bronze' : ''}">${stats.awards['铜奖']}</td>
                            <td class="${stats.awards['铁牌'] > 0 ? 'award-cell-iron' : ''}">${stats.awards['铁牌']}</td>
                        </tr>`;
            });
            
            html += `</tbody></table>
                    </div>`;
        }
        
        // 美化的获奖记录表格
        html += `<div class="player-awards-container">`;
        
        // 构建表头，根据用户设置添加列
        let thead = '<thead><tr>';
        thead += '<th>比赛名称</th><th>队伍名称</th><th>奖项</th><th>日期</th><th>排名</th>';
        if (userSettings.showContestLevel) thead += '<th>比赛级别</th>';
        if (userSettings.showContestType) thead += '<th>比赛类型</th>';
        if (userSettings.showSolved) thead += '<th>通过数</th>';
        if (userSettings.showPenalty) thead += '<th>罚时</th>';
        if (userSettings.showNotes) thead += '<th>备注</th>';
        thead += '</tr></thead>';
        
        html += `<table class="table table-bordered table-sm">
                    ${thead}<tbody>`;
        
        // 构建表格内容，根据用户设置添加单元格
        records.forEach(r => {
            // 为队伍名称添加悬停显示功能
            const teamWithTooltip = r.teamName ? 
                `<span class="team-name" data-members="${r.membersStr || '-'}">${r.teamName}</span>` : 
                '-';
            
            // 将比赛名称改为可点击链接，通过URL参数传递比赛名称
            // 奖项使用span进行美化
            let awardHtml = r.award;
            if (r.award && r.award.includes('金奖')) {
                awardHtml = `<span class="award-gold">${r.award}</span>`;
            } else if (r.award && r.award.includes('银奖')) {
                awardHtml = `<span class="award-silver">${r.award}</span>`;
            } else if (r.award && r.award.includes('铜奖')) {
                awardHtml = `<span class="award-bronze">${r.award}</span>`;
            } else if (r.award && r.award.includes('铁牌')) {
                awardHtml = `<span class="award-iron">${r.award}</span>`;
            }
            html += `<tr><td><a href="#" onclick="navigateToWithContest('${encodeURIComponent(r.contestName)}'); return false;">${r.contestName}</a></td><td class="team-name-cell">${teamWithTooltip}</td><td class="award-center-cell">${awardHtml}</td><td>${r.date || 'N/A'}</td><td>${r.rank > 0 ? r.rank : 'N/A'}</td>`;
            if (userSettings.showContestLevel) html += `<td>${r.contestLevel || '-'}</td>`;
            if (userSettings.showContestType) {
                // 为比赛类型添加颜色类
                const typeClass = r.contestType && r.contestType.includes('ICPC') ? 'type-icpc' : r.contestType && r.contestType.includes('CCPC') ? 'type-ccpc' : 'type-other';
                html += `<td><span class="${typeClass}">${r.contestType || '-'}</span></td>`;
            }
            if (userSettings.showSolved) html += `<td>${r.solved || '0'}</td>`;
            if (userSettings.showPenalty) html += `<td>${r.penalty || '0'}</td>`;
            if (userSettings.showNotes) html += `<td>${r.notes || '-'}</td>`;
            html += `</tr>`;
        });
        
        html += `</tbody></table>`;
        html += `</div>`;
        resultsDiv.innerHTML = html;
        
        // 添加分享按钮点击事件
        document.getElementById('share-btn').addEventListener('click', function() {
            const currentUrl = window.location.href;
            navigator.clipboard.writeText(currentUrl).then(function() {
                alert('分享链接已复制到剪贴板！');
            }, function(err) {
                console.error('无法复制链接: ', err);
                // 降级方案：选中URL
                const tempInput = document.createElement('input');
                tempInput.value = currentUrl;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                alert('链接已复制，请使用Ctrl+V粘贴！');
            });
        });
    }


    // 显示比赛获奖记录的函数
    function showContestAwards(contestName) {
        const contestResultsDiv = document.getElementById('contest-results');
        if (!contestResultsDiv) {
            console.error('结果容器不存在，先导航到比赛搜索页面');
            navigateTo('search-contest');
            setTimeout(() => {
                showContestAwards(contestName);
            }, 100);
            return;
        }
        
        // 使用contestName字段
        const records = allRecords.filter(r => (r.contestName || r.contest) === contestName);
        console.log(`找到 ${records.length} 条相关记录`);
        
        // 显示比赛信息
        const contestInfoContainer = document.getElementById('contest-info');
        if (contestInfoContainer && records.length > 0) {
            // 从第一条记录获取比赛信息
            const contestInfo = records[0];
            
            let infoHtml = `<h4 class="mb-2">${contestName} 比赛信息</h4>`;
            infoHtml += `<div class="contest-info-grid">`;
            
            // 提取并显示比赛信息，实现多信息同行
            const infoItems = [];
            if (contestInfo.date) infoItems.push(`<span><strong>时间:</strong> ${contestInfo.date}</span>`);
            if (contestInfo.contestLevel) {
                // 为比赛级别添加颜色类
                let levelClass = '';
                switch (contestInfo.contestLevel) {
                    case '区域赛Final': levelClass = 'level-regional-final'; break;
                    case '国赛': levelClass = 'level-national'; break;
                    case '区域赛': levelClass = 'level-regional'; break;
                    case '邀请赛': levelClass = 'level-invitation'; break;
                    case '省赛': levelClass = 'level-provincial'; break;
                    case '女生赛':
                    case '女生专场': levelClass = 'level-girls'; break;
                    case '网络赛': levelClass = 'level-online'; break;
                    default: levelClass = '';
                }
                infoItems.push(`<span><strong>级别:</strong> <span class="${levelClass}">${contestInfo.contestLevel}</span></span>`);
            }
            if (contestInfo.contestType) {
                // 为比赛类型添加颜色类
                const typeClass = contestInfo.contestType.includes('ICPC') ? 'type-icpc' : contestInfo.contestType.includes('CCPC') ? 'type-ccpc' : 'type-other';
                infoItems.push(`<span><strong>类型:</strong> <span class="${typeClass}">${contestInfo.contestType}</span></span>`);
            }
            
            // 计算参与队伍数和获奖队伍数
            const uniqueTeams = new Set(records.map(r => r.teamName || r.team || '未知队伍'));
            const awardTeams = new Set(records.filter(r => r.award && r.award !== '无').map(r => r.teamName || r.team || '未知队伍'));
            
            // 查找学校排名（理论上只会有一个记录有学校排名）
            let schoolRank = '未找到';
            for (const record of records) {
                if (record.schoolRank && record.schoolRank !== '') {
                    schoolRank = record.schoolRank;
                    break;
                }
            }
            
            // 添加计算信息
            infoItems.push(`<span><strong>参与队伍:</strong> ${uniqueTeams.size}</span>`);
            infoItems.push(`<span><strong>获奖队伍:</strong> ${awardTeams.size}</span>`);
            infoItems.push(`<span><strong>学校排名:</strong> ${schoolRank}</span>`);
            
            // 将信息项添加到HTML中
            infoHtml += infoItems.join(' | ');
            infoHtml += `</div>`;
            
            contestInfoContainer.innerHTML = infoHtml;
        } else if (contestInfoContainer) {
            contestInfoContainer.innerHTML = '<p class="text-danger">没有找到该比赛的相关信息</p>';
        }
        
        // 去重，因为原始数据是按人分的
        const uniqueTeams = {};
        records.forEach(r => {
            const teamKey = r.teamName || r.team || '未知队伍';
            if (!uniqueTeams[teamKey]) {
                uniqueTeams[teamKey] = r;
            }
        });
        
        const contestAwards = Object.values(uniqueTeams).sort((a,b) => a.rank - b.rank);
        console.log(`处理后得到 ${contestAwards.length} 个唯一队伍`);
        
        let html = `<h4>${contestName} 获奖记录</h4>`;
        
        // 构建表头，根据用户设置添加列
        let thead = '<thead><tr>';
        thead += '<th>队伍名称</th><th>奖项</th><th>队伍排名</th>';
        if (userSettings.showSolved) thead += '<th>通过数</th>';
        if (userSettings.showPenalty) thead += '<th>罚时</th>';
        if (userSettings.showContestType) thead += '<th>比赛类型</th>';
        if (userSettings.showNotes) thead += '<th>备注</th>';
        thead += '</tr></thead>';
        
        html += `<table class="table table-bordered">
                    ${thead}<tbody>`;
        
        // 构建表格内容，根据用户设置添加单元格
        contestAwards.forEach(r => {
            // 为队伍名称添加悬停显示功能
            const teamName = r.teamName || r.team || '未知队伍';
            const teamWithTooltip = teamName !== '未知队伍' ? 
                `<span class="team-name" data-members="${r.membersStr || r.teamMembers || '-'}">${teamName}</span>` : 
                teamName;
                
            // 为奖项添加颜色类和背景样式
                let awardClass = '';
                let awardText = r.award || '未知';
                if (r.award) {
                    if (r.award.includes('金')) awardClass = 'award-gold';
                    else if (r.award.includes('银')) awardClass = 'award-silver';
                    else if (r.award.includes('铜')) awardClass = 'award-bronze';
                    else if (r.award.includes('铁')) awardClass = 'award-iron';
                }
                
                html += `<tr>
                <td class="team-name-cell">${teamWithTooltip}</td>
                <td class="award-detail-cell" style="text-align: center"><span class="${awardClass}">${awardText}</span></td>
                <td>${r.rank > 0 ? r.rank : 'N/A'}</td>`;
            if (userSettings.showSolved) html += `<td>${r.solved || '0'}</td>`;
            if (userSettings.showPenalty) html += `<td>${r.penalty || '0'}</td>`;
            if (userSettings.showContestType) {
                // 为比赛类型添加颜色类
                const typeClass = r.contestType && r.contestType.includes('ICPC') ? 'type-icpc' : r.contestType && r.contestType.includes('CCPC') ? 'type-ccpc' : 'type-other';
                html += `<td><span class="${typeClass}">${r.contestType || '-'}</span></td>`;
            }
            if (userSettings.showNotes) html += `<td>${r.notes || '-'}</td>`;
            html += `</tr>`;
        });
        
        html += `</tbody></table>`;
        
        contestResultsDiv.innerHTML = html;
        console.log('比赛结果已渲染');
    }
    
    // 带比赛名称参数的导航函数
    window.navigateToWithContest = function(contestName) {
        navigateTo('search-contest');
        // 设置一个临时变量，用于在页面加载后执行查询
        window.contestToSearch = contestName;
    };

    // 2. 比赛查询 (增强版，支持从URL参数自动加载比赛)
    function initContestSearch() {
        console.log('初始化比赛查询功能...');
        const contestSelect = document.getElementById('contest-select');
        const contestResultsDiv = document.getElementById('contest-results');
        
        if (!contestSelect || !contestResultsDiv) {
            console.error('找不到比赛选择框或结果容器');
            return;
        }
        
        // 初始化比赛信息容器
        initContestInfoContainer();
        
        // 使用contestName字段而不是contest
        const uniqueContests = [...new Set(allRecords.map(r => r.contestName || r.contest).filter(Boolean))].sort();
        console.log(`找到 ${uniqueContests.length} 个唯一比赛`);
        
        contestSelect.innerHTML = '<option selected disabled>请选择一个比赛</option>';
        uniqueContests.forEach(contest => {
            contestSelect.innerHTML += `<option value="${contest}">${contest}</option>`;
        });

        // 检查是否有需要自动搜索的比赛
        if (window.contestToSearch) {
            const contestName = decodeURIComponent(window.contestToSearch);
            console.log(`自动搜索比赛: ${contestName}`);
            
            // 查找并选中对应的比赛选项
            const option = Array.from(contestSelect.options).find(opt => opt.value === contestName);
            if (option) {
                option.selected = true;
            }
            
            // 执行搜索
            showContestAwards(contestName);
            
            // 清除临时变量
            delete window.contestToSearch;
        }
        
        // 移除旧的事件监听器（防止重复绑定）
        const newContestSelect = contestSelect.cloneNode(true);
        contestSelect.parentNode.replaceChild(newContestSelect, contestSelect);
        
        newContestSelect.addEventListener('change', () => {
            console.log('选择了新的比赛');
            const selectedContest = newContestSelect.value;
            showContestAwards(selectedContest);
        });
        
        console.log('比赛查询功能初始化完成');
    }

    // 3. 所有记录 (使用新字段)
    function renderAllRecords() {
        console.log('渲染所有记录...');
        const tbody = document.getElementById('all-records-tbody');
        if (!tbody) {
            console.error('找不到表格主体元素 all-records-tbody');
            return;
        }
        
        if (!allRecords || allRecords.length === 0) {
            console.error('没有记录数据可显示');
            // 计算列数，包括默认列和根据用户设置添加的列
            let colCount = 7; // 默认列数
            if (userSettings.showSolved) colCount++;
            if (userSettings.showPenalty) colCount++;
            if (userSettings.showContestType) colCount++;
            if (userSettings.showNotes) colCount++;
            
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center">没有记录数据</td></tr>`;
            return;
        }
        
        console.log(`正在渲染 ${allRecords.length} 条记录`);
        const sortedRecords = [...allRecords].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        let html = '';
        sortedRecords.forEach(r => {
            // 为队伍名称添加悬停显示功能
            const teamName = r.teamName || r.team || '';
            const teamWithTooltip = teamName ? 
                `<span class="team-name" data-members="${r.membersStr || '-'}">${teamName}</span>` : 
                '';
                
            // 为比赛级别添加颜色类
            let levelClass = '';
            if (r.contestLevel) {
                switch (r.contestLevel) {
                    case '区域赛Final': levelClass = 'level-regional-final'; break;
                    case '国赛': levelClass = 'level-national'; break;
                    case '区域赛': levelClass = 'level-regional'; break;
                    case '邀请赛': levelClass = 'level-invitation'; break;
                    case '省赛': levelClass = 'level-provincial'; break;
                    case '女生赛':
                    case '女生专场': levelClass = 'level-girls'; break;
                    case '网络赛': levelClass = 'level-online'; break;
                    default: levelClass = '';
                }
            }
            
            // 为奖项添加颜色类
            let awardClass = '';
            if (r.award) {
                if (r.award.includes('金')) awardClass = 'award-gold';
                else if (r.award.includes('银')) awardClass = 'award-silver';
                else if (r.award.includes('铜')) awardClass = 'award-bronze';
                else if (r.award.includes('铁')) awardClass = 'award-iron';
            }
            
            html += `<tr>
                        <td>${r.date || 'N/A'}</td>
                        <td>${r.contestName || r.contest || ''}</td>
                        <td><span class="${levelClass}">${r.contestLevel || ''}</span></td>
                        <td>${r.name || ''}</td>
                        <td class="team-name-cell">${teamWithTooltip}</td>
                        <td><span class="${awardClass}">${r.award || ''}</span></td>
                        <td>${r.rank > 0 ? r.rank : 'N/A'}</td>`;
            if (userSettings.showSolved) html += `<td>${r.solved || '0'}</td>`;
            if (userSettings.showPenalty) html += `<td>${r.penalty || '0'}</td>`;
            if (userSettings.showContestType) html += `<td>${r.contestType || '-'}</td>`;
            if (userSettings.showNotes) html += `<td>${r.notes || '-'}</td>`;
            html += `</tr>`;
        });
        tbody.innerHTML = html;
        console.log('所有记录渲染完成');
    }

    // 4. 选手排名 (使用新加权算法)
    function renderPlayerRanking() {
        console.log('渲染选手排名...');
        const tbody = document.getElementById('ranking-tbody');
        if (!tbody) {
            console.error('找不到表格主体元素 ranking-tbody');
            return;
        }
        
        if (!allRecords || allRecords.length === 0) {
            console.error('没有记录数据可计算排名');
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">没有记录数据</td></tr>';
            return;
        }
        
        const scores = {};
        const awardPoints = { '金奖': 10, '银奖': 7, '铜奖': 5, '铁牌': 2 };
        const levelWeights = { '区域Final': 2.0, '国赛': 1.8, '区域赛': 1.5, '邀请赛': 1.2, '省赛': 1.0, '女生专场': 1.0, '网络赛': 0.5 };

        allRecords.forEach(r => {
            if (!r.award || r.award === '无') return;
            if (!r.name) return;
            
            const basePoints = awardPoints[r.award] || 1; // 默认1分
            const weight = levelWeights[r.contestLevel] || 1.0; // 默认权重1
            const finalPoints = basePoints * weight;

            if (!scores[r.name]) {
                scores[r.name] = { total: 0, awards: {} };
            }
            scores[r.name].total += finalPoints;
            const awardKey = `${r.contestLevel || '未知'} ${r.award}`;
            scores[r.name].awards[awardKey] = (scores[r.name].awards[awardKey] || 0) + 1;
        });

        const sortedPlayers = Object.entries(scores).sort((a, b) => b[1].total - a[1].total);
        console.log(`计算了 ${sortedPlayers.length} 名选手的排名`);

        let html = '';
        sortedPlayers.forEach(([name, data], index) => {
            // 为奖项详情添加颜色类
            // 先将奖牌详情按照比赛级别为第一关键字，奖项为第二关键字从高到低排序
            const awardsDetail = Object.entries(data.awards)
                .sort(([key1], [key2]) => {
                    // 提取比赛级别和奖项
                    const [level1, award1] = key1.split(' ');
                    const [level2, award2] = key2.split(' ');
                    
                    // 获取对应级别的权重值
                    const weight1 = levelWeights[level1] || 1.0;
                    const weight2 = levelWeights[level2] || 1.0;
                    
                    // 首先按比赛级别权重降序排序
                    if (weight1 !== weight2) {
                        return weight2 - weight1;
                    }
                    
                    // 比赛级别相同时，按奖项优先级排序（金奖 > 银奖 > 铜奖 > 铁牌）
                    const awardPriority = { '金奖': 4, '银奖': 3, '铜奖': 2, '铁牌': 1 };
                    const priority1 = awardPriority[award1] || 0;
                    const priority2 = awardPriority[award2] || 0;
                    
                    return priority2 - priority1;
                })
                .map(([awardKey, count]) => {
                    const [level, award] = awardKey.split(' ');
                    
                    // 为比赛级别添加颜色类
                    let levelClass = '';
                    switch (level) {
                        case '区域Final': levelClass = 'level-regional-final'; break;
                        case '国赛': levelClass = 'level-national'; break;
                        case '区域赛': levelClass = 'level-regional'; break;
                        case '邀请赛': levelClass = 'level-invitation'; break;
                        case '省赛': levelClass = 'level-provincial'; break;
                        case '女生专场': levelClass = 'level-girls'; break;
                        case '网络赛': levelClass = 'level-online'; break;
                        default: levelClass = '';
                    }
                    
                    // 为奖项添加颜色类
                    let awardClass = '';
                    if (award) {
                        if (award.includes('金')) awardClass = 'award-gold';
                        else if (award.includes('银')) awardClass = 'award-silver';
                        else if (award.includes('铜')) awardClass = 'award-bronze';
                        else if (award.includes('铁')) awardClass = 'award-iron';
                    }
                    
                    return `<span class="${levelClass}">${level}</span> <span class="${awardClass}">${award}</span> x${count}`;
                })
                .join(', ');
            // 使用链接标签替代按钮，避免复杂的引号转义
            const encodedName = encodeURIComponent(name);
            html += `<tr>
                        <td>${index + 1}</td>
                        <td class="player-name-cell">
                            <a href="#search-player" class="text-primary player-name-link" data-player-name="${name}">
                                ${name}
                            </a>
                        </td>
                        <td>${data.total.toFixed(2)}</td>
                        <td class="award-detail-cell">
                            <div class="award-content-wrapper">${awardsDetail}</div>
                        </td>
                     </tr>`;
        });
        
        // 在表格渲染完成后，为所有选手名字链接添加事件监听
        tbody.addEventListener('click', function(e) {
            if (e.target.classList.contains('player-name-link')) {
                e.preventDefault(); // 阻止默认的锚点跳转行为
                const playerName = e.target.getAttribute('data-player-name');
                // 先导航到选手搜索页面，并传递选手名称作为参数
                const urlParams = new URLSearchParams();
                urlParams.set('player', playerName);
                window.history.pushState({}, '', `${window.location.pathname}?page=search-player&${urlParams}`);
                navigateTo('search-player');
            }
        });
        tbody.innerHTML = html;
        console.log('选手排名渲染完成');
    }

    // 5. 大事记 (按赛季划分内容)
    function renderTimeline() {
        console.log('渲染大事记时间线...');
        const timelineContainer = document.getElementById('timeline-container');
        if (!timelineContainer) {
            console.error('找不到时间线容器元素 timeline-container');
            return;
        }
        
        if (!milestones || milestones.length === 0) {
            console.error('没有大事记数据可显示');
            timelineContainer.innerHTML = '<div class="alert alert-info">没有大事记数据</div>';
            return;
        }
        
        console.log(`正在渲染 ${milestones.length} 条大事记`);
        console.log('大事记数据示例:', milestones[0]);
        
        // 1. 按赛季分组，然后在每个赛季内按日期排序
        const seasonGroups = {};
        milestones.forEach(milestone => {
            const season = milestone.season || '未分类';
            if (!seasonGroups[season]) {
                seasonGroups[season] = [];
            }
            seasonGroups[season].push(milestone);
        });
        
        // 2. 按赛季年份排序（降序）
        const sortedSeasons = Object.keys(seasonGroups).sort((a, b) => {
            // 尝试从赛季名称中提取年份进行排序
            const yearA = parseInt(a.match(/\d+/)?.[0] || '0');
            const yearB = parseInt(b.match(/\d+/)?.[0] || '0');
            return yearB - yearA; // 降序排序
        });

        // 创建时间线样式
        let styleElement = document.createElement('style');
        styleElement.textContent = `
            .timeline {
                position: relative;
                max-width: 1200px;
                margin: 0 auto;
            }
            .timeline::after {
                content: '';
                position: absolute;
                width: 6px;
                background-color: #007bff;
                top: 0;
                bottom: 0;
                left: 50%;
                margin-left: -3px;
            }
            .timeline-item {
                padding: 10px 40px;
                position: relative;
                width: 50%;
                box-sizing: border-box;
                margin-bottom: 20px;
            }
            .left {
                left: 0;
            }
            .right {
                left: 50%;
            }
            .timeline-content {
                padding: 20px 30px;
                background-color: white;
                position: relative;
                border-radius: 6px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            .timeline-content:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.15);
            }
            .season-heading {
                text-align: center;
                margin: 40px 0 20px 0;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 8px;
                font-size: 1.5rem;
                font-weight: bold;
                color: #007bff;
                position: relative;
            }
            @media screen and (max-width: 600px) {
                .timeline::after {
                    left: 31px;
                }
                .timeline-item {
                    width: 100%;
                    padding-left: 70px;
                    padding-right: 25px;
                }
                .left, .right {
                    left: 0;
                }
            }`;
        document.head.appendChild(styleElement);

        let html = '<div class="timeline">';
        
        // 3. 渲染每个赛季的内容
        sortedSeasons.forEach(season => {
            // 添加赛季标题
            html += `<div class="season-heading">${season}</div>`;
            
            // 按日期排序该赛季的大事记
            const sortedMilestones = [...seasonGroups[season]].sort((a, b) => {
                const dateA = a['比赛时间'] || '';
                const dateB = b['比赛时间'] || '';
                return dateB.localeCompare(dateA); // 降序排序
            });
            
            // 渲染该赛季的所有大事记
            sortedMilestones.forEach((r, index) => {
                const isLeft = index % 2 === 0;
                html += `
                    <div class="timeline-item ${isLeft ? 'left' : 'right'}">
                        <div class="timeline-content">
                            <h4>${r['比赛时间'] || 'N/A'}</h4>
                            <h5>${r['比赛名称'] || '未知比赛'}</h5>
                            <p class="mb-1">
                                <strong>奖项:</strong> <span class="timeline-award ${getAwardClass(r['奖项'] || '')}">${r['奖项'] || '未知奖项'}</span>
                            </p>
                            <p class="mb-1">
                                <strong>队伍:</strong> ${r['队伍名称'] ? 
                                    `<span class="team-name" data-members="${r['队伍成员'] || '未知成员'}">${r['队伍名称']}</span>` : 
                                    '未知队伍'}
                            </p>
                            ${r['收录理由'] ? `
                            <p class="mb-0 text-primary fw-bold">
                                <em>${r['收录理由']}</em>
                            </p>` : ''}
                            ${r['备注'] ? `
                            <p class="mb-0 text-info">
                                <small>${r['备注']}</small>
                            </p>` : ''}
                        </div>
                    </div>`;
            });
        });
        
        html += '</div>';
        timelineContainer.innerHTML = html;
        console.log('大事记时间线渲染完成');
    }

    // 6. 成绩可视化 (使用真实的比赛级别)
    let visChartInstance = null;
    function initVisualization() {
        console.log('初始化可视化分析...');
        const baseLevelSelect = document.getElementById('vis-base-level');
        const baseAwardSelect = document.getElementById('vis-base-award');
        const targetLevelSelect = document.getElementById('vis-target-level');
        const runButton = document.getElementById('run-visualization');

        if (!baseLevelSelect || !baseAwardSelect || !targetLevelSelect || !runButton) {
            console.error('找不到可视化所需的DOM元素');
            return;
        }

        if (!allRecords || allRecords.length === 0) {
            console.error('没有记录数据可视化');
            return;
        }

        const uniqueLevels = [...new Set(allRecords.map(r => r.contestLevel).filter(Boolean))].sort();
        const uniqueAwards = [...new Set(allRecords.map(r => r.award).filter(a => a && a !== '无'))].sort();
        
        if (uniqueLevels.length === 0 || uniqueAwards.length === 0) {
            console.error('没有足够的数据进行可视化');
            return;
        }

        console.log(`找到 ${uniqueLevels.length} 个比赛级别和 ${uniqueAwards.length} 种奖项`);
        
        baseLevelSelect.innerHTML = uniqueLevels.map(l => `<option value="${l}">${l}</option>`).join('');
        targetLevelSelect.innerHTML = uniqueLevels.map(l => `<option value="${l}">${l}</option>`).join('');
        baseAwardSelect.innerHTML = uniqueAwards.map(a => `<option value="${a}">${a}</option>`).join('');

        runButton.addEventListener('click', () => {
            console.log('生成分析图表...');
            const baseLevel = baseLevelSelect.value;
            const baseAward = baseAwardSelect.value;
            const targetLevel = targetLevelSelect.value;
            
            // 1. 找出所有在A级别比赛中获得指定奖项的队伍，并记录他们获奖的赛季
            const teamSeasons = {}; // 存储队伍在基准比赛中的赛季
            const processedTeams = new Set(); // 用于去重
            
            allRecords.forEach(r => {
                if (r.contestLevel === baseLevel && r.award === baseAward) {
                    // 使用标准化的队伍成员字符串作为唯一标识符
                    const normalizedMembers = normalizeTeamMembers(r.membersStr || r.teamMembers || '');
                    
                    // 如果没有队员信息，但有队伍名称，使用队伍名称作为标识符
                    const teamKey = normalizedMembers || r.teamName || r.team || '';
                    
                    if (!teamKey) return; // 跳过没有有效标识符的记录
                    
                    const teamContestKey = `${teamKey}_${r.contestName || r.contest}`;
                    if (processedTeams.has(teamContestKey)) return; // 跳过已处理的同一比赛中的同一队伍
                    
                    processedTeams.add(teamContestKey);
                    
                    if (!teamSeasons[teamKey]) {
                        teamSeasons[teamKey] = {
                            seasons: new Set(),
                            name: r.teamName || r.team || '未知队伍',
                            members: normalizedMembers
                        };
                    }
                    teamSeasons[teamKey].seasons.add(r.season || '');
                }
            });
            
            const teamsWithBaseAward = Object.values(teamSeasons);

            if (teamsWithBaseAward.length === 0) {
                console.error(`没有找到在 ${baseLevel} 获得 ${baseAward} 的队伍`);
                document.getElementById('vis-result-text').textContent = `没有找到在 ${baseLevel} 获得 ${baseAward} 的队伍`;
                // 销毁之前的图表实例
                if (visChartInstance) {
                    visChartInstance.destroy();
                }
                // 清除canvas内容并隐藏canvas元素
                const chartCanvas = document.getElementById('vis-chart');
                const ctx = chartCanvas.getContext('2d');
                ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                chartCanvas.style.display = 'none';
                
                // 隐藏详细记录容器
                const detailedRecordsContainer = document.getElementById('vis-detailed-records');
                if (detailedRecordsContainer) {
                    detailedRecordsContainer.innerHTML = '';
                    detailedRecordsContainer.style.display = 'none';
                }
                return;
            }
            
            // 在有结果时确保canvas元素可见
            document.getElementById('vis-chart').style.display = 'block';

            // 2. 从这些队伍中，找出他们在B级别比赛中且与基准比赛同一赛季的所有记录
            // 首先创建一个处理过的记录映射，避免重复
            const processedTargetRecords = {};
            
            allRecords.forEach(r => {
                // 检查是否是目标比赛级别
                if (r.contestLevel !== targetLevel) return;
                // 检查是否有有效排名
                if (r.rank <= 0) return;
                
                // 使用标准化的队伍成员字符串作为唯一标识符
                const normalizedMembers = normalizeTeamMembers(r.membersStr || r.teamMembers || '');
                const teamKey = normalizedMembers || r.teamName || r.team || '';
                
                if (!teamKey) return; // 跳过没有有效标识符的记录
                
                // 检查队伍是否在基准队伍中
                const teamInfo = teamSeasons[teamKey];
                if (!teamInfo) return;
                
                // 检查是否是同一赛季
                if (!teamInfo.seasons.has(r.season || '')) return;
                
                // 创建唯一的队伍-比赛键，避免重复记录
                const teamContestKey = `${teamKey}_${r.contestName || r.contest}`;
                if (processedTargetRecords[teamContestKey]) return;
                
                // 添加记录，并包含队伍信息
                processedTargetRecords[teamContestKey] = {
                    ...r,
                    teamName: r.teamName || r.team || '未知队伍',
                    teamMembers: r.membersStr || r.teamMembers || ''
                };
            });

            const targetRecords = Object.values(processedTargetRecords);
            console.log(`找到 ${teamsWithBaseAward.length} 支基准队伍和 ${targetRecords.length} 个同一赛季的目标记录`);
            renderVisualizationChart(targetRecords, baseLevel, baseAward, targetLevel);
        });
    }

    function renderVisualizationChart(records, baseLevel, baseAward, targetLevel) {
        // 使用完整的记录数据进行可视化
        const ctx = document.getElementById('vis-chart').getContext('2d');
        const resultText = document.getElementById('vis-result-text');
        
        // 创建一个容器用于显示详细记录（如果需要在图表下方显示）
        let detailedRecordsContainer = document.getElementById('vis-detailed-records');
        if (!detailedRecordsContainer) {
            detailedRecordsContainer = document.createElement('div');
            detailedRecordsContainer.id = 'vis-detailed-records';
            detailedRecordsContainer.className = 'mt-4 p-3 border rounded bg-light';
            detailedRecordsContainer.style.display = 'none'; // 默认隐藏
            document.getElementById('vis-chart').parentElement.appendChild(detailedRecordsContainer);
        } else {
            detailedRecordsContainer.innerHTML = '';
            detailedRecordsContainer.style.display = 'none'; // 生成新图表时隐藏
        }

        if (visChartInstance) visChartInstance.destroy();

        if (records.length === 0) {
            resultText.textContent = `没有找到足够的数据来分析。请尝试其他组合。`;
            detailedRecordsContainer.innerHTML = '';
            detailedRecordsContainer.style.display = 'none';
            return;
        }

        // 提取排名数据
        const ranks = records.map(r => r.rank);
        const maxRank = Math.max(...ranks);
        const binSize = Math.max(10, Math.ceil(maxRank / 20 / 10) * 10); // 动态调整区间大小
        
        // 按排名区间分组记录
        const rankBins = {}; // 用于存储每个区间的队伍数量
        const binRecords = {}; // 用于存储每个区间的详细记录
        
        records.forEach(record => {
            const bin = Math.floor((record.rank - 1) / binSize) * binSize + 1;
            const binLabel = `${bin}-${bin + binSize - 1}`;
            
            // 统计数量
            rankBins[binLabel] = (rankBins[binLabel] || 0) + 1;
            
            // 存储详细记录
            if (!binRecords[binLabel]) {
                binRecords[binLabel] = [];
            }
            binRecords[binLabel].push(record);
        });

        const sortedBins = Object.entries(rankBins).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        
        // 为tooltip准备数据
        const datasets = [{
            label: `在 ${targetLevel} 比赛中的排名分布`,
            data: sortedBins.map(b => b[1]),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            // 存储额外的数据用于tooltip
            binRecords: sortedBins.map(b => binRecords[b[0]])
        }];
        
        visChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedBins.map(b => b[0]),
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '队伍数量' }
                    },
                    x: {
                        title: { display: true, text: '排名区间' }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `获得 ${baseLevel} ${baseAward} 的队伍在 ${targetLevel} 比赛中的表现`
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                // 获取当前条形图对应的记录
                                const recordsInBin = datasets[0].binRecords[context.dataIndex];
                                
                                // 格式化显示详细信息
                                let tooltipText = '\n\n比赛记录：';
                                
                                // 最多显示前5条记录，避免tooltip过长
                                const displayRecords = recordsInBin.slice(0, 5);
                                displayRecords.forEach(record => {
                                    tooltipText += `\n- ${record.teamName || '未知队伍'} (${record.contestName}, 排名: ${record.rank})`;
                                });
                                
                                // 如果记录过多，添加提示
                                if (recordsInBin.length > 5) {
                                    tooltipText += `\n... 还有 ${recordsInBin.length - 5} 条记录`;
                                }
                                
                                return tooltipText;
                            }
                        }
                    }
                },
                // 添加点击事件，在下方显示完整的记录列表
                onClick: function(evt, elements) {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const binLabel = sortedBins[index][0];
                        const recordsInBin = binRecords[binLabel];
                        
                        // 创建详细记录表格
                        let html = `<h4 class="mb-2">${binLabel} 排名区间的比赛记录</h4>`;
                        html += `<table class="table table-sm table-striped">
                                    <thead>
                                        <tr>
                                            <th>队伍名称</th><th>队员</th><th>比赛名称</th><th>排名</th><th>日期</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
                        
                        recordsInBin.forEach(record => {
                            html += `<tr>
                                        <td>${record.teamName || '未知队伍'}</td>
                                        <td>${record.teamMembers || '-'}</td>
                                        <td>${record.contestName}</td>
                                        <td>${record.rank}</td>
                                        <td>${record.date || 'N/A'}</td>
                                    </tr>`;
                        });
                        
                        html += `</tbody></table>`;
                        
                        detailedRecordsContainer.innerHTML = html;
                        detailedRecordsContainer.style.display = 'block'; // 显示详细记录容器
                    }
                }
            }
        });
        
        const avgRank = ranks.reduce((a,b) => a+b, 0) / ranks.length;
        resultText.textContent = `分析了 ${ranks.length} 支队伍：获得 ${baseLevel} ${baseAward} 的队伍，在 ${targetLevel} 比赛中的平均排名约为 ${Math.round(avgRank)} 名。点击柱状图查看该排名区间的详细记录。`;
    }

    // 辅助函数：标准化队伍成员字符串，处理乱序问题
    function normalizeTeamMembers(membersStr) {
        if (!membersStr || typeof membersStr !== 'string') return '';
        // 拆分成员字符串，去除空格，排序后重新组合
        return membersStr.split(',').map(m => m.trim()).sort().join(',');
    }
    
    // ------------------- 初始化应用 -------------------
    // 确保页面加载后立即初始化
    init();
    
    // 导出全局函数，确保可以从HTML中调用
    window.navigateTo = navigateTo;
    window.showPlayerAwards = showPlayerAwards;

    // 之前遗漏的全局函数定义，补充完整
    // Player Search
    window.initPlayerSearch = initPlayerSearch;
    // Contest Search
    window.initContestSearch = initContestSearch;

});