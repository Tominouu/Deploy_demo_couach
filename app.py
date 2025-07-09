from flask import Flask, render_template, request, redirect, session, make_response, flash, url_for, jsonify, Response, stream_with_context
import json
import sqlite3
import requests
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from zoneinfo import ZoneInfo
import datetime
import random


app = Flask(__name__)
app.secret_key = 'super-secret-key'
app.permanent_session_lifetime = timedelta(hours=1)

def init_db():
    conn = sqlite3.connect('users.db')  # Une seule base de données
    c = conn.cursor()

    #c.execute('DROP TABLE conversations')
    
    # Table users
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, 
        username TEXT UNIQUE, 
        password TEXT
    )''')
    
    # Table conversations
    c.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table history
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            prompt TEXT,
            response TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    ''')
    
    conn.commit()
    conn.close()


def save_history(conversation_id, prompt, response):
    conn = sqlite3.connect('users.db')  # Utiliser la même base que les conversations
    c = conn.cursor()
    c.execute('''
        INSERT INTO history (conversation_id, prompt, response, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (conversation_id, prompt, response, datetime.datetime.now()))
    conn.commit()
    conn.close()


@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    prompt = data.get('prompt')
    model = data.get('model', 'phi3:mini')
    message = data.get('userMessage', '')
    conversation_id = data.get('conversation_id')
    user = session.get('user', 'anonyme')

    def generate():
        full_response = ""
        try:
            with requests.post("http://localhost:11434/api/generate", json={
                "model": model,
                "prompt": prompt,
                "stream": True,
                "max_tokens": 512
            }, stream=True) as r:
                for line in r.iter_lines():
                    if line:
                        decoded_line = line.decode("utf-8")
                        yield line + b'\n'
                        try:
                            json_data = json.loads(decoded_line)
                            if "response" in json_data:
                                full_response += json_data["response"]
                        except json.JSONDecodeError:
                            print("Erreur parsing JSON stream:", decoded_line)
        except Exception as e:
            print(f"Erreur lors de l'appel à Ollama: {e}")
        finally:
            if prompt and full_response and conversation_id:
                try:
                    # Utiliser la même base de données
                    conn = sqlite3.connect('users.db')
                    c = conn.cursor()
                    c.execute('''
                        INSERT INTO history (conversation_id, prompt, response, timestamp)
                        VALUES (?, ?, ?, ?)
                    ''', (conversation_id, message, full_response, datetime.datetime.now()))
                    conn.commit()
                    conn.close()
                except Exception as e:
                    print(f"Erreur lors de la sauvegarde: {e}")

    return Response(stream_with_context(generate()), content_type='text/plain')


@app.route('/history', methods=['GET'])
def history():
    user = session.get('user')
    if not user:
        return jsonify([])
    conn = sqlite3.connect('history.db')
    c = conn.cursor()
    c.execute('SELECT model, prompt, response, timestamp FROM history WHERE user = ? ORDER BY timestamp DESC', (user,))
    rows = c.fetchall()
    conn.close()
    history_data = [
        {
            'prompt': row[0],
            'response': row[1],
            'timestamp': row[2],
        } for row in rows
    ]
    return jsonify(history_data)

@app.route('/conversation', methods=['POST'])
def create_or_select_conversation():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Utilisateur non connecté'}), 403

    try:
        data = request.get_json()
        title = data.get('title', 'Nouvelle conversation')

        conn = sqlite3.connect('users.db')  # Même base que les utilisateurs
        c = conn.cursor()
        c.execute('INSERT INTO conversations (user, title) VALUES (?, ?)', (user, title))
        conversation_id = c.lastrowid
        conn.commit()
        conn.close()

        return jsonify({'conversation_id': conversation_id})
    
    except Exception as e:
        print(f"Erreur lors de la création de la conversation: {e}")
        return jsonify({'error': 'Erreur serveur'}), 500

@app.route('/conversations', methods=['GET'])
def list_conversations():
    user = session.get('user')
    if not user:
        return jsonify([])

    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute('SELECT id, title, created_at FROM conversations WHERE user = ? ORDER BY created_at DESC', (user,))
        rows = c.fetchall()
        conn.close()

        return jsonify([
            {'id': row[0], 'title': row[1], 'created_at': row[2]}
            for row in rows
        ])
    
    except Exception as e:
        print(f"Erreur lors du chargement des conversations: {e}")
        return jsonify([])

@app.route('/conversation/<int:conversation_id>/history')
def get_conversation_history(conversation_id):
    user = session.get('user')
    if not user:
        return jsonify([])

    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Vérifier que la conversation appartient à l'utilisateur
        c.execute('SELECT user FROM conversations WHERE id = ?', (conversation_id,))
        conv_user = c.fetchone()
        
        if not conv_user or conv_user[0] != user:
            return jsonify({'error': 'Conversation non trouvée'}), 404
        
        # Récupérer l'historique
        c.execute('''
            SELECT prompt, response, timestamp 
            FROM history 
            WHERE conversation_id = ?
            ORDER BY timestamp ASC
        ''', (conversation_id,))
        rows = c.fetchall()
        conn.close()

        return jsonify([
            {'prompt': row[0], 'response': row[1], 'timestamp': row[2]}
            for row in rows
        ])
    
    except Exception as e:
        print(f"Erreur lors du chargement de l'historique: {e}")
        return jsonify([])

@app.route('/')
def chat():
    if 'user' not in session:
        return redirect('/login')
    return render_template('chat.html', user=session['user'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user' in session:
        return redirect('/')
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = 'remember' in request.form

        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute("SELECT password FROM users WHERE username = ?", (username,))
        result = c.fetchone()
        conn.close()
        
        if result and check_password_hash(result[0], password):
            session.permanent = remember  
            if remember:
                app.permanent_session_lifetime = timedelta(days=30) #ça c'est ok ça marche mais l'autre en dessous ne marche pas
            else:
                app.permanent_session_lifetime = timedelta(days=1) 
            session['user'] = username
            return redirect('/')
        else:
            return "Échec de la connexion"
    return render_template('login.html') #les fichiers html sont dans le dossier templates, on peut pas les mettre ailleurs.

@app.route('/register', methods=['POST'])
def register():
    username = request.form['username']
    password = generate_password_hash(request.form['password'])
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        conn.close()
    except sqlite3.IntegrityError:
        flash("Nom d'utilisateur déjà pris", "error") 
    return redirect('/login')

@app.route('/test', methods=['GET', 'POST'])
def test():
        return render_template('test-brain.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ =='__main__':
    print(datetime.datetime.now(ZoneInfo("Europe/Paris")))
    init_db()
    app.run(host='0.0.0.0', port=8080)
