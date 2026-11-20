import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { idSchema } from '@core/api/schemas';
import { keys } from '@core/keys';
import DetailScreen from '@screens/detail-screen';
import { ErrorMessage } from '@ui/error-message';

export default function DetailRoute() {
  const params = useLocalSearchParams(); const router = useRouter(); const client = useQueryClient();
  const id = idSchema.safeParse(params.id);
  if (!id.success) return <ErrorMessage message="Obra inválida." />;
  return <DetailScreen id={id.data} onNavigate={(destination, novel) => {
    client.setQueryData(keys.novel(novel.id), novel);
    router.push({ pathname: destination === 'reading' ? '/reading' : destination === 'speech' ? '/speech' : '/downloads', params: { id: novel.id } });
  }} onAddSource={novel => router.push({ pathname: '/search', params: { id: novel.id } })} onDeleted={() => router.dismissTo('/')} />;
}
