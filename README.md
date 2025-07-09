# CouachGPT 🤖

## 📅 Contexte & Objectifs

Ce projet a pour but de **tester, comparer et intégrer différents modèles LLM** (Large Language Models) exécutés **en local** sur serveur sans GPU. Le tout sera lié sur une interface web style "ChatGPT", accessible par tous les utilisateurs connectés sur le réseau via cet **IP:** http://172.16.2.81:8294/. L'objectif est de trouver un compromis optimal entre **performances**, **consommation**, et **réactivité**.

---

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
| `deepseek-coder:6.7b`    | 3.8 Go   | 6 min 18  | 🟡 Réserve | 100 %  | 74 %   |

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

## 🧪 Update 7 Juillet – Serveur & Interface Web

- Intégration d’un **serveur local avec Flask (Python)** pour combiner front et IA.
- Problème : la génération de réponse est **plus lente via interface** que via terminal.
- Test du modèle **phi3:mini (Microsoft)** : bien plus fluide sur interface web.

### ✅ Interface Web (Prototype)

- Authentification (login, register)
- Design respectant la **charte graphique** de l’entreprise
- Page **404 personnalisée**

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

## 📚 Auteur

Projet réalisé par **Tom LECLERCQ**, dans le cadre d’un **stage en R&D chez Couach**, encadré par **Clément Macadré**.

Date : **Juillet - Août 2025**

---



