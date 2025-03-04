# app.py
from flask import Flask, render_template, request, jsonify, session
import requests
import os
import uuid
from datetime import datetime
import json
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'neil-secret-key-change-in-production')

# DeepSeek API配置
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 确保存储目录存在
os.makedirs('data/conversations', exist_ok=True)

@app.route('/')
def index():
    """渲染主页"""
    # 检查会话中是否有user_id，如果没有则创建一个
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """处理聊天请求"""
    data = request.json
    user_message = data.get('message', '')
    conversation_id = data.get('conversation_id')
    
    # 如果没有conversation_id，创建一个新的
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
    
    # 获取历史消息记录
    conversation = get_conversation(conversation_id)
    
    # 将用户消息添加到历史记录
    conversation['messages'].append({
        'role': 'user',
        'content': user_message,
        'timestamp': datetime.now().isoformat()
    })
    
    # 只保留最近的消息以避免超过DeepSeek API的限制
    recent_messages = conversation['messages'][-10:]
    
    # 准备DeepSeek API请求
    deepseek_messages = [
        {'role': message['role'], 'content': message['content']} 
        for message in recent_messages
    ]
    
    headers = {
        'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'model': 'deepseek-chat',
        'messages': deepseek_messages,
        'temperature': 0.7,
        'max_tokens': 1000
    }
    
    try:
        # 发送请求到DeepSeek API
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        # 解析响应
        result = response.json()
        assistant_message = result['choices'][0]['message']['content']
        
        # 将AI回复添加到历史记录
        conversation['messages'].append({
            'role': 'assistant',
            'content': assistant_message,
            'timestamp': datetime.now().isoformat()
        })
        
        # 如果是新的对话，设置标题
        if len(conversation['messages']) == 2:  # 首次交互（用户+AI）
            # 设置对话标题为用户第一条消息（截断过长的消息）
            if len(user_message) > 30:
                conversation['title'] = user_message[:27] + '...'
            else:
                conversation['title'] = user_message
        
        # 保存对话
        save_conversation(conversation_id, conversation)
        
        return jsonify({
            'id': conversation_id,
            'message': assistant_message,
            'title': conversation['title']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """获取用户的所有对话"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify([])
    
    conversations = []
    conversation_dir = f'data/conversations/{user_id}'
    
    if os.path.exists(conversation_dir):
        for filename in os.listdir(conversation_dir):
            if filename.endswith('.json'):
                conversation_id = filename[:-5]  # 移除.json后缀
                with open(f'{conversation_dir}/{filename}', 'r') as f:
                    conversation = json.load(f)
                    conversations.append({
                        'id': conversation_id,
                        'title': conversation.get('title', 'New Conversation'),
                        'timestamp': conversation.get('timestamp', '')
                    })
    
    # 按时间戳排序，最新的在前
    conversations.sort(key=lambda x: x['timestamp'], reverse=True)
    return jsonify(conversations)

@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation_api(conversation_id):
    """获取特定对话的所有消息"""
    conversation = get_conversation(conversation_id)
    return jsonify(conversation)

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """删除特定对话"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    file_path = f'data/conversations/{user_id}/{conversation_id}.json'
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({'success': True})
    
    return jsonify({'error': 'Conversation not found'}), 404

def get_conversation(conversation_id):
    """从文件中获取对话，如果不存在则创建一个新的"""
    user_id = session.get('user_id')
    if not user_id:
        return {'messages': [], 'title': 'New Conversation', 'timestamp': datetime.now().isoformat()}
    
    os.makedirs(f'data/conversations/{user_id}', exist_ok=True)
    file_path = f'data/conversations/{user_id}/{conversation_id}.json'
    
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            return json.load(f)
    else:
        return {
            'messages': [],
            'title': 'New Conversation',
            'timestamp': datetime.now().isoformat()
        }

def save_conversation(conversation_id, conversation):
    """保存对话到文件"""
    user_id = session.get('user_id')
    if not user_id:
        return
    
    os.makedirs(f'data/conversations/{user_id}', exist_ok=True)
    conversation['timestamp'] = datetime.now().isoformat()
    
    with open(f'data/conversations/{user_id}/{conversation_id}.json', 'w') as f:
        json.dump(conversation, f, indent=2)

# 在 app.py 中使用环境变量
port = int(os.environ.get('PORT', 5000))
debug_mode = os.environ.get('FLASK_ENV') == 'development'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=debug_mode)