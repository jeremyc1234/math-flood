const Card = ({ children, className }) => (
    <div className={`bg-white shadow-md rounded-md font-sans ${className}`}>
      {children}
    </div>
  );
  
  export { Card };