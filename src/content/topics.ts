import type { Topic } from './types'
import raw from './topics.json'

/** All topics, imported once and typed at the boundary. */
export const topics: Topic[] = raw as Topic[]

export const topicSlugs = topics.map((t) => t.slug)

export function findTopic(slug: string): Topic | undefined {
  return topics.find((t) => t.slug === slug)
}
