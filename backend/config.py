import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///comments.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = ['*']  # 允许所有来源，生产环境应限制
