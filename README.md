# CouachGPT 🤖

## 📅 Contexte & Objectifs

Ce projet a pour but de **tester, comparer et intégrer différents modèles LLM** (Large Language Models) exécutés **en local** sur serveur sans GPU. Le tout sera lié sur une interface web style "ChatGPT", accessible par tous les utilisateurs connectés sur le réseau via cet **IP:** http://172.16.2.81:8294/. L'objectif est de trouver un compromis optimal entre **performances**, **consommation**, et **réactivité**.

---

### ⚠️ SI L'IA NE RÉPOND PLUS VOICI LA DÉMARCHE À SUIVRE

- Se connecter en **ssh** à la machine virtuelle:
 `ssh couachgpt@172.16.2.81` 
- Une fois dedans, tapez la commande suivante pour vérifier que le **modèle** n'a pas été **supprimé**:
 `ollama ls`
- Il devrait retourner, le nom des modèles présents.
- Si ce n'est pas le cas:
 `ollama run <nomdumodele>`
- Il va l'installer et ensuite le lancer automatiquement.
- Si le modèle est bien installé, pour le redémarrer faites la même commande que celle citée ci-dessus.
- Vous souhaitez arrêter le modèle, appuyez sur `Ctrl + D` ou tapez `/bye` dans la console.

### ⚠️ SI LA PAGE WEB NE REPOND PLUS

- Se connecter également en **ssh** comme il est indiqué plus haut
- Se rendre dans le **dossier** couachgpt: 
 `cd couachgpt`
- Ensuite tapez:
 `python app.py`
- C'est censé avoir lancé le serveur, si jamais il vous dit que le port est déjà pris, alors le serveur est déjà lancé.
- Si jamais vous êtes sur que le serveur est lancé et que la page n'est pas accessible, vérifiez les règles **NAT** du serveur, que les ports autorisés sur la **VM**:
 `sudo ufw allow 8080`


## 🔬 Phase de Recherche & Benchmarks (1–4 Juillet)

### 🖥️ Configuration Matérielle Testée

- **RAM** : 16 à 24 Go  
- **CPU** : 2 sockets, 5–20 cores  
- **Pas de GPU**

---

### 📊 Benchmark Snake Game – Prompt : `Tu peux me générer le jeu snake en python`

#### ✅ TEST 1 – 16 Go RAM / 2 Sockets / 5 Cores

| Modèle                   | Taille   | Temps     | État     | CPU    | RAM    |
|--------------------------|----------|-----------|----------|--------|--------|
| `gemma3n:e4b`            | 1.5 Go   | 9 min     | ❌       | 100 %  | 99 %   |
| `gemma3:4b`              | 3.3 Go   | 9 min     | ❌       | 100 %  | 57 %   |
| `deepseek-r1:1.5b`       | 1.1 Go   | 6 min     | ✅       | 100 %  | 27 %   |
| `mistral`                | 4.0 Go   | 3 min 41  | ✅       | 100 %  | 67 %   |
| `deepseek-coder:6.7b`    | 3.8 Go   | 8 min     | ❌       | 100 %  | 83 %   |

---

#### ✅ TEST 2 – 16 Go RAM / 1 Socket / 12 Cores

| Modèle                   | Taille   | Temps     | État     | CPU    | RAM    |
|--------------------------|----------|-----------|----------|--------|--------|
| `gemma3:4b`              | 3.3 Go   | 8 min 35  | ❌       | 99 %   | 52 %   |
| `deepseek-r1:1.5b`       | 1.1 Go   | 3 min 30  | ✅       | 99 %   | 21 %   |
| `mistral`                | 4.0 Go   | 4 min     | ✅       | 100 %  | 62 %   |
| `deepseek-coder:6.7b`    | 3.8 Go   | 6 min 18  | ❌       | 100 %  | 74 %   |

---

#### ✅ TEST 3 – 24 Go RAM / 1 Socket / 20 Cores

| Modèle                   | Taille   | Temps     | État     | CPU    | RAM    |
|--------------------------|----------|-----------|----------|--------|--------|
| `deepseek-r1:1.5b`       | 1.1 Go   | 2 min 55  | ✅       | 99 %   | 15 %   |
| `// (no thinking)`       |   //     | 1 min 30  | ✅       | 99 %   | 15 %   |
| `mistral`                | 4.0 Go   | 3 min 30  | ✅       | 99 %   | 41 %   |

