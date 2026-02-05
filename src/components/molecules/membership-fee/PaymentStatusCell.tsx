interface PaymentStatusCellProps {
  isPaid: boolean;
  isExempt?: boolean;
}

function PaymentStatusCell({
  isPaid,
  isExempt = false,
}: PaymentStatusCellProps) {
  if (isExempt) {
    return (
      <div className="flex items-center justify-center" title="면제">
        <span className="text-blue-500">-</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      {isPaid ? (
        <span className="text-green-500" title="납부완료">
          O
        </span>
      ) : (
        <span className="text-gray-300" title="미납">
          X
        </span>
      )}
    </div>
  );
}

export default PaymentStatusCell;
