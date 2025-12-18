# Génération d'article pour le blog

Tu vas générer un article de blog pour phdefoy.com.

1. Demande à l'utilisateur le sujet de l'article qu'il souhaite (utilise AskUserQuestion avec un champ texte libre)
2. Une fois le sujet reçu, génère un article complet en suivant ces instructions:

## Style et Ton
- Adopte un ton curieux et engageant, comme si tu guidais le lecteur dans une exploration du sujet
- Évite le "je" mais garde un ton personnel à travers des formules engageantes
- Rédige en français

## Titre de l'article
- Crée un titre accrocheur et descriptif
- Évite les constructions "Quand/Lorsque + [concept] + verbe"

## Structure
- Introduction (25% personnel): Accroche avec ton regard sur le sujet
- Développement (5-10% personnel): Analyse factuelle ponctuée d'opinions argumentées
- Conclusion (15-20% personnel): Bilan engagé

## Contenu
- Reste factuel sur les informations principales
- Analyse les thèmes, influences, contexte
- Évite le jargon académique, privilégie un vocabulaire accessible mais précis
- Formate les titres d'œuvres en italique

## Longueur
1200-1800 mots

3. Après avoir généré l'article, sauvegarde-le dans `src/data/scripts/article-input.json` avec ce format:
```json
{
  "title": "[titre de l'article]",
  "description": "[description SEO 150 caractères]",
  "hero_prompt": "[description artistique pour image de couverture]",
  "inline_prompt": "[description pour illustration secondaire]",
  "markdown": "[contenu markdown complet de l'article]"
}
```

4. Indique à l'utilisateur qu'il peut maintenant lancer `npm run chat` pour publier l'article avec les images générées.
