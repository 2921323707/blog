from flask import Blueprint

def register_routes(app):
    """注册所有路由到应用"""
    from . import comments, posts, images, frontend, stats, rag_bot, setu

    # 注册蓝图
    app.register_blueprint(comments.bp, url_prefix='/api')
    app.register_blueprint(posts.bp, url_prefix='/api')
    app.register_blueprint(stats.bp, url_prefix='/api')
    app.register_blueprint(rag_bot.bp, url_prefix='/api')
    app.register_blueprint(setu.bp, url_prefix='/api')
    app.register_blueprint(images.bp)
    app.register_blueprint(frontend.bp)

    # 注册云存储蓝图
    from cloud_adm import cloud_storage_bp
    app.register_blueprint(cloud_storage_bp)
