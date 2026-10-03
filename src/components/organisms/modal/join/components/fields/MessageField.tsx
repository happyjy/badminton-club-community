import { Textarea } from '@/components/atoms/Textarea';
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
      <Textarea
        name="message"
        value={formData.message || ''}
        onChange={onChangeInput}
        placeholder={placeholder}
        minRows={3}
      />
    </FormField>
  );
}

export default MessageField;
