import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ApplicatorHome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to applicator dashboard
    navigate('/applicator/dashboard');
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
};

export default ApplicatorHome;