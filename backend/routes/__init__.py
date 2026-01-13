from flask import Blueprint

def register_routes(app):
    """注册所有路由到应用"""
    from . import comments, posts, images, frontend
    
    # 注册蓝图
    app.register_blueprint(comments.bp, url_prefix='/api')
    app.register_blueprint(posts.bp, url_prefix='/api')
    app.register_blueprint(images.bp)
    app.register_blueprint(frontend.bp)
