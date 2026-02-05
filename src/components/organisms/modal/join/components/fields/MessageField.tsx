import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

interface MessageFieldProps {
  label?: string;
  placeholder?: string;
}

function MessageField({
  label = '문의 내용',
  placeholder = '클럽에 전달할 메시지나 문의사항을 입력해주세요',
}: MessageFieldProps) {
  const { formData, onChangeInput } = useJoinModalContext();

  return (
    <FormField label={label}>
      <textarea
        name="message"
        value={formData.message || ''}
        onChange={onChangeInput}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
      />
    </FormField>
  );
}

export default MessageField;
