from flask import Flask, render_template, request, redirect, session, make_response
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import datetime
import random


app = Flask(__name__)
app.secret_key = 'super-secret-key'
app.permanent_session_lifetime = timedelta(hours=1)

def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)''')
    conn.commit()
    conn.close()

@app.route('/')
def chat():
    if 'user' not in session:
        return redirect('/login')
    return render_template("chat.html")

@app.route('/login', methods=['GET', 'POST'])
def login():
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
    return render_template('login.html') #les fichiers html sont dans le dossier templates, on peut pas les mettre ailleurs

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
        return "Nom d'utilisateur déjà pris"
    return redirect('/login')

@app.route('/test', methods=['GET', 'POST'])
def test():
        return render_template('fix.html')

if __name__ =='__main__':
    init_db()
    app.run(host='0.0.0.0', port=8080)
