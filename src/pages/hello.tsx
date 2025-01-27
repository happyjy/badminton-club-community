// pages/hello.tsx
import { useEffect, useState } from "react";

export default function HelloPage() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // API 호출
    fetch("/api/hello")
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.error("Error fetching API:", error));
  }, []);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>API Response:</h1>
      <p>{message || "Loading..."}</p>
    </div>
  );
}
