import {
  cloneElement,
  Fragment,
  isValidElement,
  ReactElement,
  ReactNode,
  useId,
} from 'react';

import { Label } from '@/components/atoms/labels/Label';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** 검증 실패 메시지. 없으면 아무것도 렌더링하지 않는다. */
  error?: string;
}

interface ControlProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** id를 넣어 줄 수 있는 자식인가: 요소 하나이고 Fragment가 아닐 때만. */
function isSingleControl(node: ReactNode): node is ReactElement<ControlProps> {
  return isValidElement(node) && node.type !== Fragment;
}

/**
 * 라벨 + 입력 + 오류 문구. 자식이 요소 하나면 id를 넣어 라벨과 잇는다.
 * 자식이 여러 개거나 Fragment·문자열이면 잇지 않고 그대로 그린다.
 */
export function FormField({
  label,
  children,
  required = false,
  error,
}: FormFieldProps) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;

  let controlId: string | undefined;
  let control = children;

  if (isSingleControl(children)) {
    controlId = children.props.id ?? generatedId;
    control = cloneElement(children, {
      id: controlId,
      ...(error
        ? { 'aria-invalid': true, 'aria-describedby': errorId }
        : undefined),
    });
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={controlId} required={required}>
        {label}
      </Label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-footnote text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
