import {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useId,
} from 'react';

import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Label } from '@/components/atoms/labels/Label';
import { Textarea } from '@/components/atoms/Textarea';

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

const NATIVE_CONTROLS = ['input', 'select', 'textarea'];
const CONTROL_ATOMS: unknown[] = [Input, Select, Textarea];

/**
 * 라벨과 이을 수 있는 자식인가: 입력 요소 그 자체이거나 입력 atom일 때만.
 * 감싸는 div, Fragment, react-hook-form의 Controller처럼 id를 입력까지
 * 전달하지 않는 자식에 이으면 가리킬 곳 없는 for만 남는다.
 */
function isSingleControl(node: ReactNode): node is ReactElement<ControlProps> {
  if (!isValidElement(node)) return false;

  return typeof node.type === 'string'
    ? NATIVE_CONTROLS.includes(node.type)
    : CONTROL_ATOMS.includes(node.type);
}

/**
 * 라벨 + 입력 + 오류 문구. 자식이 입력 하나면 id를 넣어 라벨과 잇는다.
 * 그 밖의 자식(감싸는 요소, 여러 개, Fragment, 문자열)은 그대로 그린다.
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
