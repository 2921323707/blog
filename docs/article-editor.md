# 博客文章编辑器使用说明

## 功能特点

✅ **浏览器直接提交** - 无需登录服务器，在浏览器中即可完成文章提交  
✅ **自动图片处理** - 支持拖拽上传图片，自动插入到文章中  
✅ **Markdown 编辑** - 支持完整的 Markdown 语法  
✅ **自动生成** - 提交后自动生成 Hexo 静态文件  
✅ **标签分类** - 方便管理文章标签和分类  

## 使用方法

### 1. 启动后端服务

```bash
cd backend
python run.py
```

后端服务将在 `http://localhost:5000` 启动

### 2. 访问编辑器

**重要：请通过后端服务（端口 5000）访问编辑器**

在浏览器中打开：
```
http://localhost:5000/admin.html
```

⚠️ **不要通过 Hexo 服务器（端口 4000）访问**，因为会加载主题脚本导致冲突。

如果看到 JavaScript 错误，请确保：
1. 通过 `http://localhost:5000/admin.html` 访问（不是 4000 端口）
2. 后端服务正在运行
3. 浏览器控制台中的错误已被自动捕获和忽略

### 3. 编写文章

1. **填写文章标题** - 必填项
2. **选择发布日期** - 默认为今天，可修改
3. **添加标签** - 输入标签后按回车添加，可添加多个
4. **添加分类** - 输入分类后按回车添加
5. **上传图片** - 点击上传区域或拖拽图片文件
   - 图片会自动保存到 `source/img/` 目录
   - 图片会自动插入到文章末尾，可在编辑器中移动位置
6. **编写内容** - 使用 Markdown 格式编写文章内容

### 4. 提交文章

点击"提交文章"按钮，系统会：
- 自动生成 Hexo front-matter
- 保存文章到 `source/_posts/` 目录
- 自动执行 `hexo generate` 生成静态文件

## API 接口

### 上传图片
```
POST /api/posts/upload-image
Content-Type: multipart/form-data

file: 图片文件
```

返回：
```json
{
  "errno": 0,
  "data": {
    "url": "/img/filename_20260119_123456.jpg",
    "filename": "filename_20260119_123456.jpg"
  }
}
```

### 提交文章
```
POST /api/posts/submit
Content-Type: application/json

{
  "title": "文章标题",
  "content": "Markdown 内容",
  "tags": ["标签1", "标签2"],
  "categories": ["分类1"],
  "date": "2026-01-19"
}
```

返回：
```json
{
  "errno": 0,
  "data": {
    "filename": "文章标题.md",
    "message": "文章提交成功并已生成静态文件"
  }
}
```

## 文件结构

```
blog/
├── source/
│   ├── _posts/          # 文章保存目录
│   └── img/             # 图片保存目录
├── backend/
│   └── app.py           # 后端 API
└── public/
    └── admin.html       # 编辑器页面
```

## 注意事项

1. **图片路径** - 上传的图片会保存在 `source/img/` 目录，在 Markdown 中使用 `/img/文件名` 引用
2. **文件名** - 文章文件名会自动使用标题，特殊字符会被处理
3. **自动生成** - 提交后会自动执行 `hexo generate`，如果失败会显示警告但文章已保存
4. **Git 提交** - 目前不会自动提交到 Git，需要手动执行：
   ```bash
   git add source/_posts/文章标题.md
   git add source/img/
   git commit -m "添加新文章"
   git push
   ```

## 后续优化建议

- [ ] 添加 Git 自动提交功能
- [ ] 添加文章列表和编辑功能
- [ ] 支持 Markdown 实时预览
- [ ] 添加图片管理功能
- [ ] 支持草稿保存
- [ ] 添加用户认证
