interface CalendarFieldProps {
  id: string;
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}

function CalendarField({ id, label, value, min, onChange }: CalendarFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default CalendarField;
