from flask import Flask, render_template, request, redirect, session, make_response, flash, url_for, jsonify, Response, stream_with_context
import json
import sqlite3
import requests
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from zoneinfo import ZoneInfo
import datetime
import os
import random


app = Flask(__name__)
app.secret_key = 'super-secret-key'
app.permanent_session_lifetime = timedelta(hours=1)

@app.before_request
def force_https():
    if request.scheme != 'https':
        return redirect(request.url.replace("http://", "https://"), code=301) 

def init_db():
    conn = sqlite3.connect('users.db')  # Une seule base de données
    c = conn.cursor()

    #c.execute('DROP TABLE conversations')
    #c.execute('DROP TABLE history')
    
    # Table users
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, 
        username TEXT UNIQUE, 
        password TEXT,
        role TEXT DEFAULT 'user'
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
    ''', (conversation_id, prompt, response, datetime.datetime.now(ZoneInfo("Europe/Paris")))) 
    conn.commit()
    conn.close()

def build_prompt_with_context(conversation_id, user_message, max_history=5):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()

    c.execute('''
        SELECT prompt, response FROM history
        WHERE conversation_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (conversation_id, max_history))

    rows = c.fetchall()
    conn.close()

    # On inverse pour avoir l'ordre chronologique
    rows.reverse()

    # Construit le contexte texte
    context = ""
    for prompt, response in rows:
        context += f"Utilisateur : {prompt}\nAssistant : {response}\n"
    
    # Ajoute le nouveau message utilisateur
    context += f"Utilisateur : {user_message}\nAssistant :"
    return context




