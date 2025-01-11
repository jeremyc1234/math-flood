const Alert = ({ children, className }) => (
    <div className={`p-4 bg-yellow-100 border-l-4 border-yellow-500 ${className}`}>
      {children}
    </div>
  );
  
  const AlertDescription = ({ children }) => <p>{children}</p>;
  
  export { Alert, AlertDescription };
  