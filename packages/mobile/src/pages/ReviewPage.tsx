import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function ReviewPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/capture', { replace: true });
  }, [navigate]);
  return null;
}
