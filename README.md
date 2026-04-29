# Flow Manager

> ERP simplifié pour la gestion d'activité professionnelle (freelance ou entreprise).

---

## Table des matières

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Base de données](#base-de-données)
- [API — Endpoints](#api--endpoints)
- [Rôles et accès](#rôles-et-accès)
- [Améliorations prévues](#améliorations-prévues)

---

## Présentation

**Flow Manager** est une application web de type SPA (Single Page Application) qui centralise la gestion d'une activité professionnelle : clients, projets, factures et dépenses. Le tableau de bord affiche en temps réel les indicateurs financiers clés (chiffre d'affaires, montants en attente, projets actifs).

---

## Fonctionnalités

- **Authentification sécurisée** — connexion par email/mot de passe, mots de passe hachés avec `password_hash()`, gestion de sessions PHP.
- **Gestion des rôles** — deux niveaux d'accès : `utilisateur` et `admin`.
- **Tableau de bord** — statistiques financières en temps réel et graphique de répartition des revenus (Chart.js).
- **CRUD complet** sur quatre entités :
  - Clients
  - Projets (statuts, budgets, commentaires)
  - Factures (avec calcul automatique de la TVA)
  - Dépenses
- **Génération de factures PDF** via jsPDF + autoTable.
- **Export CSV** des données de chaque tableau.
- **Barre de recherche dynamique** — filtre les tableaux en temps réel sans rechargement.
- **Menu contextuel** (clic droit sur une ligne) — accès rapide aux actions Modifier, Supprimer, Exporter PDF / CSV.
- **Sidebar rétractable** — navigation latérale masquable pour maximiser l'espace de travail.
- **Gestion des utilisateurs** — réservée à l'administrateur (ajout, suppression, liste).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | PHP 8 (mysqli, sessions) |
| Base de données | MySQL |
| Frontend | HTML5 / CSS3 / JavaScript (Vanilla) |
| Graphiques | [Chart.js](https://www.chartjs.org/) |
| Export PDF | [jsPDF](https://github.com/parallax/jsPDF) + jsPDF-AutoTable |

---

## Structure du projet

```
/flow_manager
│
├── index.html              # Tableau de bord principal
├── connexion.php           # Identifiants de connexion à la BDD
├── traitement.php          # Routeur API REST (GET / POST / PUT / DELETE)
│
├── /pages
│   ├── connexion.html
│   ├── clients.html
│   ├── vuProjet.html
│   ├── suiviFactures.html
│   ├── depenses.html
│   └── utilisateurs.html
│
├── /css
│   └── style.css
│
└── /js
    └── script.js           # Logique JS : fetch, DOM, Chart.js, jsPDF
```

---

## Installation

### Prérequis

- PHP ≥ 8.0
- MySQL ≥ 5.7
- Serveur local (XAMPP, WAMP, Laragon…)

### Étapes

1. Cloner ou copier le projet dans le répertoire web de votre serveur local (ex. `htdocs/flow_manager`).

2. Créer la base de données dans MySQL :
   ```sql
   CREATE DATABASE flow_manager;
   ```

3. Importer les tables (voir section [Base de données](#base-de-données) ci-dessous).

4. Configurer `connexion.php` avec vos identifiants :
   ```php
   $conn = new mysqli('localhost', 'root', '', 'flow_manager');
   ```

5. Créer un premier compte administrateur directement en base :
   ```sql
   INSERT INTO utilisateurs (email, password, role)
   VALUES ('admin@example.com', '$2y$...', 'admin');
   ```
   *(Le hash du mot de passe doit être généré avec `password_hash()`.)*

6. Accéder à l'application via `http://localhost/flow_manager/pages/connexion.html`.

---

## Base de données

La base s'appelle `flow_manager` et contient cinq tables.

### Table `utilisateurs`
| Champ | Type | Description |
|---|---|---|
| id_user | INT (PK, AI) | Identifiant |
| email | VARCHAR(255) | Email unique |
| password | VARCHAR(255) | Mot de passe haché |
| role | ENUM | `'admin'` ou `'utilisateur'` |

### Table `clients`
| Champ | Type | Description |
|---|---|---|
| id_client | INT (PK, AI) | Identifiant |
| nom | VARCHAR(100) | Nom du client |
| email | VARCHAR(150) | Email |
| projet | VARCHAR(256) | Projet associé |
| date_ajout | TIMESTAMP | Date d'ajout automatique |

### Table `projets`
| Champ | Type | Description |
|---|---|---|
| id_projet | INT (PK, AI) | Identifiant |
| id_client | INT (FK) | Client associé |
| nom_projet | VARCHAR(256) | Nom du projet |
| statut | ENUM | `'En attente'`, `'En cours'`, `'Terminé'` |
| budget | DECIMAL(10,2) | Budget alloué |
| Commentaires | MEDIUMTEXT | Notes libres |

### Table `factures`
| Champ | Type | Description |
|---|---|---|
| id_facture | INT (PK, AI) | Identifiant |
| id_client | INT (FK) | Client facturé |
| montant_ht | DECIMAL(10,2) | Montant hors taxes |
| tva | DECIMAL(10,2) | Taux de TVA (défaut : 20.00) |
| statut_paiement | ENUM | `'Payée'`, `'En attente'`, `'En retard'` |
| date_emission | DATE | Date d'émission (défaut : aujourd'hui) |
| date_echeance | DATE | Date limite de paiement |

```sql
CREATE TABLE factures (
    id_facture INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT,
    montant_ht DECIMAL(10,2),
    tva DECIMAL(10,2) DEFAULT 20.00,
    statut_paiement ENUM('Payée', 'En attente', 'En retard') DEFAULT 'En attente',
    date_emission DATE DEFAULT CURRENT_DATE,
    date_echeance DATE
);
```

### Table `depenses`
| Champ | Type | Description |
|---|---|---|
| id_depense | INT (PK, AI) | Identifiant |
| nature | VARCHAR(255) | Description de la dépense |
| montant | DECIMAL(10,2) | Montant |
| date_depense | DATE | Date |
| categorie | ENUM | `'Logiciel'`, `'Matériel'`, `'Marketing'`, `'Autre'` |

---

## API — Endpoints

Toutes les requêtes passent par `traitement.php` avec le paramètre `?type=`.

| Méthode | URL | Action |
|---|---|---|
| GET | `?type=stats` | Statistiques du dashboard |
| GET | `?type=clients` | Liste des clients |
| GET | `?type=projets` | Liste des projets |
| GET | `?type=factures` | Liste des factures |
| GET | `?type=depenses` | Liste des dépenses |
| GET | `?type=utilisateurs` | Liste des utilisateurs *(admin)* |
| GET | `?type=get_user_role` | Rôle de la session courante |
| GET | `?type=logout` | Déconnexion |
| POST | `?type=login` | Connexion |
| POST | `?type=<entité>` | Création d'un enregistrement |
| PUT | `?type=<entité>&id=<id>` | Modification d'un enregistrement |
| DELETE | `?type=<entité>&id=<id>` | Suppression d'un enregistrement |

Les réponses sont toujours en JSON (`Content-Type: application/json`).

---

## Rôles et accès

| Fonctionnalité | Utilisateur | Admin |
|---|:---:|:---:|
| Tableau de bord | ✅ | ✅ |
| Clients / Projets / Factures / Dépenses | ✅ | ✅ |
| Gestion des utilisateurs | ❌ | ✅ |

Les accès non autorisés retournent `{"status": "unauthorized"}` ou `{"status": "forbidden"}` et le frontend redirige vers la page de connexion.

---

## Améliorations prévues

- Remplacer `mysqli` par **PDO** avec requêtes préparées (protection contre les injections SQL).
- Rendre l'interface **responsive** (media queries / mobile).
- Ajouter un **système de notifications par e-mail** (facture créée, retard de paiement).
- Implémenter un système d'**équipes** avec des listes de clients restreintes par groupe d'utilisateurs.

---

*Projet réalisé dans le cadre du cours de L2 MIASHS — Georges HUREAU MASSALOU*
