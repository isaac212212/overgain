import { useAuth } from '../contexts/AuthContext';

export function useMeasurements() {
  const { user, addMeasurement } = useAuth();

  return {
    measurements: user?.measurementsHistory || [],
    addMeasurement
  };
}

export default useMeasurements;
