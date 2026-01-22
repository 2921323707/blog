// 主入口文件 - 初始化所有模块

// 调试：确认 JavaScript 文件已加载
console.log('📦 admin.js 模块已加载');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded 事件触发，开始初始化...');
    try {
        initTheme();
        initViewToggle();
        initForm();
        initTags();
        initCategories();
        initImageUpload();
        initCoverUpload();
        initPreview();
        initHelp();
        initImportMd();
        initPostsList();
        // 默认显示列表视图
        showListView();
        console.log('✅ 所有初始化函数执行完成');
    } catch (error) {
        console.error('❌ 初始化过程中发生错误:', error);
    }
});
