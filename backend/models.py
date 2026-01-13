from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.String(36), primary_key=True)
    url = db.Column(db.String(500), nullable=False, index=True)
    nick = db.Column(db.String(100), nullable=False)
    mail = db.Column(db.String(200))
    link = db.Column(db.String(500))
    comment = db.Column(db.Text, nullable=False)
    ua = db.Column(db.String(500))
    ip = db.Column(db.String(50))
    pid = db.Column(db.String(36))  # 父评论ID
    created = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'nick': self.nick,
            'mail': self.mail,
            'link': self.link,
            'comment': self.comment,
            'ua': self.ua,
            'ip': self.ip,
            'pid': self.pid,
            'created': self.created.isoformat() if self.created else None,
            'updated': self.updated.isoformat() if self.updated else None
        }
