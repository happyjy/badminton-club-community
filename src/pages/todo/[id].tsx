import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function TodoDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [todo, setTodo] = useState(null);
  const [task, setTask] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch('/api/todos')
      .then((res) => res.json())
      .then((data) => {
        const selectedTodo = data.find((todo) => todo.id === parseInt(id));
        if (selectedTodo) {
          setTodo(selectedTodo);
          setTask(selectedTodo.task);
          setDescription(selectedTodo.description);
        }
      });
  }, [id]);

  const updateTodo = async () => {
    const res = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id), task, description }),
    });
    const updatedTodo = await res.json();
    setTodo(updatedTodo);
    alert('Todo updated!');
    router.push('/');
  };

  if (!todo) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <h1 className="text-3xl font-bold mb-5">Edit Todo</h1>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="border p-2 rounded"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded"
          rows={5}
        />
        <button
          onClick={updateTodo}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Update
        </button>
        <button
          onClick={() => router.push('/')}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}
