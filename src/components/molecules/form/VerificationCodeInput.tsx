import React, { useState, useEffect } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';

interface VerificationCodeInputProps {
  phoneNumber: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
  error?: string;
}

function VerificationCodeInput({
  phoneNumber,
  onVerify,
  onResend,
  loading = false,
  error,
}: VerificationCodeInputProps) {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3분
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  const handleVerify = () => {
    if (code.length === 6) {
      onVerify(code);
    }
  };

  const handleResend = () => {
    setTimeLeft(180);
    setCanResend(false);
    setCode('');
    onResend();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          {phoneNumber}로 인증번호를 발송했습니다
        </p>
        <p className="text-xs text-gray-500">인증번호는 3분간 유효합니다</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            인증번호 6자리
          </label>
          <Input
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            maxLength={6}
            className="text-center text-lg tracking-widest"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            {timeLeft > 0 ? (
              <span className="text-red-600">
                남은 시간: {formatTime(timeLeft)}
              </span>
            ) : (
              <span className="text-gray-500">인증번호가 만료되었습니다</span>
            )}
          </div>

          <Button
            onClick={handleResend}
            disabled={!canResend || loading}
            variant="outline"
            size="sm"
          >
            재발송
          </Button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <Button
          onClick={handleVerify}
          disabled={code.length !== 6 || loading || timeLeft <= 0}
          className="w-full"
          pending={loading}
        >
          인증 확인
        </Button>
      </div>
    </div>
  );
}

export default VerificationCodeInput;
