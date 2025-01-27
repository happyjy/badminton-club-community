import { NextApiRequest, NextApiResponse } from 'next';

let todos = [
  {
    id: 1,
    task: 'Learn Next.js',
    description: 'Learn how to use API Routes',
    completed: false,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, task, description } = req.body;

  if (req.method === 'GET') {
    return res.status(200).json(todos); // 모든 todos 반환
  }

  if (req.method === 'POST') {
    const newTodo = {
      id: Date.now(),
      task,
      description,
      completed: false,
    };
    todos.push(newTodo);
    return res.status(201).json(newTodo);
  }

  if (req.method === 'PUT') {
    const todoIndex = todos.findIndex((todo) => todo.id === id);
    if (todoIndex === -1)
      return res.status(404).json({ error: 'Todo not found' });
    todos[todoIndex] = { ...todos[todoIndex], task, description };
    return res.status(200).json(todos[todoIndex]);
  }

  if (req.method === 'DELETE') {
    todos = todos.filter((todo) => todo.id !== id);
    return res.status(200).json({ message: 'Todo deleted', id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
