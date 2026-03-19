import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FloorManagerHome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard by default
    navigate('/floor-manager/dashboard');
  }, [navigate]);

  return null;
};

export default FloorManagerHome;