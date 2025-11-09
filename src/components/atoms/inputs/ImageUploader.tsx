import { ChangeEvent, useRef } from 'react';

interface ImageUploaderProps {
  images: string[];
  maxImages?: number;
  onImagesChange: (urls: string[]) => void;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
}

function ImageUploader({
  images,
  maxImages = 3,
  onImagesChange,
  onUpload,
  disabled = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onChangeFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // 파일 타입 검증
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('이미지 파일만 업로드 가능합니다. (jpg, png, webp)');
      return;
    }

    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 최대 개수 확인
    if (images.length >= maxImages) {
      alert(`최대 ${maxImages}장까지 업로드 가능합니다.`);
      return;
    }

    try {
      const url = await onUpload(file);
      onImagesChange([...images, url]);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    }

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onClickRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const onClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClickUpload}
          disabled={disabled || images.length >= maxImages}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          이미지 추가 ({images.length}/{maxImages})
        </button>
        <span className="text-sm text-gray-500">
          jpg, png, webp (최대 10MB)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={onChangeFile}
        className="hidden"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`업로드 이미지 ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => onClickRemove(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;