@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    message = data.get('userMessage', '')
    #prompt = data.get('prompt')
    conversation_id = data.get('conversation_id')
    prompt = build_prompt_with_context(conversation_id, message)
    model = data.get('model', 'phi3:mini')
    # Précharger le modèle si besoin (lance ollama run en tâche de fond, ne bloque pas la requête)
    try:
        os.system(f"ollama run {model} --help > /dev/null 2>&1 &")
        # Désactiver 'thinking' pour deepseek si sélectionné
        if model == 'deepseek-r1:1.5b':
            os.system("ollama run deepseek-r1:1.5b -- /set nothink > /dev/null 2>&1 &")
    except Exception as e:
        print(f"Erreur lors du préchargement du modèle {model}: {e}")
    message = data.get('userMessage', '')
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
                    ''', (conversation_id, message, full_response, datetime.datetime.now(ZoneInfo("Europe/Paris"))))  #ici pour la date on doit spécifier le fuseau horaire
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
        now_paris = datetime.datetime.now(ZoneInfo("Europe/Paris"))
        c.execute('INSERT INTO conversations (user, title, created_at) VALUES (?, ?, ?)', (user, title, now_paris))
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
    
@app.route('/delete_conversation/<int:conversation_id>', methods=['POST'])
def delete_conversation(conversation_id):
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Utilisateur non connecté'}), 403

    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Vérifier que la conversation appartient à l'utilisateur
        c.execute('SELECT user FROM conversations WHERE id = ?', (conversation_id,))
        conv_user = c.fetchone()
        
        if not conv_user or conv_user[0] != user:
            return jsonify({'error': 'Conversation non trouvée'}), 404
        
        # Supprimer la conversation et son historique
        c.execute('DELETE FROM history WHERE conversation_id = ?', (conversation_id,))
        c.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
        conn.commit()
        conn.close()

        return jsonify({'success': True})
    
    except Exception as e:
        print(f"Erreur lors de la suppression de la conversation: {e}")
        return jsonify({'error': 'Erreur serveur'}), 500
    
@app.route('/update_conversation/<int:conversation_id>', methods=['POST'])
def update_conversation(conversation_id):
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Utilisateur non connecté'}), 403

    try:
        data = request.get_json()
        new_title = data.get('title')

        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Vérifier que la conversation appartient à l'utilisateur
        c.execute('SELECT user FROM conversations WHERE id = ?', (conversation_id,))
        conv_user = c.fetchone()
        
        if not conv_user or conv_user[0] != user:
            return jsonify({'error': 'Conversation non trouvée'}), 404
        
        # Mettre à jour le titre de la conversation
        c.execute('UPDATE conversations SET title = ? WHERE id = ?', (new_title, conversation_id))
        conn.commit()
        conn.close()

        return jsonify({'success': True})
    
    except Exception as e:
        print(f"Erreur lors de la mise à jour de la conversation: {e}")
        return jsonify({'error': 'Erreur serveur'}), 500
    
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/login')

@app.route('/admin')
def admin():
    if 'user' not in session:
        return redirect('/login')
    
    username = session['user']
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("SELECT role FROM users WHERE username = ?", (username,))
    user_role = c.fetchone()
    
    if not user_role or user_role[0] not in ('admin', 'root'):
        conn.close()
        return render_template('403.html'), 403  # Accès interdit

    c.execute("SELECT username, COALESCE(role, '') FROM users")
    users = c.fetchall()
    conn.close()
    
    return render_template('admin.html', users=[{'username': user[0], 'role': user[1]} for user in users])

@app.route('/admin_action', methods=['POST'])
def admin_action():
    username = session['user']
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("SELECT role FROM users WHERE username = ?", (username,))
    user_role = c.fetchone()
    if not user_role or user_role[0] not in ('admin', 'root'):
        conn.close()
        return render_template('403.html'), 403  # Accès interdit
    data = request.get_json()
    action = data.get('action')
    try:
        # Only root can change user roles
        if action in ('grant_admin', 'revoke_admin'):
            if user_role[0] != 'root':
                return jsonify({'message': "Seul l'utilisateur root peut changer le statut des comptes."}), 403
            target_username = data.get('username')
            if not target_username or target_username in ('admin', 'root'):
                return jsonify({'message': "Action interdite."}), 400
            conn = sqlite3.connect('users.db')
            c = conn.cursor()
            if action == 'grant_admin':
                c.execute("UPDATE users SET role = 'admin' WHERE username = ?", (target_username,))
                conn.commit()
                conn.close()
                return jsonify({'message': f"{target_username} est maintenant admin."})
            elif action == 'revoke_admin':
                c.execute("UPDATE users SET role = '' WHERE username = ?", (target_username,))
                conn.commit()
                conn.close()
                return jsonify({'message': f"{target_username} n'est plus admin."})
        elif action == 'clean_users':
            conn = sqlite3.connect('users.db')
            c = conn.cursor()
            c.execute("DELETE FROM users WHERE username NOT IN ('admin', 'root')")
            conn.commit()
            conn.close()
            return jsonify({'message': "Table utilisateurs nettoyée (admin/root conservés)."})
        elif action == 'clean_conversations':
            conn = sqlite3.connect('users.db')
            c = conn.cursor()
            c.execute('DELETE FROM conversations')
            conn.commit()
            conn.close()
            return jsonify({'message': "Table conversations nettoyée."})
        elif action == 'clean_history':
            conn = sqlite3.connect('users.db')
            c = conn.cursor()
            c.execute('DELETE FROM history')
            conn.commit()
            conn.close()
            return jsonify({'message': "Table historique nettoyée."})
        elif action == 'restart_model':
            os.system('sudo systemctl restart ollama')
            return jsonify({'message': "Service Ollama redémarré. Les modèles seront rechargés à la prochaine requête."})
        elif action == 'run_model':
            result = os.system('ollama run phi3:mini')
            if result == 0:
                return jsonify({'message': "Modèle phi3 lancé via Ollama."})
            else:
                return jsonify({'message': "Erreur lors du lancement du modèle."}, 500)
        elif action == 'restart_flask':
            return jsonify({'message': "Redémarrage du serveur Flask demandé (à implémenter)."})
        elif action == 'list_users':
            conn = sqlite3.connect('users.db')
            c = conn.cursor()
            c.execute("SELECT username, COALESCE(role, '') FROM users")
            users = [{'username': row[0], 'role': row[1]} for row in c.fetchall()]
            conn.close()
            return jsonify({'users': users})
        else:
            return jsonify({'message': "Action inconnue."}), 400
    except Exception as e:
        return jsonify({'message': f"Erreur: {e}"}), 500
    
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
            return render_template('login.html', error="Echec de la connexion, nom d'utilisateur ou mot de passe incorrect.")
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
        # Afficher la popup de succès sur la page de login
        return render_template('login.html', success="Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.")
    except sqlite3.IntegrityError:
        # Afficher la popup personnalisée sur la page de login
        return render_template('login.html', error="Nom d'utilisateur déjà pris")
    #return redirect('/login')

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if 'user' not in session:
        return redirect('/login')
    if request.method == 'POST':
        new_username = request.form['username']
        new_password = request.form['password']
        if new_password:
            new_password = generate_password_hash(new_password)
        else:
            new_password = None
        
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        if new_password:
            c.execute("UPDATE users SET username = ?, password = ? WHERE username = ?", (new_username, new_password, session['user']))
        else:
            c.execute("UPDATE users SET username = ? WHERE username = ?", (new_username, session['user']))
        
        conn.commit()
        conn.close()
        
        session['user'] = new_username
        flash('Profil mis à jour avec succès.', 'success')
        return redirect('/profile')
    return render_template('profile.html', user=session['user'] )

@app.route('/test', methods=['GET', 'POST'])
def test():
        return render_template('test-brain.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ =='__main__':
    print(datetime.datetime.now(ZoneInfo("Europe/Paris")))
    init_db()
    app.run(host='0.0.0.0', port=8080, ssl_context=('cert.pem', 'key.pem'))  # Utiliser SSL pour la sécurité
