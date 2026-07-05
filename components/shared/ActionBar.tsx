type ActionBarProps = {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
};

export default function ActionBar({ left, center, right }: ActionBarProps) {
  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <div className="justify-self-start">{left}</div>

      <div className="justify-self-center text-center">{center}</div>

      <div className="flex justify-self-end gap-2">{right}</div>
    </div>
  );
}