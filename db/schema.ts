import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// QA attempts and participant attempts occupy different namespaces.
export const attempts = sqliteTable('evaluation_attempts', {
  key: text('key').primaryKey(),
  participantId: text('participant_id').notNull(),
  isQa: integer('is_qa', { mode: 'boolean' }).notNull(),
  accessHash: text('access_hash').notNull(),
  preAnswers: text('pre_answers'),
  preScore: integer('pre_score'),
  lessons: text('lessons').notNull().default('[]'),
  postAnswers: text('post_answers'),
  postScore: integer('post_score'),
  feedback: text('feedback'),
  version: integer('version').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
