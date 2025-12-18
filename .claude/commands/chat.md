# Rédaction d'article

Demande à l'utilisateur le sujet de son article (utilise AskUserQuestion).

Une fois le sujet reçu, rédige l'article de façon naturelle et conversationnelle, exactement comme tu le ferais sur claude.ai. Pas de contraintes de structure imposée, écris simplement un bon article en français.

Une fois l'article terminé et validé par l'utilisateur, sauvegarde dans `src/data/scripts/article-input.json` :

```json
{
  "title": "[titre]",
  "description": "[description SEO ~150 caractères]",
  "hero_prompt": "[prompt pour image de couverture]",
  "inline_prompt": "[prompt pour illustration secondaire]",
  "markdown": "[contenu markdown de l'article]"
}
```

Indique ensuite à l'utilisateur qu'il peut lancer `npm run chat` pour publier avec les images OpenAI.
