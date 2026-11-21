import { useConnectivity } from '@core/connectivity';
import FiltersScreen from '@screens/filters-screen';
import { ErrorMessage } from '@ui/error-message';
export default function FiltersRoute() {
  const connectivity = useConnectivity();
  if (connectivity === 'offline') return <ErrorMessage message="Conecte-se à internet para alterar os filtros globais." />;
  return <FiltersScreen />;
}
