---
name: commit
description: Génère des commits atomiques au format Conventional Commits (<type>(<scope>): <sujet>) à partir du git diff. À utiliser quand l'utilisateur demande de committer, de générer un ou plusieurs messages de commit, de découper ses changements en commits, ou via /commit.
---

# Commit

Analyse les changements en cours et produit des commits atomiques au format Conventional Commits.

## 1. Collecter le contexte

Lance en un seul appel :

```bash
git status --short
git diff --staged
git diff
git log --oneline -10
```

- Si des fichiers sont déjà stagés, ne traite **que** ceux-là (l'utilisateur a déjà choisi). Sinon, prends en compte tous les changements, fichiers non suivis inclus.
- `git log` sert à reprendre les scopes déjà utilisés dans le dépôt.
- S'il n'y a aucun changement, dis-le et arrête-toi.

## 2. Découper en commits atomiques

Un commit = **un seul changement logique**. Regroupe les fichiers (ou les hunks) par intention, pas par dossier :

- une nouvelle fonctionnalité et le correctif d'un bug sans rapport → 2 commits ;
- une fonctionnalité + ses tests + sa doc → 1 seul commit ;
- un reformatage massif → commit `style` séparé du reste.

Si un même fichier contient deux changements sans rapport, sépare-les avec `git add -p` (non interactif : passe les réponses via `printf 'y\nn\n' | git add -p <fichier>`), ou signale-le à l'utilisateur si le découpage est trop risqué.

## 3. Rédiger chaque message

Format : `<type>(<scope>): <sujet>` — ex. `feat(auth): add login`

**Types**

| type | usage |
|------|-------|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `refactor` | restructuration sans changement de comportement |
| `perf` | amélioration de performance |
| `style` | formatage, espaces, sans impact sur le code |
| `docs` | documentation uniquement |
| `test` | ajout ou correction de tests |
| `build` | système de build, dépendances |
| `ci` | configuration CI |
| `chore` | maintenance, config, divers |
| `revert` | annulation d'un commit |

**Scope** : le module, la scène ou le domaine touché (`player`, `ui`, `shaders`, `skills`…), en minuscules. Réutilise les scopes de `git log` quand ils existent. Omets-le `<type>: <sujet>` si le changement est transverse.

**Sujet**

- commence par un verbe à l'impératif : `add`, `fix`, `update`, `remove`, `rename`… ;
- en anglais, **sans majuscule** au début et **sans point final** ;
- ligne entière (`type(scope): sujet`) de **72 caractères max**, idéalement ≤ 50 ;
- décrit *ce que fait* le commit, pas *comment* (`fix(player): prevent double jump`, pas `fix(player): change bool check in _physics_process`).

**Corps (optionnel)** : après une ligne vide, explique le *pourquoi* si ce n'est pas évident. Lignes de 72 caractères max.

**Breaking change** : ajoute `!` après le scope (`feat(api)!: drop v1 endpoints`) et un pied `BREAKING CHANGE: …`.

## 4. Proposer puis committer

1. Affiche le plan : pour chaque commit, le message et la liste des fichiers.
2. Demande confirmation (sauf si l'utilisateur a explicitement dit de committer directement).
3. Pour chaque commit, dans l'ordre :
   ```bash
   git add <fichiers>
   git commit -m "<type>(<scope>): <sujet>" [-m "<corps>"]
   ```
4. Termine par `git log --oneline -n <nombre de commits créés>` pour montrer le résultat.

Ne fais jamais de `git push`, `--amend` ou `--no-verify` sans demande explicite. Si un hook pre-commit échoue, corrige le problème et crée un nouveau commit plutôt que de contourner le hook.
