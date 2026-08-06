import { useEffect, useState } from 'react';
import { subscribeDataChanged } from '../utils/bus';

export function useDataVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeDataChanged(() => setVersion((v) => v + 1)), []);
  return version;
}
