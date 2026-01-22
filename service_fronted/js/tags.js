// 标签和分类管理

// 标签管理
function initTags() {
    const tagInput = document.getElementById('tagInput');
    const tagsContainer = document.getElementById('tagsContainer');

    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = tagInput.value.trim();
            if (value && !tags.includes(value)) {
                tags.push(value);
                updateTagsDisplay();
                tagInput.value = '';
            }
        }
    });
}

function updateTagsDisplay() {
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <span class="remove" data-tag="${tag}" title="删除标签">×</span>
        </span>
    `).join('');

    tagsContainer.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.getAttribute('data-tag');
            tags = tags.filter(t => t !== tag);
            updateTagsDisplay();
        });
    });
}

// 分类管理
function initCategories() {
    const categoryInput = document.getElementById('categoryInput');
    const categoriesContainer = document.getElementById('categoriesContainer');

    categoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = categoryInput.value.trim();
            if (value && !categories.includes(value)) {
                categories.push(value);
                updateCategoriesDisplay();
                categoryInput.value = '';
            }
        }
    });
}

function updateCategoriesDisplay() {
    const categoriesContainer = document.getElementById('categoriesContainer');
    categoriesContainer.innerHTML = categories.map(cat => `
        <span class="category">
            ${cat}
            <span class="remove" data-category="${cat}" title="删除分类">×</span>
        </span>
    `).join('');

    categoriesContainer.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.target.getAttribute('data-category');
            categories = categories.filter(c => c !== cat);
            updateCategoriesDisplay();
        });
    });
}