---

## 📌 Analyse

- **Tous les modèles utilisent le CPU à 100 %**, ce qui est attendu en local sans GPU.
- La **RAM est utilisée de manière modérée**, car les modèles sont **quantisés**.
- La **taille du modèle n’est pas directement liée à sa rapidité**, surtout selon l’optimisation.

---

## ✅ Choix final du modèle

Après tests :

- **`deepseek-r1:1.5b`** : modèle léger, bon rapport vitesse/qualité, supporte le “thinking”.
- **`mistral`** : performances stables, compatible français, sélectionné pour l’intégration.
- **`phi3:mini`** : testé plus tard, **très fluide**, parfait pour une interface web légère.

---

## 🧠 Observations & Limitations

- En l’absence de **GPU**, la limite optimale reste autour de **1.5B à 4B**.
- Plus le modèle est petit, plus il est **réactif** sur interface web.
- `deepseek-r1` avec "thinking" donne des réponses plus détaillées mais plus lentes.
- Le modèle **phi3:mini** semble le plus adapté à une interface légère et réactive.

---

## 📎 À venir / Pistes d’amélioration

- Éventuellement tester avec une carte GPU externe si disponible.

---

## 📷 Benchmarks Graphiques détaillés

- https://docs.google.com/document/d/12IlOcdCEi3z7ZUNSZmBwO44wdHWU5tXDkaY_lGQOwrA/edit?tab=t.rhboqz7qvf7w

---

## 🛠️ Stack technique

- **Modèles LLM quantisés** (GGUF) : via Ollama
- **Interface Web** : HTML/CSS Tailwind + Flask
- **Backend local** : Python + serveur local (llama-server / Ollama)

---

## 🧪 Update 5-6 Juillet – Tests des Modèles

- Tests des différents **modèles** retenus directement sur l'interface web **minimale**.

---

## 🧪 Update 7 Juillet – Serveur & Interface Web

- Intégration d’un **serveur local avec Flask (Python)** pour combiner front et IA.
- Problème : la génération de réponse est **plus lente via interface** que via terminal.
- Test du modèle **phi3:mini (Microsoft)** : bien plus fluide sur interface web.
- Authentification (login, register)
- Design respectant la **charte graphique** de l’entreprise
- Page **404 personnalisée**
- Début de l'interface racine (/) (Interface de test sans style)

---


## 🧪 Update 8 Juillet – Serveur & Interface Web Améliorations

- Amélioration des performances d'Ollama afin de tourner correctement avec le serveur.
- L'interface **racine** a bien commencé, la base **Front** est presque complète, la partie **Back** est en cours.
- Création d'une base de donnée Locale Python via **Sqlite** 
- Réflexion sur l'historique des conversations.

---

## 🧪 Update 9 Juillet – Interface + DB + Historique des conversations

- Recalibrage de la **position** des éléments sur l'interface d'interaction avec **l'IA** pour une **meilleure expérience utilisateur.**
- La **date de création** de la conversation est affichée sur la **page**, une configuration du **fuseau horaire** a été nécessaire afin d'avoir un résultat **cohérent**.
- L'historique a été créé, les **conversations** ainsi que leurs contenus sont enregistrés sur la base de donnée (**users.db**).
- La **suppression** des **conversations** est également **disponible.**
- **Réflexion** sur la façon de remettre en **contexte** l'IA par rapport à la **discussion** (en cours)
- Possibilité de **renommer** sa **discussion**
- Ajout du **Logout** (route + bouton)
- Les **Alertes** sont maintenant disponibles sur la page de connexion (Erreurs affichées: Contraintes d'intégrité)
- Ajout de la **compatibilité formatage**, lecture du **Markdown**, affichage propre du **code**, **librairies** utilisées: **Marked.js** et **Highlight.js**

---

## 🧪 Update 10 Juillet – Confort expérience utilisateur

- Ajout d'une popup personnalisée pour le **Delete** et le **Edit**.
- Clé **ssh** active pour **commit & push**, gain de temps considérable
- Début du **responsive** pour mobile
- **Correction** du bug de la **Sidebar** qui n'était plus active, mode **plein écran** disponible




## 📚 Auteur

Projet réalisé par **Tom LECLERCQ**, dans le cadre d’un **stage en R&D chez Couach**, encadré par **Clément Macadré**.

Date : **Juillet - Août 2025**

---



