import knowledgeBase from "@/data/knowledge-base.json";

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
}

export interface RAGResult {
  articles: KBArticle[];
  contextText: string;
}

/**
 * Simple keyword-based search over the knowledge base.
 * Scores each article by how many of its keywords appear in the query,
 * then returns the top matches with a score above zero.
 */
export function searchKnowledgeBase(query: string, maxResults = 3): RAGResult {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = (knowledgeBase.articles as KBArticle[]).map((article) => {
    let score = 0;

    // Score by keyword overlap
    for (const kw of article.keywords) {
      if (queryLower.includes(kw)) {
        score += 3;
      }
    }

    // Score by individual word matches in title/content
    for (const word of queryWords) {
      if (article.title.toLowerCase().includes(word)) score += 2;
      if (article.content.toLowerCase().includes(word)) score += 1;
      if (article.category.toLowerCase().includes(word)) score += 1;
    }

    return { article, score };
  });

  const relevant = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.article);

  const contextText =
    relevant.length > 0
      ? relevant
          .map(
            (a) =>
              `[${a.id}] ${a.title} (${a.category})\n${a.content}`
          )
          .join("\n\n---\n\n")
      : "";

  return { articles: relevant, contextText };
}
