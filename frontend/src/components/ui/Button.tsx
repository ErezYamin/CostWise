interface ButtonProps {
  label: string;
  variant: "primary" | "secondary";
  onClick: () => void;
}

export default function Button({ label, variant, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px',
        borderRadius: 9,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        border: variant === 'primary' ? 'none' : '1px solid #1A2A40',
        background: variant === 'primary' ? '#3B82F6' : 'transparent',
        color: variant === 'primary' ? '#ffffff' : '#8899BB',
        transition: 'opacity 0.15s',
      }}
    >
      {label}
    </button>
  )
}
