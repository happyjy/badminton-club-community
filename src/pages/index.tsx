import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import '@/styles/globals.css';

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState('');
  const [description, setDescription] = useState('');
  const router = useRouter();

  // Todos 가져오기
  useEffect(() => {
    fetch('/api/todos')
      .then((res) => res.json())
      .then((data) => setTodos(data));
  }, []);

  // 새 Todo 추가
  const addTodo = async () => {
    if (!task || !description) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, description }),
    });
    const newTodo = await res.json();
    setTodos((prev) => [...prev, newTodo]);
    setTask('');
    setDescription('');
  };

  // Todo 삭제
  const deleteTodo = async (id) => {
    await fetch('/api/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <h1 className="text-3xl font-bold text-center mb-5">To-Do List</h1>
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Task"
          className="border p-2 rounded w-1/3"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="border p-2 rounded w-1/3"
        />
        <button
          onClick={addTodo}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>
      <ul className="max-w-lg mx-auto">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex justify-between items-center p-4 bg-white rounded shadow mb-2"
          >
            <div>
              <p className="font-bold">{todo.task}</p>
              <p className="text-gray-600">{todo.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/todo/${todo.id}`)}
                className="text-blue-500 hover:underline"
              >
                View
              </button>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
