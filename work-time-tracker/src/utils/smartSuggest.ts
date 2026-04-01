import type { TimeBlock, Todo } from '../types';

/**
 * Analyze historical time blocks and suggest which todo
 * the user is most likely to work on right now.
 */
export function suggestTodo(
  todos: Todo[],
  timeBlocks: TimeBlock[],
): Todo | null {
  const now = new Date();
  const currentHour = now.getHours();

  // Filter active todos
  const activeTodos = todos.filter(
    (t) => t.status === 'not_started' || t.status === 'in_progress'
  );

  if (activeTodos.length === 0) return null;

  // Score each todo: how often they appear in similar time slots
  const scores = new Map<string, number>();
  for (const todo of activeTodos) {
    scores.set(todo.id, 0);
  }

  for (const block of timeBlocks) {
    const blockHour = parseInt(block.start_time.split(':')[0], 10);
    // Blocks closer to current hour get more weight
    const hourDiff = Math.abs(blockHour - currentHour);
    const weight = Math.max(0, 5 - hourDiff);

    for (const todo of activeTodos) {
      if (block.tag_id === todo.tag_id) {
        scores.set(todo.id, (scores.get(todo.id) || 0) + weight);
      }
    }
  }

  // In-progress todos get a bonus
  for (const todo of activeTodos) {
    if (todo.status === 'in_progress') {
      scores.set(todo.id, (scores.get(todo.id) || 0) + 10);
    }
  }

  // Return highest scored
  let bestTodo: Todo | null = null;
  let bestScore = -1;
  for (const todo of activeTodos) {
    const score = scores.get(todo.id) || 0;
    if (score > bestScore) {
      bestScore = score;
      bestTodo = todo;
    }
  }

  return bestTodo || activeTodos[0];
}
