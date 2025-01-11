const Button = ({ children, onClick, className, ...props }) => (
    <button
      onClick={onClick}
      className={`font-sans px-4 py-2 rounded ${className}`}
      {...props}
    >
      {children}
    </button>
  );
  
  export { Button };