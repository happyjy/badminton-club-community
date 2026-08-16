/**
 * 텍스트에서 URL을 찾아 클릭 가능한 링크로 변환
 */
export function renderContentWithLinks(content: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
